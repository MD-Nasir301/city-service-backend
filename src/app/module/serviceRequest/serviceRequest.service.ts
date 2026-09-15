import { Prisma } from "../../../generated/prisma/client";
import {
  AuditAction,
  CategoryType,
  RequestStatus,
  Role,
} from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import AppError from "../../utils/appError";
import { createAuditLog } from "../../utils/createAuditLog";
import {
  ICreateServiceRequestInput,
  IMyAssignedFilterParams,
  IMyServiceRequestFilterParams,
  IServiceRequestFilterParams,
} from "./serviceRequest.interface";

const createServiceRequest = async (
  userId: string,
  payload: ICreateServiceRequestInput,
) => {
  // 1. Verify Category exists and is active
  const category = await prisma.category.findFirst({
    where: { id: payload.categoryId, isDeleted: false, isActive: true },
  });

  if (!category) {
    throw new AppError(
      404,
      "Selected service category was not found or is inactive.",
    );
  }

  // 2. Pricing Calculation Logic
  let calculatedAmount = 0;
  let quantity = 1;

  if (category.type === CategoryType.PAID) {
    quantity = payload.quantity || 1;
    const basePrice = Number(category.basePrice || 0);
    calculatedAmount = basePrice * quantity;
  }

  // 3. Database Transaction (ServiceRequest + AuditLog)
  const result = await prisma.$transaction(async (tx) => {
    const newRequest = await tx.serviceRequest.create({
      data: {
        citizenId: userId,
        categoryId: payload.categoryId,
        title: payload.title,
        description: payload.description,
        address: payload.address,
        latitude: payload.latitude,
        longitude: payload.longitude,
        images: payload.images || [],
        priority: payload.priority || "MEDIUM",
        quantity: quantity,
        totalAmount: calculatedAmount,
        isPaid: category.type === CategoryType.FREE,
        status: RequestStatus.PENDING,
      },
    });

    // Create Audit Log
    await createAuditLog(tx, {
      action: AuditAction.CREATE,
      entityName: "ServiceRequest",
      entityId: newRequest.id,
      performedById: userId,
      details: {
        title: newRequest.title,
        categoryName: category.name,
        categoryType: category.type,
        totalAmount: calculatedAmount,
      },
    });

    return newRequest;
  });

  return result;
};

// Get All Service Requests (Filter, Search & Pagination)
const getAllServiceRequests = async (query: IServiceRequestFilterParams) => {
  const {
    search,
    status,
    priority,
    type,
    categoryId,
    page = "1",
    limit = "10",
    sortBy = "createdAt",
    sortOrder = "desc",
  } = query;

  const pageNum = Number(page);
  const limitNum = Number(limit);
  const skip = (pageNum - 1) * limitNum;

  const andConditions: Prisma.ServiceRequestWhereInput[] = [];

  if (search) {
    andConditions.push({
      OR: [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { address: { contains: search, mode: "insensitive" } },
      ],
    });
  }

  if (status) andConditions.push({ status });
  if (priority) andConditions.push({ priority });
  if (type) {
    andConditions.push({
      category: {
        type: type,
      },
    });
  }
  if (categoryId) andConditions.push({ categoryId });

  const whereConditions: Prisma.ServiceRequestWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const result = await prisma.serviceRequest.findMany({
    where: whereConditions,
    skip,
    take: limitNum,
    orderBy: {
      [sortBy]: sortOrder,
    },
    include: {
      category: {
        select: { id: true, name: true, type: true },
      },
      citizen: {
        select: { id: true, name: true, email: true },
      },
      assignedStaff: {
        select: { id: true, name: true },
      },
    },
  });

  // Total count for metadata
  const total = await prisma.serviceRequest.count({
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

// Get My Requests (Citizen, Admin, Supper Admin)
const getMyServiceRequests = async (
  userId: string,
  filters: IMyServiceRequestFilterParams,
) => {
  const { search, status, priority, type, page = "1", limit = "10" } = filters;

  const pageNum = Number(page);
  const limitNum = Number(limit);
  const skip = (pageNum - 1) * limitNum;

  const andConditions: Prisma.ServiceRequestWhereInput[] = [
    { citizenId: userId },
    // { isDeleted: false },
  ];

  if (search) {
    andConditions.push({
      OR: [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ],
    });
  }

  if (status) andConditions.push({ status });
  if (priority) andConditions.push({ priority });
  if (type) {
    andConditions.push({
      category: {
        type: type,
      },
    });
  }

  const whereConditions: Prisma.ServiceRequestWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const result = await prisma.serviceRequest.findMany({
    where: whereConditions,
    skip,
    take: limitNum,
    orderBy: {
      createdAt: "desc",
    },
    include: {
      category: {
        select: { id: true, name: true, type: true },
      },
    },
  });

  const total = await prisma.serviceRequest.count({
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

// Get My Assigned Requests (Staff)
const getMyAssignedRequests = async (
  staffId: string,
  filters: IMyAssignedFilterParams,
) => {
  const { search, status, priority, type, page = "1", limit = "10" } = filters;

  const pageNum = Number(page);
  const limitNum = Number(limit);
  const skip = (pageNum - 1) * limitNum;

  const andConditions: Prisma.ServiceRequestWhereInput[] = [];

  // Always check assignedStaffId & isDeleted
  andConditions.push({
    assignedStaffId: staffId,
    isDeleted: false,
  });

  // Search Condition (title, description, address)
  if (search) {
    andConditions.push({
      OR: [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { address: { contains: search, mode: "insensitive" } },
      ],
    });
  }

  // Exact Filter Conditions
  if (status) andConditions.push({ status });
  if (priority) andConditions.push({ priority });

  // Filter by Category Type (PAID / FREE) via relation
  if (type) {
    andConditions.push({
      category: {
        type: type,
      },
    });
  }

  const whereConditions: Prisma.ServiceRequestWhereInput = {
    AND: andConditions,
  };

  const result = await prisma.serviceRequest.findMany({
    where: whereConditions,
    skip,
    take: limitNum,
    orderBy: {
      createdAt: "desc",
    },
    include: {
      category: {
        select: { id: true, name: true, type: true },
      },
      citizen: {
        select: { id: true, name: true, email: true, phoneNumber: true },
      },
    },
  });

  const total = await prisma.serviceRequest.count({
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

// Get Single Service Request Details
const getSingleServiceRequest = async (
  id: string,
  user: { userId: string; role: Role },
) => {
  const result = await prisma.serviceRequest.findFirst({
    where: {
      id,
      isDeleted: false,
    },
    include: {
      category: {
        select: { id: true, name: true, type: true, description: true },
      },
      citizen: {
        select: { id: true, name: true, email: true, phoneNumber: true },
      },
      assignedStaff: {
        select: { id: true, name: true, email: true, phoneNumber: true },
      },
      payment: true,
    },
  });

  if (!result) {
    throw new AppError(404, "Service request not found");
  }

  if (user.role === Role.CITIZEN && result.citizenId !== user.userId) {
    throw new AppError(403, "You are not authorized to view this request");
  }

  if (user.role === Role.STAFF && result.assignedStaffId !== user.userId) {
    throw new AppError(403, "You are not assigned to this request");
  }

  return result;
};

const assignStaff = async (
  serviceRequestId: string,
  adminId: string,
  payload: { assignedStaffId: string },
) => {
  const serviceRequest = await prisma.serviceRequest.findFirst({
    where: { id: serviceRequestId, isDeleted: false },
  });

  if (!serviceRequest) {
    throw new AppError(404, "Service request not found.");
  }

  const staff = await prisma.user.findFirst({
    where: { id: payload.assignedStaffId, role: Role.STAFF, isDeleted: false },
  });

  if (!staff) {
    throw new AppError(404, "Target user not found or is not a staff.");
  }

 
  //Database Transaction (Update + AuditLog)
  const result = await prisma.$transaction(async (tx) => {
    const updatedRequest = await tx.serviceRequest.update({
      where: { id : serviceRequestId },
      data: {
        assignedStaffId: payload.assignedStaffId,
        status: RequestStatus.IN_PROGRESS,
      },
    });

    if (adminId) {
      await createAuditLog(tx, {
        action: AuditAction.UPDATE,
        entityName: "ServiceRequest",
        entityId: updatedRequest.id,
        performedById: adminId,
        details: {
          actionType: "ASSIGN_STAFF",
          assignedStaffId: payload.assignedStaffId,
          assignedStaffName: staff.name,
          previousStatus: serviceRequest.status,
          newStatus: RequestStatus.IN_PROGRESS,
        },
      });
    }

    return updatedRequest;
  });

  return result;
};

export const ServiceRequestService = {
  createServiceRequest,
  getAllServiceRequests,
  getMyServiceRequests,
  getMyAssignedRequests,
  getSingleServiceRequest,
  assignStaff,
};
