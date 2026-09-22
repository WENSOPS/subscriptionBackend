import { Router } from "express";
import { createScheduleRequest } from "./schedule.controller.js";
import { createScheduleValidation } from "./schedule.validation.js";

const router = Router();

router.post("/", createScheduleValidation, createScheduleRequest);

export default router;
