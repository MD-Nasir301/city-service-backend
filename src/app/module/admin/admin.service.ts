
import { prisma } from "../../lib/prisma";
import { IUserFilterables } from "./admin.interface";


const getAllUsers = async (filters: IUserFilterables) => {
  const { search, role, status, page = "1", limit = "10", sortBy = "createdAt", sortOrder = "desc" } = filters;

  const pageNum = Number(page);
  const limitNum = Number(limit);
  const skip = (pageNum - 1) * limitNum;

  const andConditions: any[] = [{ isDeleted: false }];

  // Search Logic
  if (search) {
    andConditions.push({
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phoneNumber: { contains: search, mode: "insensitive" } },
      ],
    });
  }

  // Role Filter
  if (role) {
    andConditions.push({ role });
  }

  // Status Filter
  if (status) {
    andConditions.push({ status });
  }

  const whereConditions = andConditions.length > 0 ? { AND: andConditions } : {};

  // Database Queries
  const result = await prisma.user.findMany({
    where: whereConditions,
    skip,
    take: limitNum,
    orderBy: {
      [sortBy]: sortOrder,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
      role: true,
      status: true,
      imageUrl: true,
      createdAt: true,
    },
  });

  const total = await prisma.user.count({
    where: whereConditions,
  });

  return {
    meta: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
    data: result,
  };
};

export const AdminService = {
  getAllUsers,
};