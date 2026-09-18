import { Router } from "express";
import { sendCapiEvent } from "./capi.controller.js";

const router = Router();

router.post("/send-capi-event", sendCapiEvent);

export default router;