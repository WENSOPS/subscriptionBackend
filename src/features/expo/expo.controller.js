import * as expoService from "./expo.service.js";
import {
  badRequest,
  created,
  internalError,
  notFound,
  ok,
} from "../../utils/response.js";

export async function createExpo(req, res) {
  try {
    const expo = await expoService.createExpo(req.body);
    return created(res, expo, "Expo created successfully");
  } catch (error) {
    console.error("Error creating expo:", error);
    if (error.code === "P2002") {
      return badRequest(res, "An expo with this ID or slug already exists");
    }
    if (error.code === "PACKAGES_NOT_FOUND") {
      return badRequest(res, "One or more package IDs were not found");
    }
    return internalError(res, "Failed to create expo");
  }
}

export async function listPublicExpos(req, res) {
  try {
    const expos = await expoService.listPublicExpos();
    return ok(res, { expos }, "Expos fetched successfully");
  } catch (error) {
    console.error("Error listing expos:", error);
    return internalError(res, "Failed to fetch expos");
  }
}

export async function getExpoBySlug(req, res) {
  try {
    const { slug } = req.params;
    const expo = await expoService.getExpoBySlug(slug);
    if (!expo) {
      return notFound(res, "Expo not found");
    }
    return ok(res, expo, "Expo fetched successfully");
  } catch (error) {
    console.error("Error fetching expo:", error);
    return internalError(res, "Failed to fetch expo");
  }
}

export async function listAdminExpos(req, res) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const { search } = req.query;
    const result = await expoService.listAdminExpos({ page, limit, search });
    return ok(res, result, "Expos fetched successfully");
  } catch (error) {
    console.error("Error listing admin expos:", error);
    return internalError(res, "Failed to fetch expos");
  }
}

export async function getExpoById(req, res) {
  try {
    const { id } = req.params;
    const expo = await expoService.getExpoById(id);
    if (!expo) {
      return notFound(res, "Expo not found");
    }
    return ok(res, expo, "Expo fetched successfully");
  } catch (error) {
    console.error("Error fetching expo:", error);
    return internalError(res, "Failed to fetch expo");
  }
}


export async function getCitiesAndMonthsForExpos(req, res) {
  try {
    const cities = await expoService.getCitiesAndMonthsForExpos();
    return ok(res, cities, "Cities fetched successfully");
  } catch (error) {
    console.error("Error fetching cities:", error);
    return internalError(res, "Failed to fetch cities");
  }
}

export async function updateExpo(req, res) {
  try {
    const { id } = req.params;
    const expo = await expoService.updateExpo(id, req.body);
    if (!expo) {
      return notFound(res, "Expo not found");
    }
    return ok(res, expo, "Expo updated successfully");
  } catch (error) {
    console.error("Error updating expo:", error);
    if (error.code === "P2002") {
      return badRequest(res, "An expo with this slug already exists");
    }
    if (error.code === "PACKAGES_NOT_FOUND") {
      return badRequest(res, "One or more package IDs were not found");
    }
    return internalError(res, "Failed to update expo");
  }
}

export async function deleteExpo(req, res) {
  try {
    const { id } = req.params;
    const deleted = await expoService.deleteExpo(id);
    if (!deleted) {
      return notFound(res, "Expo not found");
    }
    return ok(res, null, "Expo deleted successfully");
  } catch (error) {
    console.error("Error deleting expo:", error);
    return internalError(res, "Failed to delete expo");
  }
}