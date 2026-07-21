import { Router } from "express";
import * as packageController from "./package.controller.js";
import * as packageValidation from "./package.validation.js";
import authMiddleware from "../../middleware/auth.middlewares.js";

const router = Router();

// Create a new package
router.post(
  "/",
  authMiddleware(["admin"]),
  packageValidation.createPackageValidationRules(),
  packageController.createPackage,
);
// Get all packages
router.get("/", authMiddleware(["admin"]), packageController.getAllPackages);
//TODO: Create a route fir getting package for users
router.get("/user", packageController.getAllPackagesForUsers);

// Custom routes for sequencing (defined BEFORE parameterized routes to avoid conflict)
router.get(
  "/categories",
  authMiddleware(["admin"]),
  packageController.getUniqueCategories,
);
router.get(
  "/category-packages/:category",
  authMiddleware(["admin"]),
  packageController.getPackagesByCategoryForAdmin,
);
router.put(
  "/sequence",
  authMiddleware(["admin"]),
  packageController.updatePackageSequence,
);

// Get a package by ID
router.get(
  "/:id",
  packageValidation.idValidationRules(),
  packageController.getPackageById,
);
// Get services in a package
router.get(
  "/:packageId/services",
  authMiddleware(["admin", "ops", "user"]),
  packageValidation.packageIdValidationRules(),
  packageController.getPackageServices,
);
// Update a package by ID
router.put(
  "/:id",
  authMiddleware(["admin"]),
  packageValidation.idValidationRules(),
  packageController.updatePackage,
);
// Delete a package by ID
router.delete(
  "/:id",
  authMiddleware(["admin"]),
  packageValidation.idValidationRules(),
  packageController.deletePackage,
);

export default router;
