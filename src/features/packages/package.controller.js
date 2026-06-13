import { prisma } from "../../lib/prisma.js";
import {
  created,
  accepted,
  badRequest,
  conflict,
  errorResponse,
  forbidden,
  internalError,
  noContent,
  notFound,
  ok,
  serviceUnavailable,
  successResponse,
  unauthorized,
  unprocessable,
} from "../../utils/response.js";

export const getAllPackages = async (req, res) => {
  try {
    const packages = await prisma.package.findMany({
      where: { isActive: true },
      include: {
        services: true,
      },
    });
    return ok(res, packages, "Packages fetched successfully");
  } catch (error) {
    console.log(error);
    
    return internalError(res, "Failed to fetch packages");
  }
};

export const getPackageById = async (req, res) => {
  const { id } = req.params;
  try {
    const pkg = await prisma.package.findUnique({
      where: { id: parseInt(id) },
      include: {
        services: true,
      },
    });
    if (!pkg) {
      return notFound(res, "Package not found");
    }
    return ok(res, pkg, "Package fetched successfully");
  } catch (error) {
    return internalError(res, "Failed to fetch package");
  }
};

export const createPackage = async (req, res) => {
  const {
    name,
    description,
    regularPrice,
    discountedPrice,
    tags,
    serviceIds,
    vehicleType,
    vehicleModel,
    bodyguardType,
    trips,
    validity,
    thumbnailUrl,
  } = req.body;
  try {
    const newPackage = await prisma.package.create({
      data: {
        name,
        description,
        regularPrice,
        discountedPrice,
        tags,
        vehicleType,
        vehicleModel,
        bodyguardType,
        trips,
        validity,
        thumbnailUrl,
        services: {
          connect: serviceIds.map((id) => ({ id })),
        },
      },
      include: {
        services: true,
      },
    });
    return created(res, newPackage, "Package created successfully");
  } catch (error) {
    console.log(error);
    return internalError(res, "Failed to create package");
  }
};

export const updatePackage = async (req, res) => {
  const { id } = req.params;
  const { name, description, regularPrice, tags, validity, vehicleType, vehicleModel, bodyguardType, discountedPrice, serviceIds } = req.body;
  try {
    const updatedPackage = await prisma.package.update({
      where: { id: parseInt(id) },
      data: {
        name,
        description,
        regularPrice,
        tags,
        validity,
        vehicleType,
        vehicleModel,
        bodyguardType,
        discountedPrice,
        services: { connect: serviceIds.map((id) => ({ id })) },
      },
      include: { services: true },
    });
    return ok(res, updatedPackage, "Package updated successfully");
  } catch (error) {
    if (error.code === "P2025") {
      return notFound(res, "Package not found");
    }
    return internalError(res, "Failed to update package");
  }
};

export const deletePackage = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.package.delete({ where: { id: parseInt(id) } });
    return noContent(res, "Package deleted successfully");
  } catch (error) {
    if (error.code === "P2025") {
      return notFound(res, "Package not found");
    }
    return internalError(res, "Failed to delete package");
  }
};
