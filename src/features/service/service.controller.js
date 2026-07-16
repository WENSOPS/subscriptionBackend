import { prisma } from "../../lib/prisma.js";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import s3Client from "../../config/storage/s3.js";

export const createService = async (req, res) => {
  try {
    const { title, description, thumbnailUrlKey, isActive } = req.body;

    const newService = await prisma.service.create({
      data: {
        title,
        description,
        thumbnailUrlKey,
        isActive,
      },
    });
    return res.status(201).json({
      success: true,
      data: newService,
      message: "Service created successfully",
    });
  } catch (error) {
    console.error("Error creating service:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to create service" });
  }
};

export const listServices = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const where = {};
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const [total, services] = await Promise.all([
      prisma.service.count({ where }),
      prisma.service.findMany({
        where,
        skip: (page - 1) * limit,
        take: parseInt(limit),
      }),
    ]);

    // Generate presigned URLs for all services (local signing — no network calls)
    const servicesWithUrls = await Promise.all(
      services.map(async (service) => ({
        ...service,
        thumbnailUrl: service.thumbnailUrlKey
          ? await getSignedUrl(
            s3Client,
            new GetObjectCommand({
              Bucket: process.env.S3_BUCKET,
              Key: service.thumbnailUrlKey,
            }),
            { expiresIn: 3600 }, // 1 hour
          )
          : null,
      })),
    );

    return res.status(200).json({
      success: true,
      data: {
        services: servicesWithUrls,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
        },
      },
      message: "Services retrieved successfully",
    });
  } catch (error) {
    console.error("Error listing services:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to retrieve services" });
  }
};

export const getServiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const service = await prisma.service.findUnique({
      where: { id: parseInt(id) },
    });
    if (!service) {
      return res
        .status(404)
        .json({ success: false, message: "Service not found" });
    }
    const thumbnailUrl = service.thumbnailUrlKey
      ? await getSignedUrl(
        s3Client,
        new GetObjectCommand({
          Bucket: process.env.S3_BUCKET,
          Key: service.thumbnailUrlKey,
        }),
        { expiresIn: 3600 }, // 1 hour
      )
      : null;
    return res.status(200).json({
      success: true,
      data: { ...service, thumbnailUrl },
      message: "Service retrieved successfully",
    });
  } catch (error) {
    console.error("Error retrieving service:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to retrieve service" });
  }
};

export const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, thumbnailUrlKey, isActive } = req.body;
    const updatedService = await prisma.service.update({
      where: { id: parseInt(id) },
      data: {
        title,
        description,
        thumbnailUrlKey,
        isActive,
      },
    });
    return res.status(200).json({
      success: true,
      data: updatedService,
      message: "Service updated successfully",
    });
  } catch (error) {
    console.error("Error updating service:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to update service" });
  }
};

export const deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.service.delete({
      where: { id: parseInt(id) },
    });
    return res
      .status(200)
      .json({ success: true, message: "Service deleted successfully" });
  } catch (error) {
    console.error("Error deleting service:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to delete service" });
  }
};

export const servicesNotIncluded = async (req, res) => {
  try {
    const { packageId } = req.params;
    const parsedPackageId = parseInt(packageId);

    const packageExists = await prisma.package.findUnique({
      where: { id: parsedPackageId },
    });

    if (!packageExists) {
      return res.status(404).json({
        success: false,
        message: "Package not found",
      });
    }

    const { page = 1, limit = 10, search } = req.query;
    const where = {
      packageServices: {
        none: {
          packageId: parsedPackageId,
        },
      },
      ...(search && {
        OR: [
          { title: { contains: search } },
          { description: { contains: search } },
        ],
      }),
    };

    const [total, services] = await Promise.all([
      prisma.service.count({ where }),
      prisma.service.findMany({
        where,
        skip: (page - 1) * limit,
        take: parseInt(limit),
      }),
    ]);

    const servicesWithUrls = await Promise.all(
      services.map(async (service) => ({
        ...service,
        thumbnailUrl: service.thumbnailUrlKey
          ? await getSignedUrl(
            s3Client,
            new GetObjectCommand({
              Bucket: process.env.S3_BUCKET,
              Key: service.thumbnailUrlKey,
            }),
            { expiresIn: 3600 },
          )
          : null,
      })),
    );

    return res.status(200).json({
      success: true,
      data: {
        services: servicesWithUrls,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
        },
      },
      message: "Services not included in package retrieved successfully",
    });
  } catch (error) {
    console.error("Error retrieving services not included in package:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve services not included in package",
    });
  }
};

