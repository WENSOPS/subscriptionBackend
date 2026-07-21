import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import s3Client from "../config/storage/s3.js";

const BUCKET = process.env.S3_BUCKET;

/**
 * Uploads a PDF buffer to S3.
 * Stored under: invoices/YYYY/MM/INV-XXXXXXXX.pdf
 *
 * @param {Buffer} pdfBuffer
 * @param {string} invoiceNumber  - e.g. "INV-20240615-4821"
 * @returns {Promise<string>} s3Key - the stored object key
 */
async function uploadInvoiceToS3(pdfBuffer, invoiceNumber) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  // Folder structure: invoices/2024/06/INV-20240615-4821.pdf
  const s3Key = `invoices/${invoiceNumber}.pdf`;

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: s3Key,
    Body: pdfBuffer,
    ContentType: "application/pdf",
    // Optional: make it private (recommended)
    // ACL: "private",
    Metadata: {
      invoiceNumber,
      uploadedAt: now.toISOString(),
    },
  });

  await s3Client.send(command);

  console.log(`✅ Uploaded invoice to S3: ${s3Key}`);
  return s3Key;
}

/**
 * Generates a temporary presigned URL for downloading an invoice.
 * The URL expires after `expiresIn` seconds (default: 1 hour).
 *
 * @param {string} s3Key       - the stored object key
 * @param {number} expiresIn   - seconds until URL expires (default 3600)
 * @returns {Promise<string>}  - presigned download URL
 */
async function getInvoiceDownloadUrl(s3Key, expiresIn = 3600) {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: s3Key,
    ResponseContentDisposition: `inline; filename="${s3Key.split("/").pop()}"`,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn });
  return url;
}

export { uploadInvoiceToS3, getInvoiceDownloadUrl };
