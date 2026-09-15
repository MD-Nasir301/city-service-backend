
import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { ServiceRequestService } from "./serviceRequest.service";

const createServiceRequest = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const result = await ServiceRequestService.createServiceRequest(userId as string, req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Service request submitted successfully",
    data: result,
  });
});

const getAllServiceRequests = catchAsync(async (req: Request, res: Response) => {
  const result = await ServiceRequestService.getAllServiceRequests(req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Service requests fetched successfully",
    meta: result.meta,
    data: result.data,
  });
});

export const ServiceRequestController = {
  createServiceRequest,
  getAllServiceRequests,
};