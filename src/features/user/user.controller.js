import { prisma } from "../../lib/prisma.js";
import { internalError, ok } from "../../utils/response.js";


export const createUser = async (req, res) => {
  try {
    const { name, email, mobileNumber, role, city } = req.body;
    const user = await prisma.user.create({
      data: {
        name,
        email,
        mobileNumber,
        role,
        city,
      },
    });
    ok(res, user, 201);
  } catch (error) {
    internalError(res, "Failed to create user");
  }
};

export const getAllUsers = async (req, res) => {
  try {
    // fetch all users with navigation properties
    const { search, limit, page } = req.query;

    const where = search
      ? {
          OR: [
            { name: { contains: search, } },
            { email: { contains: search, } },
            { mobileNumber: { contains: search, } },
            { city: { contains: search, } },
          ],
        }
      : {};

    const parsedLimit = limit ? parseInt(limit) : 10;
    const parsedPage = page ? parseInt(page) : 1;

    const [users, totalUsers] = await Promise.all([
      prisma.user.findMany({
        where,
        take: parsedLimit,
        skip: (parsedPage - 1) * parsedLimit,
        select: {
          id: true,
          name: true,
          mobileNumber: true,
          role: true,
          city: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    const totalPages = Math.ceil(totalUsers / parsedLimit);

    ok(res, {
      users,
      meta: {
        totalUsers,
        currentPage: parsedPage,
        totalPages,
        pageSize: parsedLimit,
      },
    }, 200);


  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

