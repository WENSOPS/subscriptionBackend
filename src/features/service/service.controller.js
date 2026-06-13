import { prisma } from "../../lib/prisma.js";

export const createService = async (req, res) => {
  try {
    const { title, description, thumbnailUrl, isActive } = req.body;

    const newService = await prisma.service.create({
      data: {
        title,
        description,
        thumbnailUrl,
        isActive,
      },
    });
    return res
      .status(201)
      .json({
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
    const services = await prisma.service.findMany();
    return res
      .status(200)
      .json({
        success: true,
        data: services,
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
    return res
      .status(200)
      .json({
        success: true,
        data: service,
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
    const { title, description, thumbnailUrl, isActive } = req.body;
    const updatedService = await prisma.service.update({
      where: { id: parseInt(id) },
      data: {
        title,
        description,
        thumbnailUrl,
        isActive,
      },
    });
    return res
      .status(200)
      .json({
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
