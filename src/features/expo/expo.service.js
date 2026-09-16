import { randomUUID } from "crypto";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { prisma } from "../../lib/prisma.js";
import s3Client from "../../config/storage/s3.js";
import {
  computeEventDateFields,
  isExpoActiveByEventDates,
} from "./expoDateStatus.js";
function toDateOnly(value) {
  if (value == null) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function serializeExpoForClient(expo, { includePackages = false } = {}) {
  if (!expo) return null;

  const packageIds =
    expo.packages?.map((p) => p.id) ??
    (Array.isArray(expo.packageIds) ? expo.packageIds : []);

  const { dateStatus, isEventEnded, isEnded, isLive } = computeEventDateFields(
    expo.eventStart,
    expo.eventEnd,
  );

  const base = {
    id: expo.id,
    slug: expo.slug,
    name: expo.name,
    shortName: expo.shortName,
    city: expo.city,
    venue: expo.venue,
    eventStart: toDateOnly(expo.eventStart),
    eventEnd: toDateOnly(expo.eventEnd),
    serviceStart: toDateOnly(expo.serviceStart),
    serviceEnd: toDateOnly(expo.serviceEnd),
    status: expo.status,
    dateStatus,
    isEventEnded,
    isEnded,
    isLive,
    featured: expo.featured,
    heroImages: expo.heroImages ?? [],
    cardImage: expo.cardImage,
    bannerImage: expo.bannerImage,
    eventImages: expo.eventImages ?? [],
    eventVideos: expo.eventVideos ?? [],
    airportCode: expo.airportCode,
    airportName: expo.airportName,
    airportDistance: expo.airportDistance,
    airportTravelTime: expo.airportTravelTime,
    pickupPoints: expo.pickupPoints ?? [],
    dropLocation: expo.dropLocation,
    serviceArea: expo.serviceArea,
    amenities: expo.amenities ?? [],
    faqOverrides: expo.faqOverrides ?? [],
    testimonialIds: expo.testimonialIds ?? [],
    packageIds,
    airport: {
      code: expo.airportCode,
      name: expo.airportName,
      distance: expo.airportDistance,
      travelTime: expo.airportTravelTime,
    },
    coverage: {
      pickupPoints: expo.pickupPoints ?? [],
      dropLocation: expo.dropLocation,
      serviceArea: expo.serviceArea,
      amenities: expo.amenities ?? [],
    },
    createdAt: expo.createdAt,
    updatedAt: expo.updatedAt,
  };

  if (includePackages && expo.packages) {
    base.packages = expo.packages;
  }

  return base;
}

const expoInclude = {
  packages: {
    select: {
      id: true,
      name: true,
      description: true,
      regularPrice: true,
      discountedPrice: true,
      thumbnailUrlKey: true,
      tags: true,
      vehicleType: true,
      vehicleModel: true,
      bodyguardType: true,
      trips: true,
      category: true,
    },
  },
};

async function resolveThumbnailUrl(thumbnailUrlKey) {
  if (!thumbnailUrlKey) return null;
  if (thumbnailUrlKey.startsWith("/") || thumbnailUrlKey.startsWith("http")) {
    return thumbnailUrlKey;
  }
  return getSignedUrl(
    s3Client,
    new GetObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: thumbnailUrlKey,
    }),
    { expiresIn: 3600 },
  );
}

export function mapPackageForExpoUi(pkg, index) {
  return {
    id: pkg.id,
    name: pkg.name,
    price: pkg.discountedPrice ?? pkg.regularPrice,
    anchorPrice: pkg.regularPrice,
    image: pkg.thumbnailUrl || "/cards/Premium_Mumbai_Delhi_Package.png",
    packageNo: String(index + 1).padStart(2, "0"),
    tag: pkg.tags || "EXPO PACKAGE",
    privileges: pkg.description
      ? [
          {
            title: pkg.name,
            desc: pkg.description,
            worth: null,
            icon: "✓",
          },
        ]
      : [],
    vehicleType: pkg.vehicleType,
    bodyguard: pkg.bodyguardType,
    trips: pkg.trips,
  };
}

async function attachSignedPackages(expo) {
  if (!expo?.packages?.length) return expo;
  const packages = await Promise.all(
    expo.packages.map(async (pkg, index) => {
      const thumbnailUrl = await resolveThumbnailUrl(pkg.thumbnailUrlKey);
      return mapPackageForExpoUi({ ...pkg, thumbnailUrl }, index);
    }),
  );
  return { ...expo, packages };
}

function buildExpoFieldsFromBody(body) {
  const {
    packageIds,
    slug,
    name,
    shortName,
    city,
    venue,
    eventStart,
    eventEnd,
    status,
    heroImages,
    cardImage,
    bannerImage,
    eventImages,
    eventVideos,
    airportCode,
    airportName,
    airportDistance,
    airportTravelTime,
    pickupPoints,
    dropLocation,
    serviceArea,
    amenities,
    faqOverrides,
    testimonialIds,
  } = body;

  return {
    slug: slug.trim(),
    name: name.trim(),
    shortName: shortName?.trim() || null,
    city: city.trim(),
    venue: venue.trim(),
    eventStart: new Date(eventStart),
    eventEnd: new Date(eventEnd),
    serviceStart: new Date(eventStart),
    serviceEnd: new Date(eventEnd),
    status: status ?? "upcoming",
    featured: false,
    heroImages: heroImages ?? undefined,
    cardImage: cardImage?.trim() || null,
    bannerImage: bannerImage?.trim() || null,
    eventImages: eventImages ?? undefined,
    eventVideos: eventVideos ?? undefined,
    airportCode: airportCode?.trim() || null,
    airportName: airportName?.trim() || null,
    airportDistance:
      airportDistance != null && airportDistance !== ""
        ? Number(airportDistance)
        : null,
    airportTravelTime:
      airportTravelTime != null && airportTravelTime !== ""
        ? Number(airportTravelTime)
        : null,
    pickupPoints: pickupPoints ?? undefined,
    dropLocation: dropLocation?.trim() || null,
    serviceArea: serviceArea?.trim() || null,
    amenities: amenities ?? undefined,
    faqOverrides: faqOverrides ?? undefined,
    testimonialIds: testimonialIds ?? undefined,
    packageIds: Array.isArray(packageIds)
      ? packageIds.map((packageId) => String(packageId).trim()).filter(Boolean)
      : [],
  };
}

function buildExpoCreateData(body) {
  const fields = buildExpoFieldsFromBody(body);
  const { packageIds, ...rest } = fields;
  const expoId = (body.id && String(body.id).trim()) || randomUUID();

  return {
    id: expoId,
    ...rest,
    packages:
      packageIds.length > 0
        ? { connect: packageIds.map((id) => ({ id })) }
        : undefined,
  };
}

function buildExpoUpdateData(body) {
  const fields = buildExpoFieldsFromBody(body);
  const { packageIds, ...rest } = fields;

  return {
    ...rest,
    packages: { set: packageIds.map((id) => ({ id })) },
  };
}

async function assertPackageIdsExist(packageIds) {
  if (!packageIds.length) return;
  const found = await prisma.package.findMany({
    where: { id: { in: packageIds } },
    select: { id: true },
  });
  if (found.length !== packageIds.length) {
    const err = new Error("One or more package IDs were not found");
    err.code = "PACKAGES_NOT_FOUND";
    throw err;
  }
}

export async function createExpo(body) {
  const data = buildExpoCreateData(body);
  const packageIds = data.packages?.connect?.map((c) => c.id) ?? [];
  await assertPackageIdsExist(packageIds);

  const created = await prisma.expo.create({
    data,
    include: expoInclude,
  });

  return serializeExpoForClient(created, { includePackages: true });
}

export async function updateExpo(id, body) {
  const existing = await prisma.expo.findUnique({ where: { id } });
  if (!existing) return null;

  const data = buildExpoUpdateData(body);
  const packageIds = buildExpoFieldsFromBody(body).packageIds;
  await assertPackageIdsExist(packageIds);

  const updated = await prisma.expo.update({
    where: { id },
    data,
    include: expoInclude,
  });

  return serializeExpoForClient(updated, { includePackages: true });
}

export async function deleteExpo(id) {
  const existing = await prisma.expo.findUnique({ where: { id } });
  if (!existing) return false;
  await prisma.expo.delete({ where: { id } });
  return true;
}

/** Public site: non-cancelled expos (ended filtered by event dates). */
const publicExpoWhere = {
  status: { not: "cancelled" },
};

function isPublicExpoRowVisible(row) {
  return isExpoActiveByEventDates(row.eventStart, row.eventEnd);
}

export async function listPublicExpos() {
  const rows = await prisma.expo.findMany({
    where: publicExpoWhere,
    orderBy: { eventStart: "asc" },
    include: { packages: { select: { id: true } } },
  });

  return rows
    .filter(isPublicExpoRowVisible)
    .map((row) => serializeExpoForClient(row));
}

async function getPublicExpoDetail(where) {
  const expo = await prisma.expo.findUnique({
    where,
    include: expoInclude,
  });
  if (!expo || expo.status === "cancelled") return null;
  if (!isExpoActiveByEventDates(expo.eventStart, expo.eventEnd)) return null;

  const withPackages = await attachSignedPackages(expo);
  const serialized = serializeExpoForClient(withPackages, {
    includePackages: true,
  });
  serialized.packages = withPackages.packages;
  return serialized;
}

export async function getExpoBySlug(slug) {
  return getPublicExpoDetail({ slug });
}

export async function getPublicExpoById(id) {
  return getPublicExpoDetail({ id });
}

export async function listAdminExpos({ page = 1, limit = 10, search = "" }) {
  const where = search?.trim()
    ? {
        OR: [
          { name: { contains: search.trim() } },
          { slug: { contains: search.trim() } },
          { city: { contains: search.trim() } },
          { id: { contains: search.trim() } },
        ],
      }
    : {};

  const skip = (page - 1) * limit;
  const [total, rows] = await Promise.all([
    prisma.expo.count({ where }),
    prisma.expo.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
      include: { packages: { select: { id: true, name: true } } },
    }),
  ]);

  return {
    expos: rows.map((row) => serializeExpoForClient(row, { includePackages: true })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

export async function getExpoById(id) {
  const expo = await prisma.expo.findUnique({
    where: { id },
    include: expoInclude,
  });
  if (!expo) return null;
  return serializeExpoForClient(expo, { includePackages: true });
}

export async function getCitiesAndMonthsForExpos() {
  const rows = await prisma.expo.findMany({
    where: publicExpoWhere,
    select: { city: true, eventStart: true },
    orderBy: { eventStart: "asc" },
  });

  const citySet = new Set();
  const monthByKey = new Map();

  for (const row of rows) {
    if (!isPublicExpoRowVisible(row)) continue;

    const city = row.city?.trim();
    if (city) citySet.add(city);

    const d = new Date(row.eventStart);
    if (Number.isNaN(d.getTime())) continue;

    const year = d.getUTCFullYear();
    const month = d.getUTCMonth() + 1;
    const key = `${year}-${String(month).padStart(2, "0")}`;
    if (monthByKey.has(key)) continue;

    const label = new Date(Date.UTC(year, month - 1, 1)).toLocaleString(
      "en-IN",
      { month: "long", year: "numeric", timeZone: "UTC" },
    );

    monthByKey.set(key, {
      id: key,
      name: label,
      key,
      month,
      year,
      label,
    });
  }

  const cities = Array.from(citySet)
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({ id: name, name }));

  const months = Array.from(monthByKey.values()).sort(
    (a, b) =>
      new Date(Date.UTC(a.year, a.month - 1, 1)) -
      new Date(Date.UTC(b.year, b.month - 1, 1)),
  );

  return { cities, months };
}