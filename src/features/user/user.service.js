import { prisma } from "../../lib/prisma.js";
import { generateId } from "../../utils/generateId.js";

// ─── Sanitizers ───────────────────────────────────────────────

export const sanitizeEmail = (email) => {
    return email && email.trim() !== "" ? email.trim() : null;
};

export const sanitizeMobile = (mobileNumber) => {
    return mobileNumber && mobileNumber.trim() !== "" ? mobileNumber.trim() : null;
};

// ─── Finders ──────────────────────────────────────────────────

export const findUserById = async (id) => {
    return await prisma.user.findUnique({
        where: { id },
    });
};

export const findUserByMobile = async (mobileNumber) => {
    return await prisma.user.findUnique({
        where: { mobileNumber },
    });
};

export const findUserByEmail = async (email) => {
    return await prisma.user.findUnique({
        where: { email },
    });
};

// ─── Uniqueness Validators ────────────────────────────────────

export const isEmailTaken = async (email, excludeId = null) => {
    const where = { email };
    if (excludeId) where.id = { not: excludeId };

    const exists = await prisma.user.findFirst({ where });
    return !!exists;
};

export const isMobileTaken = async (mobileNumber, excludeId = null) => {
    const where = { mobileNumber };
    if (excludeId) where.id = { not: excludeId };

    const exists = await prisma.user.findFirst({ where });
    return !!exists;
};

// ─── Core DB Operations ───────────────────────────────────────

export const createUserRecord = async ({ name, email, mobileNumber, role, city }) => {
    return await prisma.user.create({
        data: {
            id: generateId.user(),
            name: name?.trim() || null,
            email: sanitizeEmail(email),
            mobileNumber: sanitizeMobile(mobileNumber),
            role,
            city: city?.trim() || null,
        },
    });
};

export const updateUserRecord = async (id, { name, email, mobileNumber, role, city }, existingUser) => {
    return await prisma.user.update({
        where: { id },
        data: {
            name: name !== undefined ? (name?.trim() || null) : existingUser.name,
            email: email !== undefined ? sanitizeEmail(email) : existingUser.email,
            mobileNumber: mobileNumber !== undefined ? sanitizeMobile(mobileNumber) : existingUser.mobileNumber,
            role: role !== undefined ? role : existingUser.role,
            city: city !== undefined ? (city?.trim() || null) : existingUser.city,
        },
    });
};

export const getAllUsersWithMeta = async ({ search, limit, page }) => {
    const where = search
        ? {
            OR: [
                { name: { contains: search } },
                { email: { contains: search } },
                { mobileNumber: { contains: search } },
                { city: { contains: search } },
            ],
        }
        : {};

    const parsedLimit = limit ? parseInt(limit) : 10;
    const parsedPage = page ? parseInt(page) : 1;

    const [users, totalUsers] = await Promise.all([
        prisma.user.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: parsedLimit,
            skip: (parsedPage - 1) * parsedLimit,
            select: {
                id: true, name: true, email: true,
                mobileNumber: true, role: true, city: true,
                createdAt: true, updatedAt: true,
            },
        }),
        prisma.user.count({ where }),
    ]);

    return {
        users,
        meta: {
            totalUsers,
            currentPage: parsedPage,
            totalPages: Math.ceil(totalUsers / parsedLimit),
            pageSize: parsedLimit,
        },
    };
};
export const isNameTaken = async (name, excludeId = null) => {
    if (!name || name.trim() === "") return false;

    const where = { name: name.trim() };
    if (excludeId) where.id = { not: excludeId };

    const exists = await prisma.user.findFirst({ where });
    return !!exists;
};