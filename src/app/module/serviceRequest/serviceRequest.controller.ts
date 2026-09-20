import type { Request, Response } from "express";
import type { Role } from "../../../generated/prisma/enums";
import { catchAsync } from "../../utils/catchAsync";
import { uploadToCloudinary } from "../../utils/cloudinary";
import { sendResponse } from "../../utils/sendResponse";
import { ServiceRequestService } from "./serviceRequest.service";

const createServiceRequest = catchAsync(
	async (req: Request, res: Response) => {
		const userId = req.user?.userId as string;

		const payload =
			typeof req.body.data === "string" ? JSON.parse(req.body.data) : req.body;

		const imageUrls: string[] = [];
		const imagePublicIds: string[] = [];

		if (req.files && Array.isArray(req.files) && req.files.length > 0) {
			for (const file of req.files as Express.Multer.File[]) {
				const uploadResult = await uploadToCloudinary(
					file,
					"city_complaints_requests",
				);
				imageUrls.push(uploadResult.secure_url);
				imagePublicIds.push(uploadResult.public_id); 
			}
		}

		const result = await ServiceRequestService.createServiceRequest(userId, {
			...payload,
			images: imageUrls,
			imagePublicIds: imagePublicIds,
		});

		res.status(201).json({
			success: true,
			statusCode: 201,
			message: "Service request created successfully",
			data: result,
		});
	},
);

const getAllServiceRequests = catchAsync(
	async (req: Request, res: Response) => {
		const user = req.user as { userId: string; role: Role };
		const result = await ServiceRequestService.getAllServiceRequests(
			req.query,
			user,
		);

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

const deleteServiceRequest = catchAsync(async (req: Request, res: Response) => {
	const { id } = req.params;
	const user = req.user as { userId: string; role: Role };

	const result = await ServiceRequestService.deleteServiceRequest(
		id as string,
		user,
	);

	sendResponse(res, {
		statusCode: 200,
		success: true,
		message: "Service request deleted successfully",
		data: result,
	});
});

 const updateServiceRequest = catchAsync(
	async (req: Request, res: Response) => {
		const { id } = req.params;
		const userId = req.user?.userId;

		const payload =
			typeof req.body.data === "string"
				? JSON.parse(req.body.data)
				: { ...req.body };

		if (payload.latitude !== undefined && payload.latitude !== "") {
			payload.latitude = parseFloat(payload.latitude);
		}
		if (payload.longitude !== undefined && payload.longitude !== "") {
			payload.longitude = parseFloat(payload.longitude);
		}
		if (payload.quantity !== undefined && payload.quantity !== "") {
			payload.quantity = parseInt(payload.quantity, 10);
		}
		const imageUrls: string[] = [];
		const imagePublicIds: string[] = [];

		if (req.files && Array.isArray(req.files) && req.files.length > 0) {
			for (const file of req.files as Express.Multer.File[]) {
				const uploadResult = await uploadToCloudinary(
					file,
					"city_complaints_requests",
				);
				imageUrls.push(uploadResult.secure_url);
				imagePublicIds.push(uploadResult.public_id);
			}

			payload.images = imageUrls;
			payload.imagePublicIds = imagePublicIds;
		}
		const result = await ServiceRequestService.updateServiceRequest(
			id as string,
			userId as string,
			payload,
		);

		sendResponse(res, {
			statusCode: 200,
			success: true,
			message: "Service request updated successfully",
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
	deleteServiceRequest,
	updateServiceRequest,
};
