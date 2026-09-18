import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { AdminService } from "./admin.service";
import { UserService } from "../users/users.service";

const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.getAllUsers(req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Users fetched successfully",
    meta: result.meta,
    data: result.data,
  });
});

const updateUserStatus = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const adminId = req.user?.userId;
  const adminRole = req.user?.role;

  const result = await AdminService.updateUserStatus(
    id as string,
    adminId as string,
    adminRole as string,
    req.body,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: `User status updated to ${req.body.status} successfully`,
    data: result,
  });
});

const updateUserRole = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { role } = req.body;
  const performerId = req.user?.userId;
  const performerRole = req.user?.role;

  const result = await AdminService.updateUserRole(
    id as string,
    role,
    performerId as string,
    performerRole as string,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User role updated successfully",
    data: result,
  });
});

const getAdminDashboardStats = catchAsync(
  async (req: Request, res: Response) => {
    const result = await AdminService.getAdminDashboardStats();

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Admin dashboard stats retrieved successfully",
      data: result,
    });
  },
);

const getAllAuditLogs = catchAsync(async (req: Request, res: Response) => {
  const filters = req.query;

  const result = await AdminService.getAllAuditLogs(filters);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Audit logs retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const createStaff = catchAsync(async (req: Request, res: Response) => {
  const adminId = req.user?.userId;
  const payload = req.body;

  const result = await AdminService.createStaff(payload, adminId as string);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Staff account created successfully and welcome email sent",
    data: result,
  });
});

export const AdminController = {
  getAllUsers,
  updateUserStatus,
  updateUserRole,
  getAdminDashboardStats,
  getAllAuditLogs,
  createStaff,
};
