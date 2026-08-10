import { prisma } from "../lib/prisma.js";
import { generateInvoicePDF } from "./pdf.service.js";
import { uploadInvoiceToS3 } from "./s3.service.js";
import { sendInvoiceEmail } from "./mail.service.js";
import { generateInvoiceNumber } from "../utils/invoiceHelpers.js";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.resolve(__dirname, "../../assets");

const ORDER_INVOICE_SELECT = {
  id: true,
  packageName: true,
  amount: true,
  discountAmount: true,
  finalAmount: true,
  couponCode: true,
  referralDiscountAmount: true,
  currency: true,
  cashfreeOrderId: true,
  invoiceNumber: true,
  invoiceKey: true,
  status: true,
  user: {
    select: { name: true, email: true, mobileNumber: true },
  },
  package: {
    select: { name: true, gst: true },
  },
};

class InvoiceServiceError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function buildOrderInvoicePayload(order) {
  const currency = order.currency || "INR";
  const packageLabel = order.packageName || order.package?.name || "Package";
  const discountAmount = Number(order.discountAmount) || 0;
  const referralDiscountAmount = Number(order.referralDiscountAmount) || 0;

  const lineItems = [
    {
      name: packageLabel,
      quantity: 1,
      unitPrice: order.amount,
      currency,
    },
  ];

  const discounts = [];

  if (discountAmount > 0) {
    discounts.push({
      label: order.couponCode
        ? `Coupon (${order.couponCode})`
        : "Coupon Discount",
      amount: discountAmount,
    });
  }

  if (referralDiscountAmount > 0) {
    discounts.push({
      label: "Referral Reward",
      amount: referralDiscountAmount,
    });
  }

  return { lineItems, discounts };
}

function getOrderInvoiceTaxRate(order) {
  const gstRate =
    order.package?.gst !== null && order.package?.gst !== undefined
      ? Number(order.package.gst)
      : 0;
  return gstRate / 100;
}

function calculateInvoiceTotal(lineItems, discounts, taxRate, finalAmount) {
  if (finalAmount != null && !Number.isNaN(Number(finalAmount))) {
    return Number(finalAmount);
  }

  const subtotal = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );
  const discountTotal = (discounts || []).reduce((sum, d) => sum + d.amount, 0);
  const taxableAmount = subtotal - discountTotal;
  const gstAmount = Math.ceil(taxableAmount * taxRate);
  return taxableAmount + gstAmount;
}

async function assignUniqueInvoiceNumber(orderId) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const invoiceNumber = generateInvoiceNumber();

    try {
      const updated = await prisma.order.updateMany({
        where: { id: orderId, invoiceNumber: null },
        data: { invoiceNumber },
      });

      if (updated.count === 1) {
        return invoiceNumber;
      }

      const refreshed = await prisma.order.findUnique({
        where: { id: orderId },
        select: { invoiceNumber: true },
      });

      if (refreshed?.invoiceNumber) {
        return refreshed.invoiceNumber;
      }
    } catch (error) {
      if (error.code === "P2002") {
        continue;
      }
      throw error;
    }
  }

  throw new InvoiceServiceError(
    "INVOICE_NUMBER_FAILED",
    "Failed to generate a unique invoice number",
  );
}

function getInvoiceDisplayReference(order) {
  return order.invoiceNumber || order.cashfreeOrderId || order.id;
}

/**
 * Core pipeline: build PDF → upload S3 → email customer.
 */
async function processInvoice({
  invoiceNumber,
  customer,
  lineItems,
  discounts = [],
  taxRate = 0,
  totalAmount,
}) {
  const invoiceDate = new Date().toISOString();
  const total = calculateInvoiceTotal(lineItems, discounts, taxRate, totalAmount);
  const currency = lineItems[0]?.currency ?? "INR";

  const invoiceData = {
    invoiceNumber,
    invoiceDate,
    customer,
    company: {
      name: "WENS FORCE INTERNATIONAL PVT LTD",
      email: process.env.SMTP_USER || process.env.MAIL_USER,
      address: "Empire Building, 2nd Floor, Fort, Mumbai - 400001",
      mobile: "+91 7304607954",
      website: "https://subscription.wensforce.com",
      logo: path.join(ASSETS, "logo.png"),
      stampImage: path.join(ASSETS, "stamp.png"),
    },
    lineItems,
    discounts,
    taxRate,
    totalAmount: total,
  };

  const pdfBuffer = await generateInvoicePDF(invoiceData);
  const s3Key = await uploadInvoiceToS3(pdfBuffer, invoiceNumber);

  await sendInvoiceEmail({
    toEmail: customer.email,
    toName: customer.name || "Customer",
    invoiceNumber,
    serviceName: lineItems[0]?.name ?? "Service",
    total,
    pdfBuffer,
    currency,
  });

  return { invoiceNumber, s3Key };
}

/**
 * Load a paid order, generate PDF, upload, and email.
 *
 * @param {string} orderId - Internal order id
 * @param {{ assignInvoiceNumber?: boolean }} options
 *   assignInvoiceNumber — when true (payment flow), generate and store a new
 *   invoice number if the order does not have one yet. When false (e.g. manual
 *   resend on legacy orders), leave invoiceNumber null and use order ref in PDF/email.
 */
async function generateAndSendOrderInvoice(orderId, { assignInvoiceNumber = false } = {}) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: ORDER_INVOICE_SELECT,
  });

  if (!order) {
    throw new InvoiceServiceError("ORDER_NOT_FOUND", `Order not found: ${orderId}`);
  }

  if (order.status !== "PAID") {
    throw new InvoiceServiceError(
      "ORDER_NOT_PAID",
      `Invoice can only be generated for paid orders (current: ${order.status})`,
    );
  }

  const customerEmail = order.user?.email?.trim();
  if (!customerEmail) {
    throw new InvoiceServiceError(
      "NO_CUSTOMER_EMAIL",
      "Customer email is required to send the invoice",
    );
  }

  let invoiceNumber = order.invoiceNumber;

  if (!invoiceNumber && assignInvoiceNumber) {
    invoiceNumber = await assignUniqueInvoiceNumber(order.id);
  }

  if (!invoiceNumber) {
    invoiceNumber = getInvoiceDisplayReference(order);
  }

  const { lineItems, discounts } = buildOrderInvoicePayload(order);
  const taxRate = getOrderInvoiceTaxRate(order);

  const { s3Key } = await processInvoice({
    invoiceNumber,
    customer: {
      name: order.user.name || "Customer",
      email: customerEmail,
      address: "N/A",
      mobile: order.user.mobileNumber,
    },
    lineItems,
    discounts,
    taxRate,
    totalAmount: order.finalAmount,
  });

  await prisma.order.update({
    where: { id: order.id },
    data: { invoiceKey: s3Key },
  });

  return {
    orderId: order.id,
    invoiceNumber: order.invoiceNumber,
    displayReference: invoiceNumber,
    s3Key,
    cashfreeOrderId: order.cashfreeOrderId,
    finalAmount: order.finalAmount,
  };
}

export {
  processInvoice,
  generateAndSendOrderInvoice,
  ORDER_INVOICE_SELECT,
  InvoiceServiceError,
};
