import { generateInvoicePDF }    from "./pdf.service.js";
import { uploadInvoiceToS3 } from "./s3.service.js";
import { sendInvoiceEmail }      from "./mail.service.js";
import { generateInvoiceNumber } from "../utils/invoiceHelpers.js";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS    = path.resolve(__dirname, "../../assets");
    
/**
 * Full invoice pipeline:
 *  1. Build invoice data
 *  2. Generate PDF in memory
 *  3. Upload PDF buffer to S3
 *  4. Get presigned download URL
 *  5. Send email with PDF attached + download link
 *  6. Return s3Key + invoiceNumber to caller (to save in DB)
 *
 * @param {Object} booking
 * @param {string} booking.id
 * @param {Object} booking.customer       - { name, email, address, mobile }
 * @param {Array}  booking.lineItems      - [{ name, quantity, unitPrice }]
 * @param {number} booking.taxRate        - e.g. 0.18
 *
 * @returns {Promise<{ invoiceNumber: string, s3Key: string }>}
 */
async function processInvoice(booking) {
  const invoiceNumber = generateInvoiceNumber();
  const invoiceDate   = new Date().toISOString();

  // Calculate total for email summary
  const subtotal = booking.lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
  const total = subtotal + subtotal * (booking.taxRate ?? 0);

  const invoiceData = {
    invoiceNumber,
    invoiceDate,
    customer: booking.customer,
    company: {
      name:    "WENS FORCE INTERNATIONAL PVT LTD",
      email:   process.env.MAIL_USER,
      address: "Empire Building, 2nd Floor, Fort, Mumbai - 400001",
      mobile:  "+91 7304607954",
      website: "https://subscription.wensforce.com",
      logo:    path.join(ASSETS, "logo.png"),
      stampImage: path.join(ASSETS, "stamp.png"),
    },
    lineItems: booking.lineItems,
    taxRate:   booking.taxRate ?? 0,
  };

  // Step 1 — Generate PDF in memory
  console.log(`⚙️  Generating PDF for ${invoiceNumber}...`);
  const pdfBuffer = await generateInvoicePDF(invoiceData);

  // Step 2 — Upload to S3 (no filesystem)
  console.log(`☁️  Uploading to S3...`);
  const s3Key = await uploadInvoiceToS3(pdfBuffer, invoiceNumber);

  // Step 3 — Send email
  console.log(`📧 Sending invoice email to ${booking.customer.email}...`);
  await sendInvoiceEmail({
    toEmail:       booking.customer.email,
    toName:        booking.customer.name,
    invoiceNumber,
    serviceName:   booking.lineItems[0]?.name ?? "Service",
    total,
    pdfBuffer,     // attached directly to the email
    currency: booking.lineItems[0]?.currency ?? "INR",
  });

  return { invoiceNumber, s3Key };

}

export { processInvoice };
