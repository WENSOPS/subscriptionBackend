import { Router } from "express";
import { getPresignedUrl, deleteImage } from "./storage.controller.js";
import validateImage from "./storage.validation.js";

const router = Router();

router.post("/presign", validateImage, getPresignedUrl);  // get presigned URL
router.delete("/delete", deleteImage);       // delete orphan image

export default router;