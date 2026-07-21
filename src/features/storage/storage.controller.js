import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";
import s3 from "../../config/storage/s3.js";
import {
  S3_FOLDERS,
  PRESIGN_EXPIRY_SECONDS,
} from "../../config/storage/s3.constants.js";
import {
  ok,
  created,
  internalError,
  badRequest,
} from "../../utils/response.js";
// helper: get extension from contentType
const extFromMime = (contentType) => {
  const map = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  return map[contentType] || "bin";
};

// ── helper: build S3 key ──────────────────────────────────────────
const buildKey = (folder, filename, contentType) => {
  const ext = extFromMime(contentType);
  const date = new Date().toISOString().slice(0, 10); // "2024-01-15"
  return `${folder}/${date}/${uuidv4()}.${ext}`;
  // result: "posts/2024-01-15/3f2a1b-uuid.jpg"
};

// ── helper: build public URL ──────────────────────────────────────
const buildPublicUrl = (key) =>
  `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

// POST /api/upload/presign
// body: { filename, contentType, sizeMB, folder }
export const getPresignedUrl = async (req, res) => {
  try {
    const { filename, contentType, folder = S3_FOLDERS.services } = req.body;

    // check folder is valid
    if (!Object.values(S3_FOLDERS).includes(folder))
      return badRequest(
        res,
        `Invalid folder. Allowed: ${Object.values(S3_FOLDERS).join(", ")}`,
      );

    const key = buildKey(folder, filename, contentType);

    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      ContentType: contentType,
      ContentDisposition: "inline",
      MetadataDirective: "REPLACE",
    });

    const uploadUrl = await getSignedUrl(s3, command, {
      expiresIn: PRESIGN_EXPIRY_SECONDS,
    });
    const publicUrl = buildPublicUrl(key);

    console.log(`[upload] presigned → folder=${folder} key=${key}`);

    return ok(res, {
      uploadUrl,
      publicUrl,
      key,
    });
  } catch (err) {
    console.error("[upload] presign error →", err.message);
    return internalError(res, "Failed to generate presigned URL");
  }
};

// DELETE /api/upload
// body: { key }
// called when post creation fails — clean up orphan image
export const deleteImage = async (req, res) => {
  try {
    const { key } = req.body;

    if (!key) return res.status(400).json({ error: "key is required" });

    await s3.send(
      new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
      }),
    );

    console.log(`[upload] deleted → key=${key}`);
    return ok(res, { message: "Image deleted successfully" });
  } catch (err) {
    console.error("[upload] delete error →", err.message);
    return internalError(res, "Failed to delete image");
  }
};
