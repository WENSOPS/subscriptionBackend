// const transporter = require("../config/mail");
// const { formatCurrency } = require("../utils/invoiceHelpers");
import transporter from "../config/mail.js";
import { formatCurrency } from "../utils/invoiceHelpers.js";
/**
 * Sends an invoice email with the PDF attached.
 *
 * @param {Object} options
 * @param {string} options.toEmail         - recipient email
 * @param {string} options.toName          - recipient name
 * @param {string} options.invoiceNumber
 * @param {string} options.serviceName     - e.g. "Web Design Package"
 * @param {number} options.total           - invoice total amount
 * @param {Buffer} options.pdfBuffer       - PDF as Buffer (for attachment)
 */
async function sendInvoiceEmail({
  toEmail,
  toName,
  invoiceNumber,
  serviceName,
  total,
  pdfBuffer,
  currency = "INR",
}) {
  const mailOptions = {
    from: process.env.MAIL_FROM,
    to: `${toName} <${toEmail}>`,
    subject: `Invoice ${invoiceNumber} – ${serviceName}`,
    html: buildEmailHTML({
      toName,
      invoiceNumber,
      serviceName,
      total,
      currency,
    }),

    // Attach the PDF directly
    attachments: [
      {
        filename: `${invoiceNumber}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`✅ Invoice email sent to ${toEmail} [${info.messageId}]`);
  return info;
}

/**
 * Builds the HTML body for the invoice email.
 */
function buildEmailHTML({
  toName,
  invoiceNumber,
  serviceName,
  total,
  currency,
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f0f2f5; margin: 0; padding: 0; }
    .wrapper { max-width: 580px; margin: 40px auto; background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.10); }
    .header { background: #1a1a2e; padding: 36px 30px 28px; }
    .header h1 { color: #ffffff; margin: 0 0 6px; font-size: 20px; font-weight: 700; letter-spacing: 0.3px; }
    .header p { color: #8888aa; margin: 0; font-size: 13px; }
    .body { padding: 32px 30px 28px; color: #333; }
    .body p { line-height: 1.75; font-size: 15px; margin: 0 0 16px; }
    .notice { display: flex; align-items: flex-start; gap: 12px; background: #f0f7ff; border-left: 4px solid #1a1a2e; border-radius: 6px; padding: 16px 20px; margin: 24px 0; }
    .notice-icon { font-size: 22px; line-height: 1; flex-shrink: 0; }
    .notice-text { font-size: 14px; color: #444; line-height: 1.65; }
    .notice-text strong { color: #1a1a2e; display: block; margin-bottom: 4px; font-size: 15px; }
    .summary { background: #f8f9fb; border-radius: 8px; padding: 20px 24px; margin: 20px 0 0; }
    .summary table { width: 100%; border-collapse: collapse; font-size: 14px; }
    .summary tr:not(:last-child) td { border-bottom: 1px solid #eee; }
    .summary td { padding: 10px 4px; color: #555; }
    .summary td:last-child { text-align: right; font-weight: 600; color: #1a1a2e; }
    .summary .total-row td { font-size: 15px; font-weight: 700; color: #1a1a2e; padding-top: 14px; }
    .footer { background: #f5f5f5; padding: 18px 40px; text-align: center; font-size: 12px; color: #aaa; border-top: 1px solid #e8e8e8; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>Invoice Attached</h1>
      <p>${invoiceNumber}</p>
    </div>
    <div class="body">
      <p>Hi <strong>${toName}</strong>,</p>
      <p>Thank you for your booking. We have attached your invoice to this email for your records.</p>

      <div class="notice">
        <div class="notice-icon">📎</div>
        <div class="notice-text">
          <strong>Invoice attached as PDF</strong>
          Your invoice <strong>${invoiceNumber}</strong> is attached to this email.
          Please save it for your records.
        </div>
      </div>

      <div class="summary">
        <table>
          <tr>
            <td>Invoice Number</td>
            <td>${invoiceNumber}</td>
          </tr>
          <tr>
            <td>Service</td>
            <td>${serviceName}</td>
          </tr>
          <tr class="total-row">
            <td>Amount</td>
            <td>${formatCurrency(total, currency)}</td>
          </tr>
        </table>
      </div>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} All rights reserved.
    </div>
  </div>
</body>
</html>
  `.trim();
}

export { sendInvoiceEmail };
