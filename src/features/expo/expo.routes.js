import Router from "express";
import * as expoController from "./expo.controller.js";
import authMiddleware from "../../middleware/auth.middlewares.js";
import {
  createExpoValidationRules,
  expoIdValidationRules,
  updateExpoValidationRules,
} from "./expo.validation.js";

const router = Router();

router.get("/list", expoController.listPublicExpos);
router.get(
  "/by-slug/:slug",
  expoController.getExpoBySlug,
);
router.get(
  "/by-id/:id",
  expoIdValidationRules(),
  expoController.getPublicExpoById,
);

router.get(
  "/admin/list",
  authMiddleware(["admin"]),
  expoController.listAdminExpos,
);
router.get(
  "/admin/:id",
  authMiddleware(["admin"]),
  expoIdValidationRules(),
  expoController.getExpoById,
);

router.post(
  "/create",
  authMiddleware(["admin"]),
  createExpoValidationRules(),
  expoController.createExpo,
);

router.put(
  "/update/:id",
  authMiddleware(["admin"]),
  expoIdValidationRules(),
  updateExpoValidationRules(),
  expoController.updateExpo,
);

router.delete(
  "/delete/:id",
  authMiddleware(["admin"]),
  expoIdValidationRules(),
  expoController.deleteExpo,
);

router.get(
  "/cities-and-months",
  expoController.getCitiesAndMonthsForExpos,
);
export default router;
