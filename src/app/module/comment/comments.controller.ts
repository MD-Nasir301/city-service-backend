
import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { CommentService } from "./comments.service";



const createComment = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const userRole = req.user?.role

  const result = await CommentService.createComment(
    userId as string,
    userRole as string,
    req.body
  );

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Comment added successfully",
    data: result,
  });
});

export const CommentController = {
  createComment,
};