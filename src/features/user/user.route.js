import { Router } from "express";
import * as userController from "./user.controller.js";
import authMiddleware from "../../middleware/auth.middlewares.js";
import * as userValidation from "./user.validation.js";
const router = Router();

router.post(
  "/",
  authMiddleware(["admin"]),
  userValidation.createUserValidationRules(),
  userController.createUser,
);
router.post(
  "/quick-create",
  authMiddleware(["admin"]),
  userController.quickCreateUser,
);
router.get("/", authMiddleware(["admin"]), userController.getAllUsers);
router.get(
  "/:id",
  authMiddleware(["admin"]),
  userValidation.paramsValidationRules(),
  userController.getUserById,
);
router.put(
  "/:id",
  authMiddleware(["admin", "ops", "user"]),
  userValidation.updateUserValidationRules(),
  userController.updateUser,
);

export default router;
