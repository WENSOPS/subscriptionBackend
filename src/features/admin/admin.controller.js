import * as XLSX from "xlsx";
import { prisma } from "../../lib/prisma.js";
import { ok, badRequest, internalError, successResponse } from "../../utils/response.js";

// Helper to parse services string during package import
function parseServicesString(str) {
  if (!str) return [];
  if (typeof str !== "string") {
    if (Array.isArray(str)) return str;
    return [];
  }

  // If it's stringified JSON, parse it
  const trimmedStr = str.trim();
  if (trimmedStr.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmedStr);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      // Fall through to text parsing
    }
  }

  const services = [];
  // Prefer semicolon as separator, fallback to comma
  const separator = trimmedStr.includes(";") ? ";" : ",";
  const parts = trimmedStr.split(separator);

  for (const part of parts) {
    const trimmedPart = part.trim();
    if (!trimmedPart) continue;

    let title = trimmedPart;
    let count = 1;

    // Look for count after colon (e.g. "Service A: 2")
    const colonIndex = trimmedPart.lastIndexOf(":");
    if (colonIndex !== -1) {
      const titlePart = trimmedPart.substring(0, colonIndex).trim();
      const countPart = trimmedPart.substring(colonIndex + 1).trim();
      const parsedCount = parseInt(countPart, 10);
      if (titlePart && !isNaN(parsedCount)) {
        title = titlePart;
        count = parsedCount;
      }
    }
    services.push({ title, count });
  }

  return services;
}

// Custom CSV generator
function convertToCSV(array) {
  if (array.length === 0) return "";
  const keys = Object.keys(array[0]);
  const csvHeaders = keys.join(",");
  const csvRows = array.map((row) =>
    keys
      .map((fieldName) => {
        let value = row[fieldName];
        if (value === null || value === undefined) {
          value = "";
        }
        let valueStr = String(value);
        if (
          valueStr.includes(",") ||
          valueStr.includes('"') ||
          valueStr.includes("\n") ||
          valueStr.includes("\r")
        ) {
          valueStr = valueStr.replace(/"/g, '""');
          valueStr = `"${valueStr}"`;
        }
        return valueStr;
      })
      .join(",")
  );
  return [csvHeaders, ...csvRows].join("\r\n");
}

export const importData = async (req, res) => {
  try {
    const { target } = req.query;
    if (!target || (target !== "services" && target !== "packages")) {
      return badRequest(res, "Invalid target. Target must be 'services' or 'packages'.");
    }

    if (!req.file) {
      return badRequest(res, "No file uploaded.");
    }

    const { buffer, originalname } = req.file;
    let data = [];

    // Parse according to file type
    if (originalname.endsWith(".json")) {
      try {
        data = JSON.parse(buffer.toString("utf-8"));
      } catch (err) {
        return badRequest(res, "Invalid JSON file structure.");
      }
    } else {
      // spreadsheet parser (xlsx, xls, csv)
      try {
        const workbook = XLSX.read(buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        data = XLSX.utils.sheet_to_json(sheet);
      } catch (err) {
        return badRequest(res, "Failed to parse CSV/Excel spreadsheet.");
      }
    }

    if (!Array.isArray(data)) {
      return badRequest(res, "Import data must be a list of records.");
    }

    if (target === "services") {
      // 1. Process Services Import
      const servicesToUpsert = [];
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const rowNum = i + 1;

        const title = row.title || row.Title || row.serviceTitle || row.service_title;
        const description = row.description || row.Description || null;
        const priceVal = row.price !== undefined ? row.price : (row.Price !== undefined ? row.Price : 100);
        const isActiveVal = row.isActive !== undefined ? row.isActive : (row.IsActive !== undefined ? row.IsActive : true);
        const thumbnailUrlKey = row.thumbnailUrlKey || row.ThumbnailUrlKey || null;

        if (!title || typeof title !== "string" || !title.trim()) {
          return badRequest(
            res,
            `Validation error at row ${rowNum}: Title is required and must be a non-empty string.`
          );
        }

        const price = parseFloat(priceVal);
        if (isNaN(price) || price < 0) {
          return badRequest(
            res,
            `Validation error at row ${rowNum}: Price must be a positive number.`
          );
        }

        let isActive = true;
        if (typeof isActiveVal === "string") {
          const val = isActiveVal.toLowerCase().trim();
          isActive = val === "true" || val === "yes" || val === "1" || val === "active";
        } else {
          isActive = Boolean(isActiveVal);
        }

        servicesToUpsert.push({
          title: title.trim(),
          description: description ? String(description).trim() : null,
          price,
          isActive,
          thumbnailUrlKey: thumbnailUrlKey ? String(thumbnailUrlKey).trim() : null,
        });
      }

      // Merge / Save into Database
      const results = [];
      await prisma.$transaction(async (tx) => {
        for (const item of servicesToUpsert) {
          const service = await tx.service.upsert({
            where: { title: item.title },
            update: {
              description: item.description,
              price: item.price,
              isActive: item.isActive,
              thumbnailUrlKey: item.thumbnailUrlKey,
            },
            create: {
              title: item.title,
              description: item.description,
              price: item.price,
              isActive: item.isActive,
              thumbnailUrlKey: item.thumbnailUrlKey,
            },
          });
          results.push(service);
        }
      });

      return ok(res, { count: results.length }, `${results.length} services imported & merged successfully.`);

    } else {
      // 2. Process Packages Import
      const packagesToUpsert = [];
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const rowNum = i + 1;

        const name = row.name || row.Name || row.packageName || row.package_name;
        const description = row.description || row.Description || null;
        const regularPriceVal = row.regularPrice !== undefined ? row.regularPrice : (row.RegularPrice !== undefined ? row.RegularPrice : null);
        const discountedPriceVal = row.discountedPrice !== undefined ? row.discountedPrice : (row.DiscountedPrice !== undefined ? row.DiscountedPrice : regularPriceVal);
        const tags = row.tags || row.Tags || null;
        const vehicleType = row.vehicleType || row.VehicleType || null;
        const vehicleModelVal = row.vehicleModel || row.VehicleModel || null;
        const bodyguardType = row.bodyguardType || row.BodyguardType || null;
        const tripsVal = row.trips !== undefined ? row.trips : (row.Trips !== undefined ? row.Trips : null);
        const category = row.category || row.Category || null;
        const validityVal = row.validity !== undefined ? row.validity : (row.Validity !== undefined ? row.Validity : null);
        const thumbnailUrlKey = row.thumbnailUrlKey || row.ThumbnailUrlKey || null;
        const isActiveVal = row.isActive !== undefined ? row.isActive : (row.IsActive !== undefined ? row.IsActive : true);
        const servicesVal = row.services || row.Services || null;
        const imagesVal = row.images || row.Images || null;
        const videosVal = row.videos || row.Videos || null;

        if (!name || typeof name !== "string" || !name.trim()) {
          return badRequest(
            res,
            `Validation error at row ${rowNum}: Package name is required.`
          );
        }

        const regularPrice = parseFloat(regularPriceVal);
        const discountedPrice = parseFloat(discountedPriceVal);

        if (isNaN(regularPrice) || regularPrice <= 0) {
          return badRequest(
            res,
            `Validation error at row ${rowNum}: Regular price must be a positive number.`
          );
        }
        if (isNaN(discountedPrice) || discountedPrice <= 0) {
          return badRequest(
            res,
            `Validation error at row ${rowNum}: Discounted price must be a positive number.`
          );
        }
        if (regularPrice < discountedPrice) {
          return badRequest(
            res,
            `Validation error at row ${rowNum}: Regular price cannot be less than discounted price.`
          );
        }

        // vehicleModel parsing
        let vehicleModel = null;
        if (vehicleModelVal) {
          if (typeof vehicleModelVal === "string") {
            const trimmed = vehicleModelVal.trim();
            if (trimmed.startsWith("[")) {
              try {
                vehicleModel = JSON.parse(trimmed);
              } catch (e) {
                vehicleModel = [trimmed];
              }
            } else {
              // Comma-separated models
              vehicleModel = trimmed.split(",").map((m) => m.trim()).filter(Boolean);
            }
          } else if (Array.isArray(vehicleModelVal)) {
            vehicleModel = vehicleModelVal;
          } else {
            vehicleModel = [String(vehicleModelVal)];
          }
        }

        const trips = tripsVal !== null ? parseInt(tripsVal, 10) : null;
        const validity = validityVal !== null ? parseInt(validityVal, 10) : null;

        if (trips !== null && (isNaN(trips) || trips < 0)) {
          return badRequest(res, `Validation error at row ${rowNum}: Trips must be a positive integer.`);
        }
        if (validity !== null && (isNaN(validity) || validity < 0)) {
          return badRequest(res, `Validation error at row ${rowNum}: Validity must be a positive integer.`);
        }

        let isActive = true;
        if (typeof isActiveVal === "string") {
          const val = isActiveVal.toLowerCase().trim();
          isActive = val === "true" || val === "yes" || val === "1" || val === "active";
        } else {
          isActive = Boolean(isActiveVal);
        }

        const parsedServices = parseServicesString(servicesVal);

        const images = imagesVal
          ? String(imagesVal)
              .split(";")
              .map((s) => s.trim())
              .filter(Boolean)
          : [];
        const videos = videosVal
          ? String(videosVal)
              .split(";")
              .map((s) => s.trim())
              .filter(Boolean)
          : [];

        packagesToUpsert.push({
          name: name.trim(),
          description: description ? String(description).trim() : null,
          regularPrice,
          discountedPrice,
          tags: tags ? String(tags).trim() : null,
          vehicleType: vehicleType ? String(vehicleType).trim() : null,
          vehicleModel,
          bodyguardType: bodyguardType ? String(bodyguardType).trim() : null,
          trips,
          category: category ? String(category).trim() : null,
          validity,
          thumbnailUrlKey: thumbnailUrlKey ? String(thumbnailUrlKey).trim() : null,
          isActive,
          parsedServices,
          images,
          videos,
        });
      }

      // Upsert packages in DB
      const results = [];
      await prisma.$transaction(async (tx) => {
        for (const item of packagesToUpsert) {
          // Resolve / create service associations inside the transaction
          const resolvedServices = [];
          for (const s of item.parsedServices) {
            let dbService = await tx.service.findUnique({
              where: { title: s.title },
            });
            if (!dbService) {
              dbService = await tx.service.create({
                data: {
                  title: s.title,
                  description: `Auto-created during package import for package "${item.name}"`,
                  price: 100,
                  isActive: true,
                },
              });
            }
            resolvedServices.push({
              serviceId: dbService.id,
              count: s.count || 1,
            });
          }

          const mediaRecords = [
            ...item.images.map((key, index) => ({
              urlKey: key,
              type: "IMAGE",
              order: index,
            })),
            ...item.videos.map((key, index) => ({
              urlKey: key,
              type: "VIDEO",
              order: index,
            })),
          ];

          const existingPkg = await tx.package.findUnique({
            where: { name: item.name },
          });

          let pkg;
          if (existingPkg) {
            pkg = await tx.package.update({
              where: { id: existingPkg.id },
              data: {
                description: item.description,
                regularPrice: item.regularPrice,
                discountedPrice: item.discountedPrice,
                tags: item.tags,
                vehicleType: item.vehicleType,
                vehicleModel: item.vehicleModel,
                bodyguardType: item.bodyguardType,
                trips: item.trips,
                category: item.category,
                validity: item.validity,
                thumbnailUrlKey: item.thumbnailUrlKey,
                isActive: item.isActive,
                packageServices: {
                  deleteMany: {},
                  create: resolvedServices.map((rs) => ({
                    serviceId: rs.serviceId,
                    count: rs.count,
                  })),
                },
                packageMedia: {
                  deleteMany: {},
                  create: mediaRecords,
                },
              },
            });
          } else {
            pkg = await tx.package.create({
              data: {
                name: item.name,
                description: item.description,
                regularPrice: item.regularPrice,
                discountedPrice: item.discountedPrice,
                tags: item.tags,
                vehicleType: item.vehicleType,
                vehicleModel: item.vehicleModel,
                bodyguardType: item.bodyguardType,
                trips: item.trips,
                category: item.category,
                validity: item.validity,
                thumbnailUrlKey: item.thumbnailUrlKey,
                isActive: item.isActive,
                packageServices: {
                  create: resolvedServices.map((rs) => ({
                    serviceId: rs.serviceId,
                    count: rs.count,
                  })),
                },
                ...(mediaRecords.length > 0 && {
                  packageMedia: {
                    create: mediaRecords,
                  },
                }),
              },
            });
          }
          results.push(pkg);
        }
      });

      return ok(res, { count: results.length }, `${results.length} packages imported & merged successfully.`);
    }

  } catch (error) {
    console.error("Error importing data:", error);
    return internalError(res, "Failed to import file data.");
  }
};

export const exportData = async (req, res) => {
  try {
    const { target, type } = req.query;
    if (!target || (target !== "services" && target !== "packages")) {
      return badRequest(res, "Invalid target. Target must be 'services' or 'packages'.");
    }
    if (!type || (type !== "csv" && type !== "json" && type !== "xlsx")) {
      return badRequest(res, "Invalid file format type. Must be 'csv', 'json', or 'xlsx'.");
    }

    let exportList = [];

    if (target === "services") {
      const services = await prisma.service.findMany();
      exportList = services.map((s) => ({
        Id: s.id,
        Title: s.title,
        Description: s.description || "",
        Price: s.price,
        IsActive: s.isActive,
        ThumbnailUrlKey: s.thumbnailUrlKey || "",
        CreatedAt: s.createdAt ? s.createdAt.toISOString() : "",
        UpdatedAt: s.updatedAt ? s.updatedAt.toISOString() : "",
      }));
    } else {
      const packages = await prisma.package.findMany({
        include: {
          packageServices: {
            include: {
              service: true,
            },
          },
          packageMedia: true,
        },
      });

      exportList = packages.map((pkg) => {
        // Format services relation as ServiceTitle:count semicolon-separated string
        const servicesStr = pkg.packageServices
          .map((ps) => `${ps.service.title}:${ps.count}`)
          .join("; ");

        const imagesStr = pkg.packageMedia
          .filter((m) => m.type === "IMAGE")
          .sort((a, b) => a.order - b.order)
          .map((m) => m.urlKey)
          .join("; ");

        const videosStr = pkg.packageMedia
          .filter((m) => m.type === "VIDEO")
          .sort((a, b) => a.order - b.order)
          .map((m) => m.urlKey)
          .join("; ");

        let vehicleModelStr = "";
        if (pkg.vehicleModel) {
          if (typeof pkg.vehicleModel === "string") {
            vehicleModelStr = pkg.vehicleModel;
          } else {
            vehicleModelStr = JSON.stringify(pkg.vehicleModel);
          }
        }

        return {
          Id: pkg.id,
          Name: pkg.name,
          Description: pkg.description || "",
          RegularPrice: pkg.regularPrice,
          DiscountedPrice: pkg.discountedPrice,
          Tags: pkg.tags || "",
          VehicleType: pkg.vehicleType || "",
          VehicleModel: vehicleModelStr,
          BodyguardType: pkg.bodyguardType || "",
          Trips: pkg.trips || "",
          Category: pkg.category || "",
          Validity: pkg.validity || "",
          ThumbnailUrlKey: pkg.thumbnailUrlKey || "",
          IsActive: pkg.isActive,
          Services: servicesStr,
          Images: imagesStr,
          Videos: videosStr,
          CreatedAt: pkg.createdAt ? pkg.createdAt.toISOString() : "",
          UpdatedAt: pkg.updatedAt ? pkg.updatedAt.toISOString() : "",
        };
      });
    }

    // Set Response Headers and send data based on format
    const filename = `${target}_export_${Date.now()}`;

    if (type === "json") {
      res.setHeader("Content-Disposition", `attachment; filename="${filename}.json"`);
      res.setHeader("Content-Type", "application/json");
      return res.send(JSON.stringify(exportList, null, 2));
    } else if (type === "csv") {
      const csvContent = convertToCSV(exportList);
      res.setHeader("Content-Disposition", `attachment; filename="${filename}.csv"`);
      res.setHeader("Content-Type", "text/csv");
      return res.send(csvContent);
    } else if (type === "xlsx") {
      const ws = XLSX.utils.json_to_sheet(exportList);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, target === "services" ? "Services" : "Packages");

      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      res.setHeader("Content-Disposition", `attachment; filename="${filename}.xlsx"`);
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      return res.send(buffer);
    }

  } catch (error) {
    console.error("Error exporting data:", error);
    return internalError(res, "Failed to export data.");
  }
};
