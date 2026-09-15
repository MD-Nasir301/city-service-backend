
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

export const ServiceRequestController = {
  createServiceRequest,
};