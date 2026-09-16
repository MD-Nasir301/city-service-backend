import { Role } from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import AppError from "../../utils/appError";
import { ICreateCommentInput } from "./comments.interface";

const createComment = async (
  userId: string,
  userRole: string,
  payload: ICreateCommentInput,
) => {
  // 1. Check if ServiceRequest exists
  const serviceRequest = await prisma.serviceRequest.findFirst({
    where: { id: payload.serviceRequestId, isDeleted: false },
    include: {
      category: {
        select: {
          type: true,
        },
      },
    },
  });

  if (!serviceRequest) {
    throw new AppError(404, "Service request not found.");
  }

  // 2. CITIZEN Check
  if (
    userRole === Role.CITIZEN &&
    serviceRequest.category.type === "PAID" &&
    serviceRequest.citizenId !== userId
  ) {
    throw new AppError(
      403,
      "This is a paid service request. You can only comment on your own requests.",
    );
  }

  // 3. Internal Comment Restriction
  let isInternalNote = payload.isInternal || false;
  if (userRole === Role.CITIZEN) {
    isInternalNote = false;
  }

  // 4. Create Comment
  const result = await prisma.comment.create({
    data: {
      text: payload.text,
      isInternal: isInternalNote,
      serviceRequestId: payload.serviceRequestId,
      userId: userId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          role: true,
          imageUrl: true,
        },
      },
    },
  });

  return result;
};

const getCommentsByServiceRequestId = async (
  serviceRequestId: string,
  userRole: string,
) => {
  const serviceRequest = await prisma.serviceRequest.findFirst({
    where: { id: serviceRequestId, isDeleted: false },
  });

  if (!serviceRequest) {
    throw new AppError(404, "Service request not found.");
  }

  //Filter condition
  const whereCondition: any = {
    serviceRequestId: serviceRequestId,
  };

  if (userRole === Role.CITIZEN) {
    whereCondition.isInternal = false;
  }

  // Fetch Comments
  const result = await prisma.comment.findMany({
    where: whereCondition,
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      text: true,
      isInternal: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          id: true,
          name: true,
          role: true,
          imageUrl: true,
        },
      },
    },
  });

  return result;
};

export const CommentService = {
  createComment,
  getCommentsByServiceRequestId,
};
