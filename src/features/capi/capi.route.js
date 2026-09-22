import { Router } from "express";
import {
  sendCapiEvent,
  sendGAEvent,
  sendGadsEvent,
} from "./capi.controller.js";

const router = Router();

router.post("/send-capi-event", sendCapiEvent);
router.post("/send-ga-event", sendGAEvent);
router.post("/send-gads-event", sendGadsEvent);

export default router;