import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { ServiceRequestService } from "./serviceRequest.service";
import { Role } from "../../../generated/prisma/enums";

const createServiceRequest = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const result = await ServiceRequestService.createServiceRequest(
    userId as string,
    req.body,
  );

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Service request submitted successfully",
    data: result,
  });
});

const getAllServiceRequests = catchAsync(
  async (req: Request, res: Response) => {
    const result = await ServiceRequestService.getAllServiceRequests(req.query);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Service requests fetched successfully",
      meta: result.meta,
      data: result.data,
    });
  },
);

const getMyServiceRequests = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const result = await ServiceRequestService.getMyServiceRequests(
    userId as string,
    req.query,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "My service requests fetched successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getMyAssignedRequests = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const result = await ServiceRequestService.getMyAssignedRequests(
      userId as string,
      req.query,
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Assigned service requests fetched successfully",
      meta: result.meta,
      data: result.data,
    });
  },
);

const getSingleServiceRequest = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = req.user;

    const result = await ServiceRequestService.getSingleServiceRequest(
      id as string,
      user as { userId: string; role: Role },
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Service request fetched successfully",
      data: result,
    });
  },
);

const assignStaff = catchAsync(async (req: Request, res: Response) => {
  const { serviceRequestId } = req.params;
  const adminId = req.user?.userId;
  const result = await ServiceRequestService.assignStaff(
    serviceRequestId as string,
    adminId as string,
    req.body,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Staff assigned successfully",
    data: result,
  });
});

const updateServiceRequestStatus = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = req.user as { userId: string; role: Role };

    const result = await ServiceRequestService.updateServiceRequestStatus(
      id as string,
      user,
      req.body,
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Service request status updated successfully",
      data: result,
    });
  },
);

export const ServiceRequestController = {
  createServiceRequest,
  getAllServiceRequests,
  getMyServiceRequests,
  getMyAssignedRequests,
  getSingleServiceRequest,
  assignStaff,
  updateServiceRequestStatus,
};
