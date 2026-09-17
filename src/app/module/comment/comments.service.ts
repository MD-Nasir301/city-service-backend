import { Role } from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import AppError from "../../utils/appError";
import { ICreateCommentInput, IUpdateCommentInput } from "./comments.interface";

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

const deleteComment = async (
  commentId: string,
  userId: string,
  userRole: string,
) => {
 
  const isCommentExist = await prisma.comment.findUnique({
    where: { id: commentId },
  });

  if (!isCommentExist) {
    throw new AppError(404, "Comment not found.");
  }

  const isAdmin = userRole === Role.ADMIN || userRole === Role.SUPER_ADMIN;
  const isOwner = isCommentExist.userId === userId;

  if (!isAdmin && !isOwner) {
    throw new AppError(403, "You can only delete your own comments.");
  }

  
  const result = await prisma.comment.delete({
    where: { id: commentId },
  });

  return result;
};


export const updateComment = async (
  commentId: string,
  userId: string,
  userRole: string,
  payload: IUpdateCommentInput
) => {

  const isCommentExist = await prisma.comment.findUnique({
    where: { id: commentId },
  });

  if (!isCommentExist) {
    throw new AppError(404, "Comment not found.");
  }

  const isOwner = isCommentExist.userId === userId;

  if (!isOwner) {
    throw new AppError(403, "You can only update your own comments.");
  }

  let isInternalNote = payload.isInternal;
  if (userRole === Role.CITIZEN) {
    isInternalNote = false;
  }

  const result = await prisma.comment.update({
    where: { id: commentId },
    data: {
      text: payload.text,
      isInternal: isInternalNote,
    },
    select: {
      id: true,
      text: true,
      isInternal: true,
      updatedAt: true,
    },
  });

  return result;
};
export const CommentService = {
  createComment,
  getCommentsByServiceRequestId,
  deleteComment,
  updateComment,
};

