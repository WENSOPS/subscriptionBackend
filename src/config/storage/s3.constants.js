// All S3 folder paths live here — change once, applies everywhere

export const S3_FOLDERS = {
  services: "services", // services/2024-01/uuid.jpg
  packages: "packages", // packages/2024-01/uuid.jpg
};

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/mpeg",
  "video/3gpp",
  "video/x-matroska",
  "video/ogg"
];

export const ALLOWED_FILE_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];

export const MAX_FILE_SIZE_MB = 100; // Increase size limit for videos (e.g. 100MB)

export const PRESIGN_EXPIRY_SECONDS = 300; // 5 minutes
