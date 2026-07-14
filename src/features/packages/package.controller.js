import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
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
import { GetObjectCommand } from "@aws-sdk/client-s3";
import s3Client from "../../config/storage/s3.js";


export const getAllPackages = async (req, res) => {
  try {
    const { page = 1, limit = 10, category, search } = req.query;
    const where = {
      ...(category && { category }),
      ...(search && { name: { contains: search } }),
    };

    const [total, packages] = await Promise.all([
      prisma.package.count({ where }),
      prisma.package.findMany({
        where,
        skip: (page - 1) * limit,
        take: parseInt(limit),
        include: {
          packageServices: {
            include: {
              service: true,
            },
          },
        },
      }),
    ]);

    const packageWithImages = await Promise.all(
      packages.map(async (pkg) => {
        const thumbnailUrl = pkg.thumbnailUrlKey
          ? await getSignedUrl(
            s3Client,
            new GetObjectCommand({
              Bucket: process.env.S3_BUCKET,
              Key: pkg.thumbnailUrlKey,
            })
          )
          : null;
        return { ...pkg, thumbnailUrl };
      })
    );

    const response = {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      packages: packageWithImages,
    };
    
    return ok(res, response, "Packages fetched successfully");
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
        packageServices: {
          select: {
            count: true,
            service: true,
          },
        },
      },
    });
    if (!pkg) {
      return notFound(res, "Package not found");
    }
    const thumbnailUrl = pkg.thumbnailUrlKey
      ? await getSignedUrl(
          s3Client,
          new GetObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: pkg.thumbnailUrlKey,
          })
        )
      : null;
    pkg.thumbnailUrl = thumbnailUrl;
    
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
    services,
    vehicleType,
    vehicleModel,
    bodyguardType,
    trips,
    validity,
    thumbnailUrlKey,
    category,
  } = req.body;
  try {

    if(regularPrice < discountedPrice) {
      return badRequest(res, "Regular price cannot be less than discounted price");
    }

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
        thumbnailUrlKey,
        category,
        packageServices: {
          create: services.map((service) => ({
            serviceId: service.id,
            count: service.count || 1,
          })),
        },
      },
      include: {
        packageServices: {
          include: {
            service: true,
          },
        },
      },
    });
    const thumbnailUrl = newPackage.thumbnailUrlKey
      ? await getSignedUrl(
          s3Client,
          new GetObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: newPackage.thumbnailUrlKey,
          })
        )
      : null;
    newPackage.thumbnailUrl = thumbnailUrl;
    return created(res, newPackage, "Package created successfully");
  } catch (error) {
    console.log(error);
    return internalError(res, "Failed to create package");
  }
};

export const getAllPackagesForUsers = async (req, res) => {
  try {
    const { category } = req.query;
    const where = { isActive: true };
    if (category) {
      where.category = category;
    }
    const packages = await prisma.package.findMany({
      where,
      include: {
        packageServices: {
          include: {
            service: true,
          },
        },
      },
    });
    // Fetch signed URLs for thumbnails
    for (const pkg of packages) {
      const thumbnailUrl = pkg.thumbnailUrlKey
        ? await getSignedUrl(
            s3Client,
            new GetObjectCommand({
              Bucket: process.env.S3_BUCKET,
              Key: pkg.thumbnailUrlKey,
            })
          )
        : null;
      pkg.thumbnailUrl = thumbnailUrl;
    }
    return ok(res, packages, "Packages fetched successfully for users");
  } catch (error) {
    console.error("Error fetching packages for users:", error);
    return internalError(res, "Failed to fetch packages for users");
  }
};

export const updatePackage = async (req, res) => {
  const { id } = req.params;
  const {
    name,
    description,
    regularPrice,
    tags,
    validity,
    vehicleType,
    vehicleModel,
    bodyguardType,
    discountedPrice,
    services,
    category,
  } = req.body;
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
        ...(services && {
          packageServices: {
            deleteMany: {},
            create: services.map((service) => ({
              serviceId: service.id,
              count: service.count || 1,
            })),
          },
        }),
        category,
      },
      include: {
        packageServices: {
          include: {
            service: true,
          },
        },
      },
    });
    // Fetch signed URL for the updated package thumbnail
    const thumbnailUrl = updatedPackage.thumbnailUrlKey
      ? await getSignedUrl(
          s3Client,
          new GetObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: updatedPackage.thumbnailUrlKey,
          })
        )
      : null;
    updatedPackage.thumbnailUrl = thumbnailUrl;
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
