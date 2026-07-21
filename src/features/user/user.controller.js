import { prisma } from "../../lib/prisma.js";
import { internalError, ok, badRequest, forbidden } from "../../utils/response.js";
import * as userService from "./user.service.js"; // ✅ namespace import

export const createUser = async (req, res) => {
  try {
    const { name, email, mobileNumber, role, city } = req.body;

    const cleanEmail = userService.sanitizeEmail(email);
    const cleanMobile = userService.sanitizeMobile(mobileNumber);

    if (!cleanMobile) return badRequest(res, "Mobile number is required");

    // ✅ Added
    if (await userService.isNameTaken(name))
      return badRequest(res, "Name is already in use by another user");

    if (cleanEmail && await userService.isEmailTaken(cleanEmail))
      return badRequest(res, "Email address is already in use by another user");

    if (await userService.isMobileTaken(cleanMobile))
      return badRequest(res, "Mobile number is already in use by another user");

    const user = await userService.createUserRecord({ name, email: cleanEmail, mobileNumber: cleanMobile, role, city });
    ok(res, user, 201);
  } catch (error) {
    console.error("Error creating user:", error);
    internalError(res, "Failed to create user");
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const result = await userService.getAllUsersWithMeta(req.query);
    ok(res, result, 200);
  } catch (error) {
    console.error("Error fetching users:", error);
    internalError(res, "Failed to fetch users");
  }
};

export const getUserById = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return badRequest(res, "Invalid user ID");

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, name: true, email: true, mobileNumber: true,
        role: true, city: true, createdAt: true, updatedAt: true,
        orders: true, subscriptions: true,
      },
    });

    if (!user) return res.status(404).json({ error: "User not found" });
    ok(res, user, 200);
  } catch (error) {
    internalError(res, "Failed to fetch user");
  }
};

export const updateUser = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return badRequest(res, "Invalid user ID");

    const { userId } = req.user;
    if (req.user.role === "user" && String(userId) !== String(id))
      return forbidden(res, "You do not have permission to update this profile");

    const existingUser = await userService.findUserById(id);
    if (!existingUser) return res.status(404).json({ error: "User not found" });

    const { name, email, mobileNumber, role, city } = req.body;
    const targetEmail = email !== undefined ? userService.sanitizeEmail(email) : existingUser.email;
    const targetMobile = mobileNumber !== undefined ? userService.sanitizeMobile(mobileNumber) : existingUser.mobileNumber;

    if (!targetMobile) return badRequest(res, "Mobile number cannot be empty");


    if (name !== undefined && await userService.isNameTaken(name, id))
      return badRequest(res, "Name is already in use by another user");

    if (targetEmail && await userService.isEmailTaken(targetEmail, id))
      return badRequest(res, "Email address is already in use by another user");

    if (await userService.isMobileTaken(targetMobile, id))
      return badRequest(res, "Mobile number is already in use by another user");

    const user = await userService.updateUserRecord(id, { name, email, mobileNumber, role, city }, existingUser);
    ok(res, user, "User updated successfully");
  } catch (error) {
    console.error("Error updating user:", error);
    internalError(res, "Failed to update user");
  }
};
export const quickCreateUser = async (req, res) => {
  try {
    const { name, mobileNumber, city } = req.body;

    const cleanMobile = userService.sanitizeMobile(mobileNumber);
    if (!cleanMobile) return badRequest(res, "Mobile number is required");

    const existing = await userService.findUserByMobile(cleanMobile);
    if (existing) return ok(res, existing, 200);

    const user = await userService.createUserRecord({
      name, mobileNumber: cleanMobile,
      role: "user",
      city: city?.trim() || "Not specified",
    });
    ok(res, user, 201);
  } catch (error) {
    console.error("[quickCreateUser] Error:", error);
    internalError(res, "Failed to create user");
  }
};