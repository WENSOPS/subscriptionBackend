import PDFDocument from "pdfkit";
import { formatCurrency } from "../utils/invoiceHelpers.js";
import https from "https";
import http from "http";
import fs from "fs";

// Helvetica (built into PDFKit) lacks the ₹ glyph — replace it for PDF only.
// Email uses formatCurrency directly and renders ₹ natively.
const PDF_CURRENCY_SYMBOLS = { "₹": "Rs.", "₩": "W", "₺": "TL", "₴": "UAH" };
function pdfCurrency(amount, currency) {
  let str = formatCurrency(amount, currency);
  for (const [sym, alt] of Object.entries(PDF_CURRENCY_SYMBOLS)) str = str.replaceAll(sym, alt);
  return str;
}

/**
 * Fetches a remote image and returns it as a Buffer.
 */
export async function fetchImageBuffer(url, _hops = 0) {
  if (_hops > 5) throw new Error("Too many redirects fetching image");
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("https") ? https : http;
    const req = mod.get(url, { timeout: 10000 }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302 ||
          res.statusCode === 307 || res.statusCode === 308) {
        res.resume();
        const loc = res.headers.location;
        if (!loc) return reject(new Error("Redirect with no Location header"));
        const next = loc.startsWith("http") ? loc : new URL(loc, url).href;
        return fetchImageBuffer(next, _hops + 1).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`Image fetch failed: HTTP ${res.statusCode}`));
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    });
    req.on("timeout", () => { req.destroy(); reject(new Error("Image fetch timed out after 10s")); });
    req.on("error", reject);
  });
}

/**
 * Resolves an image source (URL or local file path) to a Buffer.
 * Returns null if the source is missing or unreachable.
 */
async function loadImage(source) {
  if (!source) return null;
  try {
    if (source.startsWith("http://") || source.startsWith("https://")) {
      return await fetchImageBuffer(source);
    }
    if (fs.existsSync(source)) {
      return fs.readFileSync(source);
    }
  } catch (err) {
    console.warn(`⚠️  Image not loaded from "${source}": ${err.message}`);
  }
  return null;
}

/**
 * Generates an invoice PDF entirely in memory.
 * Returns a Buffer — no file system used.
 *
 * @param {Object}  invoice
 * @param {string}  invoice.invoiceNumber
 * @param {string}  invoice.invoiceDate             - ISO date string
 * @param {Object}  invoice.customer                - { name, email, address, mobile }
 * @param {Object}  invoice.company                 - { name, email, address, mobile, website, logo, stampImage }
 * @param {Array}   invoice.lineItems               - [{ name, quantity, unitPrice }]
 * @param {number}  [invoice.taxRate=0]             - e.g. 0.18 for 18%
 * @returns {Promise<Buffer>}
 */
async function generateInvoicePDF(invoice) {
  const { invoiceNumber, invoiceDate, customer, company, lineItems, taxRate = 0 } = invoice;

  const [logoBuffer, stampBuffer] = await Promise.all([
    loadImage(company.logo),
    loadImage(company.stampImage),
  ]);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 0, size: "A4" });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end",  () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const INK     = "#111111";
    const SUBINK  = "#555555";
    const MUTED   = "#999999";
    const BORDER  = "#dedede";
    const HDR_BG  = "#f5f5f5";
    const ROW_ALT = "#fafafa";
    const ACCENT  = "#1e3a5f";
    const PW = 595; const L = 50; const R = 545; const W = R - L;

    // Top accent rule
    doc.rect(0, 0, PW, 4).fill(ACCENT);

    // Header
    const HDR_TOP = 22;
    if (logoBuffer) { doc.image(logoBuffer, L, HDR_TOP, { fit: [60, 60] }); }
    const cX = logoBuffer ? L + 74 : L;
    doc.fontSize(13).font("Helvetica-Bold").fillColor(INK).text(company.name, cX, HDR_TOP);
    let chy = HDR_TOP + 28;   // detail lines start at y=50, matching side margins
    doc.fontSize(8.5).font("Helvetica").fillColor(SUBINK);
    if (company.address) { doc.text(company.address, cX, chy, { width: 250 }); chy += 12; }
    if (company.mobile)  { doc.text("Tel: " + company.mobile, cX, chy);         chy += 12; }
    if (company.email)   { doc.text(company.email, cX, chy);                     chy += 12; }
    if (company.website) { doc.text(company.website, cX, chy);                   chy += 12; }
    doc.fontSize(32).font("Helvetica-Bold").fillColor(ACCENT).text("INVOICE", L, HDR_TOP, { width: W, align: "right" });
    const HDR_BOT = Math.max(chy, logoBuffer ? HDR_TOP + 66 : chy) + 18;
    doc.moveTo(L, HDR_BOT).lineTo(R, HDR_BOT).strokeColor(BORDER).lineWidth(0.8).stroke();

    // Meta row
    const META_Y  = HDR_BOT + 14;
    const dateStr = new Date(invoiceDate).toLocaleDateString("en-IN", { dateStyle: "long" });
    doc.fontSize(7).font("Helvetica-Bold").fillColor(MUTED)
       .text("INVOICE DATE", L, META_Y)
       .text("INVOICE NUMBER", L, META_Y, { width: W, align: "right" });
    doc.fontSize(10).font("Helvetica-Bold").fillColor(INK)
       .text(dateStr, L, META_Y + 12)
       .text(invoiceNumber, L, META_Y + 12, { width: W, align: "right" });
    const META_BOT = META_Y + 32;
    doc.moveTo(L, META_BOT).lineTo(R, META_BOT).strokeColor(BORDER).lineWidth(0.8).stroke();

    // Bill To
    const BILL_Y = META_BOT + 18;
    doc.fontSize(7).font("Helvetica-Bold").fillColor(MUTED).text("BILL TO", L, BILL_Y);
    doc.fontSize(12).font("Helvetica-Bold").fillColor(INK).text(customer.name, L, BILL_Y + 12);
    let clY = BILL_Y + 28;
    doc.fontSize(9).font("Helvetica").fillColor(SUBINK);
    if (customer.mobile)  { doc.text("Tel: " + customer.mobile, L, clY);              clY += 13; }
    if (customer.email)   { doc.text(customer.email, L, clY);                           clY += 13; }

    // Table
    const TABLE_Y = Math.max(clY + 18, BILL_Y + 80);
    const ROW_H   = 26;
    const C0x = L,       C0w = 234;
    const C1x = L + 234, C1w = 60;
    const C2x = L + 294, C2w = 101;
    const C3x = L + 395;

    doc.rect(L, TABLE_Y, W, ROW_H).fill(HDR_BG);
    doc.moveTo(L, TABLE_Y).lineTo(R, TABLE_Y).strokeColor(BORDER).lineWidth(0.5).stroke();
    doc.moveTo(L, TABLE_Y + ROW_H).lineTo(R, TABLE_Y + ROW_H).strokeColor(BORDER).lineWidth(0.5).stroke();
    doc.fontSize(8.5).font("Helvetica-Bold").fillColor(INK)
       .text("Package Name", C0x + 8,  TABLE_Y + 9, { width: C0w - 14, align: "left"   })
       .text("Qty",          C1x + 2,  TABLE_Y + 9, { width: C1w - 4,  align: "center" })
       .text("Rate",         C2x + 2,  TABLE_Y + 9, { width: C2w - 6,  align: "right"  })
       .text("Amount",       L,        TABLE_Y + 9, { width: W - 10,   align: "right"  });

    let ry = TABLE_Y + ROW_H;
    let subtotal = 0;
    for (let i = 0; i < lineItems.length; i++) {
      const item = lineItems[i];
      const lineTotal = item.quantity * item.unitPrice;
      subtotal += lineTotal;
      if (i % 2 === 1) { doc.rect(L, ry, W, ROW_H).fill(ROW_ALT); }
      doc.moveTo(L, ry + ROW_H).lineTo(R, ry + ROW_H).strokeColor(BORDER).lineWidth(0.3).stroke();
      doc.fontSize(9.5).font("Helvetica").fillColor(INK)
         .text(item.name,                     C0x + 8, ry + 8, { width: C0w - 14, align: "left"   })
         .text(String(item.quantity),          C1x + 2, ry + 8, { width: C1w - 4,  align: "center" })
         .text(pdfCurrency(item.unitPrice, item.currency), C2x + 2, ry + 8, { width: C2w - 6,  align: "right"  })
         .text(pdfCurrency(lineTotal, item.currency),      L,       ry + 8, { width: W - 10,   align: "right"  });
      ry += ROW_H;
    }
    doc.rect(L, TABLE_Y, W, ry - TABLE_Y).strokeColor(BORDER).lineWidth(0.5).stroke();
    [C1x, C2x, C3x].forEach((cx) => {
      doc.moveTo(cx, TABLE_Y).lineTo(cx, ry).strokeColor(BORDER).lineWidth(0.3).stroke();
    });

    // Totals
    const tax   = subtotal * taxRate;
    const total = subtotal + tax;
    let ty = ry + 16;
    const TOT_W = 200; const TOT_X = R - TOT_W;
    if (taxRate > 0) {
      doc.fontSize(9.5).font("Helvetica").fillColor(SUBINK)
         .text("Subtotal", TOT_X, ty)
         .text(pdfCurrency(subtotal, lineItems[0]?.currency), L, ty, { width: W - 10, align: "right" });
      ty += 15;
      doc.text("Tax (" + (taxRate * 100).toFixed(0) + "%)", TOT_X, ty)
         .text(pdfCurrency(tax, lineItems[0]?.currency), L, ty, { width: W - 10, align: "right" });
      ty += 12;
      doc.moveTo(TOT_X, ty).lineTo(R, ty).strokeColor(BORDER).lineWidth(0.5).stroke();
      ty += 10;
    }
    doc.rect(TOT_X - 5, ty - 4, TOT_W + 5, 26).fill(HDR_BG);
    doc.moveTo(TOT_X - 5, ty - 4).lineTo(R, ty - 4).strokeColor(BORDER).lineWidth(0.4).stroke();
    doc.moveTo(TOT_X - 5, ty + 22).lineTo(R, ty + 22).strokeColor(BORDER).lineWidth(0.4).stroke();
    doc.fontSize(11).font("Helvetica-Bold").fillColor(INK)
       .text("Total", TOT_X + 5, ty + 4)
       .text(pdfCurrency(total, lineItems[0]?.currency), L, ty + 4, { width: W - 10, align: "right" });
    ty += 42;

    // Footer
    doc.moveTo(L, ty).lineTo(R, ty).strokeColor(BORDER).lineWidth(0.8).stroke();
    const FOOT_Y = ty + 18; const SIG_W = 160; const SIG_X = R - SIG_W;
    if (stampBuffer) {
      const sz = 72;
      doc.image(stampBuffer, SIG_X + (SIG_W - sz) / 2, FOOT_Y, { fit: [sz, sz] });
    }
    const sigLineY = FOOT_Y + (stampBuffer ? 80 : 22);
    doc.moveTo(SIG_X, sigLineY).lineTo(R, sigLineY).strokeColor(INK).lineWidth(0.4).stroke();
    doc.fontSize(8.5).font("Helvetica-Bold").fillColor(INK)
       .text("Authorized Signature", SIG_X, sigLineY + 7, { width: SIG_W, align: "center" });
    doc.fontSize(8).font("Helvetica").fillColor(MUTED)
       .text("for (" + company.name + ")", SIG_X, sigLineY + 19, { width: SIG_W, align: "center" });
    doc.end();
  });
}

export { generateInvoicePDF };
