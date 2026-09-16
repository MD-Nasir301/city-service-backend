import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { UserService } from "./users.service";

const getMe = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;

  const result = await UserService.getMe(userId as string);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User profile fetched successfully",
    data: result,
  });
});

export const UserController = {
  getMe,
};
