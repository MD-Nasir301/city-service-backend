import {
  AuditAction,
  CategoryType,
  RequestStatus,
} from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import AppError from "../../utils/appError";
import { createAuditLog } from "../../utils/createAuditLog";
import { ICreateServiceRequestInput } from "./serviceRequest.interface";

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

export const ServiceRequestService = {
  createServiceRequest,
};
