import type { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { StaffService } from "./staff.service";

const getStaffDashboardStats = catchAsync(
	async (req: Request, res: Response) => {
		const staffId = req.user?.userId;

		const result = await StaffService.getStaffDashboardStats(staffId as string);

		sendResponse(res, {
			statusCode: 200,
			success: true,
			message: "Staff dashboard stats retrieved successfully",
			data: result,
		});
	},
);

export const StaffController = {
	getStaffDashboardStats,
};
