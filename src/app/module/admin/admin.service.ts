import { AuditAction, Role, UserStatus } from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import AppError from "../../utils/appError";
import { createAuditLog } from "../../utils/createAuditLog";
import { IUserFilterables } from "./admin.interface";

const getAllUsers = async (filters: IUserFilterables) => {
  const {
    search,
    role,
    status,
    page = "1",
    limit = "10",
    sortBy = "createdAt",
    sortOrder = "desc",
  } = filters;

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

  const whereConditions =
    andConditions.length > 0 ? { AND: andConditions } : {};

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

const updateUserStatus = async (
  targetUserId: string,
  adminId: string,
  adminRole: string,
  payload: { status: UserStatus },
) => {
  const targetUser = await prisma.user.findFirst({
    where: { id: targetUserId, isDeleted: false },
  });

  if (!targetUser || !adminId) {
    throw new AppError(404, "User not found.");
  }

  if (targetUserId === adminId) {
    throw new AppError(400, "You cannot update your own status.");
  }

  if (adminRole === Role.SUPER_ADMIN) {
    throw new AppError(403, "Super Admin status cannot be modified via API!");
  }

  if (adminRole === Role.ADMIN && targetUser.role === Role.ADMIN) {
    throw new AppError(403, "An Admin cannot block or modify another Admin!");
  }

  // 5. Transaction (Update Status + AuditLog)
  const result = await prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: { id: targetUserId },
      data: {
        status: payload.status,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    });

    await createAuditLog(tx, {
      action: AuditAction.UPDATE,
      entityName: "User",
      entityId: updatedUser.id,
      performedById: adminId,
      details: {
        actionType: "CHANGE_USER_STATUS",
        targetUserEmail: targetUser.email,
        previousStatus: targetUser.status,
        newStatus: payload.status,
      },
    });

    return updatedUser;
  });

  return result;
};

export const AdminService = {
  getAllUsers,
  updateUserStatus,
};
