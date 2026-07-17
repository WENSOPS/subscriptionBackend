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

const signPackageMedia = async (pkg) => {
  if (!pkg) return null;

  // Sign thumbnail
  pkg.thumbnailUrl = pkg.thumbnailUrlKey
    ? await getSignedUrl(
      s3Client,
      new GetObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: pkg.thumbnailUrlKey,
      })
    )
    : null;

  // Sign packageMedia relation if loaded
  if (pkg.packageMedia) {
    const signedMedia = await Promise.all(
      pkg.packageMedia.map(async (media) => ({
        id: media.id,
        type: media.type,
        order: media.order,
        urlKey: media.urlKey,
        url: await getSignedUrl(
          s3Client,
          new GetObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: media.urlKey,
          })
        ),
      }))
    );

    pkg.images = signedMedia
      .filter((m) => m.type === "IMAGE")
      .sort((a, b) => a.order - b.order);
    pkg.videos = signedMedia
      .filter((m) => m.type === "VIDEO")
      .sort((a, b) => a.order - b.order);
  } else {
    pkg.images = [];
    pkg.videos = [];
  }

  return pkg;
};

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
          packageMedia: true,
        },
      }),
    ]);

    const packageWithImages = await Promise.all(
      packages.map(async (pkg) => {
        return await signPackageMedia(pkg);
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
        packageMedia: true,
      },
    });
    if (!pkg) {
      return notFound(res, "Package not found");
    }
    await signPackageMedia(pkg);

    return ok(res, pkg, "Package fetched successfully");
  } catch (error) {
    console.error("Error in getPackageById:", error);
    return internalError(res, "Failed to fetch package");
  }
};
export const getPackageServices = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const { packageId } = req.params;

    const parsedPackageId = parseInt(packageId);

    const packageExists = await prisma.package.findUnique({
      where: { id: parsedPackageId },
    });

    if (!packageExists) {
      return notFound(res, "Package not found");
    }

    const where = {
      packageId: parsedPackageId,
      ...(search && {
        service: {
          OR: [
            { title: { contains: search } },
            { description: { contains: search } },
          ],
        },
      }),
    };

    const [total, packageServices] = await Promise.all([
      prisma.packageService.count({ where }),
      prisma.packageService.findMany({
        where,
        skip: (page - 1) * limit,
        take: parseInt(limit),
        include: {
          service: true,
        },
      }),
    ]);

    const servicesWithUrls = await Promise.all(
      packageServices.map(async (ps) => {
        const thumbnailUrl = ps.service?.thumbnailUrlKey
          ? await getSignedUrl(
            s3Client,
            new GetObjectCommand({
              Bucket: process.env.S3_BUCKET,
              Key: ps.service.thumbnailUrlKey,
            })
          )
          : null;
        return {
          ...ps.service,
          count: ps.count,
          thumbnailUrl,
        };
      })
    );

    const response = {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      services: servicesWithUrls,
      regularPrice: packageExists.regularPrice,
      discountedPrice: packageExists.discountedPrice,
      price: packageExists.discountedPrice,
    };

    return ok(res, response, "Package services fetched successfully");
  } catch (error) {
    console.error("Error fetching package services:", error);
    return internalError(res, "Failed to fetch package services");
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
    termsAndConditions,
    images, // string[] of S3 keys
    videos, // string[] of S3 keys
  } = req.body;

  try {
    // Defense-in-depth (also enforced in validation rules)
    if (Number(regularPrice) < Number(discountedPrice)) {
      return badRequest(res, "Regular price cannot be less than discounted price");
    }

    const mediaRecords = [
      ...(Array.isArray(images) ? images : []).map((key, index) => ({
        urlKey: key,
        type: "IMAGE",
        order: index,
      })),
      ...(Array.isArray(videos) ? videos : []).map((key, index) => ({
        urlKey: key,
        type: "VIDEO",
        order: index,
      })),
    ];

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
        ...(termsAndConditions !== undefined && { termsAndConditions }),
        packageServices: {
          create: services.map((service) => ({
            serviceId: service.id,
            count: service.count || 1,
          })),
        },
        ...(mediaRecords.length > 0 && {
          packageMedia: {
            create: mediaRecords,
          },
        }),
      },
      include: {
        packageServices: {
          include: {
            service: true,
          },
        },
        packageMedia: true,
      },
    });

    // Sign thumbnail
    const thumbnailUrl = newPackage.thumbnailUrlKey
      ? await getSignedUrl(
        s3Client,
        new GetObjectCommand({
          Bucket: process.env.S3_BUCKET,
          Key: newPackage.thumbnailUrlKey,
        })
      )
      : null;

    // Sign all media (images + videos) in parallel
    const signedMedia = await Promise.all(
      newPackage.packageMedia.map(async (media) => ({
        id: media.id,
        type: media.type,
        order: media.order,
        urlKey: media.urlKey,
        url: await getSignedUrl(
          s3Client,
          new GetObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: media.urlKey,
          })
        ),
      }))
    );

    newPackage.thumbnailUrl = thumbnailUrl;
    newPackage.images = signedMedia
      .filter((m) => m.type === "IMAGE")
      .sort((a, b) => a.order - b.order);
    newPackage.videos = signedMedia
      .filter((m) => m.type === "VIDEO")
      .sort((a, b) => a.order - b.order);

    return created(res, newPackage, "Package created successfully");
  } catch (error) {
    console.log(error);
    if (error.code === "P2002") {
      return badRequest(res, "A package with this name already exists");
    }
    return internalError(res, "Failed to create package");
  }
};

export const getAllPackagesForUsers = async (req, res) => {
  try {
    let { category } = req.query;
    if (!category) {
      category = "membership";
    }
    const where = { isActive: true, category };
    const packages = await prisma.package.findMany({
      where,
      include: {
        packageServices: {
          include: {
            service: true,
          },
        },
        packageMedia: true,
      },
    });
    // Fetch signed URLs for thumbnails and media
    for (const pkg of packages) {
      await signPackageMedia(pkg);
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
    thumbnailUrlKey,
    images,             // newly uploaded image S3 keys
    videos,             // newly uploaded video S3 keys
    existingPhotoKeys,   // kept image S3 keys
    existingVideoKeys,   // kept video S3 keys
    termsAndConditions,
  } = req.body;

  try {
    const finalImages = [
      ...(Array.isArray(existingPhotoKeys) ? existingPhotoKeys : []),
      ...(Array.isArray(images) ? images : []),
    ];
    const finalVideos = [
      ...(Array.isArray(existingVideoKeys) ? existingVideoKeys : []),
      ...(Array.isArray(videos) ? videos : []),
    ];

    const mediaRecords = [
      ...finalImages.map((key, index) => ({
        urlKey: key,
        type: "IMAGE",
        order: index,
      })),
      ...finalVideos.map((key, index) => ({
        urlKey: key,
        type: "VIDEO",
        order: index,
      })),
    ];

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
        thumbnailUrlKey,
        ...(services && {
          packageServices: {
            deleteMany: {},
            create: services.map((service) => ({
              serviceId: service.id,
              count: service.count || 1,
            })),
          },
        }),
        packageMedia: {
          deleteMany: {},
          create: mediaRecords,
        },
        category,
        ...(termsAndConditions !== undefined && { termsAndConditions }),
      },
      include: {
        packageServices: {
          include: {
            service: true,
          },
        },
        packageMedia: true,
      },
    });
    await signPackageMedia(updatedPackage);
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
