import type { Request, Response } from "express";
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

const updateMe = catchAsync(async (req: Request, res: Response) => {
	const userId = req.user?.userId;
	const file = req.file;

	const result = await UserService.updateMe(userId as string, req.body, file);

	sendResponse(res, {
		statusCode: 200,
		success: true,
		message: "User profile updated successfully",
		data: result,
	});
});

export const UserController = {
	getMe,
	updateMe,
};
