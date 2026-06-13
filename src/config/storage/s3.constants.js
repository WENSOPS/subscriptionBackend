// All S3 folder paths live here — change once, applies everywhere

export const S3_FOLDERS = {
  services: "services", // services/2024-01/uuid.jpg
  packages: "packages", // packages/2024-01/uuid.jpg
};

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const MAX_FILE_SIZE_MB = 10;

export const PRESIGN_EXPIRY_SECONDS = 300; // 5 minutes
