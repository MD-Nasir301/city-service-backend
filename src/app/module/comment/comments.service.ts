
import { Role } from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import AppError from "../../utils/appError";
import { ICreateCommentInput } from "./comments.interface";


const createComment = async (
  userId: string,
  userRole: string,
  payload: ICreateCommentInput
) => {
  // 1. Check if ServiceRequest exists
  const serviceRequest = await prisma.serviceRequest.findFirst({
    where: { id: payload.serviceRequestId, isDeleted: false },
  });

  if (!serviceRequest) {
    throw new AppError(404, "Service request not found.");
  }

  // 2. CITIZEN Check
  if (userRole === Role.CITIZEN && serviceRequest.citizenId !== userId) {
    throw new AppError(403, "You can only comment on your own service requests.");
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

export const CommentService = {
  createComment,
};