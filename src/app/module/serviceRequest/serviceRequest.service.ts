import type { Prisma } from "../../../generated/prisma/client";
import {
	AuditAction,
	CategoryType,
	EntityName,
	RequestStatus,
	Role,
} from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import AppError from "../../utils/appError";
import { deleteFromCloudinary } from "../../utils/cloudinary";
import { createAuditLog } from "../../utils/createAuditLog";
import type {
	ICreateServiceRequestInput,
	IMyAssignedFilterParams,
	IMyServiceRequestFilterParams,
	IServiceRequestFilterParams,
} from "./serviceRequest.interface";

const createServiceRequest = async (
	userId: string,
	payload: ICreateServiceRequestInput,
) => {
	const category = await prisma.category.findFirst({
		where: { id: payload.categoryId, isDeleted: false, isActive: true },
	});

	if (!category) {
		throw new AppError(
			404,
			"Selected service category was not found or is inactive.",
		);
	}

	// Pricing Calculation Logic
	let calculatedAmount = 0;
	let quantity = 1;

	if (category.type === CategoryType.PAID) {
		quantity = payload.quantity || 1;
		const basePrice = Number(category.basePrice || 0);
		calculatedAmount = basePrice * quantity;
	}

	// Database Transaction (ServiceRequest + AuditLog)
	const result = await prisma.$transaction(async (tx) => {
		const newRequest = await tx.serviceRequest.create({
			data: {
				citizenId: userId,
				categoryId: payload.categoryId,
				title: payload.title,
				description: payload.description,
				address: payload.address,
				latitude: payload.latitude,
				longitude: payload.longitude,
				images: payload.images || [],
				priority: payload.priority,
				quantity: quantity,
				totalAmount: calculatedAmount,
				isPaid: category.type === CategoryType.FREE,
				status: RequestStatus.PENDING,
				preferredStartDate: payload.preferredStartDate
					? new Date(payload.preferredStartDate)
					: undefined,
				preferredEndDate: payload.preferredEndDate
					? new Date(payload.preferredEndDate)
					: undefined,
			},
		});

		// Create Audit Log
		await createAuditLog(tx, {
			action: AuditAction.CREATE,
			entityName: EntityName.SERVICE,
			entityId: newRequest.id,
			performedById: userId,
			details: {
				title: newRequest.title,
				categoryName: category.name,
				categoryType: category.type,
				totalAmount: calculatedAmount,
				preferredStartDate: newRequest.preferredStartDate,
				preferredEndDate: newRequest.preferredEndDate,
			},
		});

		return newRequest;
	});

	return result;
};

// Get All Service Requests (Filter, Search & Pagination)
const getAllServiceRequests = async (
	query: IServiceRequestFilterParams,
	user: { userId: string; role: Role },
) => {
	const {
		search,
		status,
		priority,
		type,
		categoryId,
		page = "1",
		limit = "10",
		sortBy = "createdAt",
		sortOrder = "desc",
	} = query;

	const pageNum = Number(page);
	const limitNum = Number(limit);
	const skip = (pageNum - 1) * limitNum;

	const andConditions: Prisma.ServiceRequestWhereInput[] = [
		{ isDeleted: false },
	];

	if (user.role === Role.CITIZEN) {
		andConditions.push({
			OR: [{ category: { type: "FREE" } }, { citizenId: user.userId }],
		});
	} else if (user.role === Role.STAFF) {
		andConditions.push({
			OR: [{ category: { type: "FREE" } }, { assignedStaffId: user.userId }],
		});
	}

	// Search Condition
	if (search) {
		andConditions.push({
			OR: [
				{ title: { contains: search, mode: "insensitive" } },
				{ description: { contains: search, mode: "insensitive" } },
				{ address: { contains: search, mode: "insensitive" } },
			],
		});
	}

	if (status) andConditions.push({ status });
	if (priority) andConditions.push({ priority });
	if (type) {
		andConditions.push({
			category: {
				type: type,
			},
		});
	}
	if (categoryId) andConditions.push({ categoryId });

	const whereConditions: Prisma.ServiceRequestWhereInput =
		andConditions.length > 0 ? { AND: andConditions } : {};

	const result = await prisma.serviceRequest.findMany({
		where: whereConditions,
		skip,
		take: limitNum,
		orderBy: {
			[sortBy]: sortOrder,
		},
		include: {
			category: {
				select: { id: true, name: true, type: true },
			},
			citizen: {
				select: { id: true, name: true, email: true },
			},
			assignedStaff: {
				select: { id: true, name: true },
			},
			comments: {
				select: { id: true, text: true },
			},
		},
	});

	const total = await prisma.serviceRequest.count({
		where: whereConditions,
	});

	return {
		meta: {
			page: pageNum,
			limit: limitNum,
			total,
			totalPages: Math.ceil(total / limitNum),
		},
		data: result,
	};
};

// Get My Requests (Citizen, Admin, Supper Admin)
const getMyServiceRequests = async (
	userId: string,
	filters: IMyServiceRequestFilterParams,
) => {
	const { search, status, priority, type, page = "1", limit = "10" } = filters;

	const pageNum = Number(page);
	const limitNum = Number(limit);
	const skip = (pageNum - 1) * limitNum;

	const andConditions: Prisma.ServiceRequestWhereInput[] = [
		{ citizenId: userId },
		// { isDeleted: false },
	];

	if (search) {
		andConditions.push({
			OR: [
				{ title: { contains: search, mode: "insensitive" } },
				{ description: { contains: search, mode: "insensitive" } },
			],
		});
	}

	if (status) andConditions.push({ status });
	if (priority) andConditions.push({ priority });
	if (type) {
		andConditions.push({
			category: {
				type: type,
			},
		});
	}

	const whereConditions: Prisma.ServiceRequestWhereInput =
		andConditions.length > 0 ? { AND: andConditions } : {};

	const result = await prisma.serviceRequest.findMany({
		where: whereConditions,
		skip,
		take: limitNum,
		orderBy: {
			createdAt: "desc",
		},
		include: {
			category: {
				select: { id: true, name: true, type: true },
			},
			payment: {
				select: { id: true, amount: true, status: true },
			},
		},
	});

	const total = await prisma.serviceRequest.count({
		where: whereConditions,
	});

	return {
		meta: {
			page: pageNum,
			limit: limitNum,
			total,
			totalPages: Math.ceil(total / limitNum),
		},
		data: result,
	};
};

// Get My Assigned Requests (Staff)
const getMyAssignedRequests = async (
	staffId: string,
	filters: IMyAssignedFilterParams,
) => {
	const { search, status, priority, type, page = "1", limit = "10" } = filters;

	const pageNum = Number(page);
	const limitNum = Number(limit);
	const skip = (pageNum - 1) * limitNum;

	const andConditions: Prisma.ServiceRequestWhereInput[] = [];

	// Always check assignedStaffId & isDeleted
	andConditions.push({
		assignedStaffId: staffId,
		isDeleted: false,
	});

	// Search Condition (title, description, address)
	if (search) {
		andConditions.push({
			OR: [
				{ title: { contains: search, mode: "insensitive" } },
				{ description: { contains: search, mode: "insensitive" } },
				{ address: { contains: search, mode: "insensitive" } },
			],
		});
	}

	// Exact Filter Conditions
	if (status) andConditions.push({ status });
	if (priority) andConditions.push({ priority });

	// Filter by Category Type (PAID / FREE) via relation
	if (type) {
		andConditions.push({
			category: {
				type: type,
			},
		});
	}

	const whereConditions: Prisma.ServiceRequestWhereInput = {
		AND: andConditions,
	};

	const result = await prisma.serviceRequest.findMany({
		where: whereConditions,
		skip,
		take: limitNum,
		orderBy: {
			createdAt: "desc",
		},
		include: {
			category: {
				select: { id: true, name: true, type: true },
			},
			citizen: {
				select: { id: true, name: true, email: true, phoneNumber: true },
			},
		},
	});

	const total = await prisma.serviceRequest.count({
		where: whereConditions,
	});

	return {
		meta: {
			page: pageNum,
			limit: limitNum,
			total,
			totalPages: Math.ceil(total / limitNum),
		},
		data: result,
	};
};

// Get Single Service Request Details
const getSingleServiceRequest = async (
	id: string,
	user: { userId: string; role: Role },
) => {
	const result = await prisma.serviceRequest.findFirst({
		where: {
			id,
			isDeleted: false,
		},
		include: {
			category: {
				select: { id: true, name: true, type: true, description: true },
			},
			citizen: {
				select: { id: true, name: true, email: true, phoneNumber: true },
			},
			assignedStaff: {
				select: { id: true, name: true, email: true, phoneNumber: true },
			},
			comments: {
				select: { id: true, text: true, isInternal: true, createdAt: true },
			},
			payment: true,
		},
	});

	if (!result) {
		throw new AppError(404, "Service request not found");
	}

	if (user.role === Role.CITIZEN && result.citizenId !== user.userId) {
		throw new AppError(403, "You are not authorized to view this request");
	}

	if (user.role === Role.STAFF && result.assignedStaffId !== user.userId) {
		throw new AppError(403, "You are not assigned to this request");
	}

	return result;
};

const assignStaff = async (
	serviceRequestId: string,
	adminId: string,
	payload: { assignedStaffId: string },
) => {
	const serviceRequest = await prisma.serviceRequest.findFirst({
		where: { id: serviceRequestId, isDeleted: false },
	});

	if (!serviceRequest) {
		throw new AppError(404, "Service request not found.");
	}

	const staff = await prisma.user.findFirst({
		where: { id: payload.assignedStaffId, role: Role.STAFF, isDeleted: false },
	});

	if (!staff) {
		throw new AppError(404, "Target user not found or is not a staff.");
	}

	//Database Transaction (Update + AuditLog)
	const result = await prisma.$transaction(async (tx) => {
		const updatedRequest = await tx.serviceRequest.update({
			where: { id: serviceRequestId },
			data: {
				assignedStaffId: payload.assignedStaffId,
				status: RequestStatus.ASSIGNED,
			},
		});

		if (adminId) {
			await createAuditLog(tx, {
				action: AuditAction.ASSIGNMENT,
				entityName: EntityName.STAFF,
				entityId: updatedRequest.id,
				performedById: adminId,
				details: {
					actionType: "ASSIGN_STAFF",
					assignedStaffId: payload.assignedStaffId,
					assignedStaffName: staff.name,
					previousStatus: serviceRequest.status,
					newStatus: RequestStatus.ASSIGNED,
				},
			});
		}

		return updatedRequest;
	});

	return result;
};

const updateServiceRequestStatus = async (
	id: string,
	user: { userId: string; role: Role },
	payload: { status: RequestStatus },
) => {
	const serviceRequest = await prisma.serviceRequest.findFirst({
		where: { id, isDeleted: false },
	});

	if (!serviceRequest) {
		throw new AppError(404, "Service request not found.");
	}

	if (
		user.role === Role.STAFF &&
		serviceRequest.assignedStaffId !== user.userId
	) {
		throw new AppError(
			403,
			"You can only update status for requests assigned to you.",
		);
	}

	if (user.role === Role.STAFF) {
		// Check A: ASSIGNED
		if (serviceRequest.status === RequestStatus.ASSIGNED) {
			if (
				payload.status !== RequestStatus.ACCEPTED &&
				payload.status !== RequestStatus.REJECTED
			) {
				throw new AppError(
					400,
					"You can only ACCEPT or REJECT an assigned request.",
				);
			}
		}
		// Check B: ACCEPTED
		if (serviceRequest.status === RequestStatus.ACCEPTED) {
			if (
				payload.status !== RequestStatus.IN_PROGRESS &&
				payload.status !== RequestStatus.REJECTED
			) {
				throw new AppError(
					400,
					"Request is already accepted. Next status must be IN_PROGRESS.",
				);
			}
		}
		// Check C: IN_PROGRESS
		if (serviceRequest.status === RequestStatus.IN_PROGRESS) {
			if (payload.status !== RequestStatus.RESOLVED) {
				throw new AppError(
					400,
					"An in-progress request can only be marked as RESOLVED.",
				);
			}
		}
	}

	// Transaction (Update Status + Staff Availability + Audit Log)
	const result = await prisma.$transaction(async (tx) => {
		const updatedRequest = await tx.serviceRequest.update({
			where: { id },
			data: {
				status: payload.status,
			},
		});

		if (updatedRequest.assignedStaffId) {
			if (payload.status === RequestStatus.IN_PROGRESS) {
				await tx.staffProfile.update({
					where: { userId: updatedRequest.assignedStaffId },
					data: { isAvailable: false },
				});
			}
			if (
				payload.status === RequestStatus.RESOLVED ||
				payload.status === RequestStatus.CANCELLED ||
				payload.status === RequestStatus.REJECTED
			) {
				await tx.staffProfile.update({
					where: { userId: updatedRequest.assignedStaffId },
					data: { isAvailable: true },
				});
			}
		}

		await createAuditLog(tx, {
			action: AuditAction.STATUS_CHANGE,
			entityName: EntityName.SERVICE,
			entityId: updatedRequest.id,
			performedById: user.userId,
			details: {
				actionType: "UPDATE_SERVICE_STATUS",
				previousStatus: serviceRequest.status,
				newStatus: payload.status,
				updatedByRole: user.role,
			},
		});

		return updatedRequest;
	});

	return result;
};

const deleteServiceRequest = async (
	id: string,
	user: { userId: string; role: Role },
) => {
	const serviceRequest = await prisma.serviceRequest.findFirst({
		where: { id, isDeleted: false },
	});

	if (!serviceRequest) {
		throw new AppError(404, "Service request not found.");
	}

	if (user.role === Role.CITIZEN) {
		if (serviceRequest.citizenId !== user.userId) {
			throw new AppError(403, "You can only delete your own service request.");
		}

		if (serviceRequest.status !== RequestStatus.PENDING) {
			throw new AppError(
				400,
				"Cannot delete service request once processing has started.",
			);
		}
	}

	// Transaction (Soft Delete + AuditLog)
	const result = await prisma.$transaction(async (tx) => {
		const deletedRequest = await tx.serviceRequest.update({
			where: { id },
			data: {
				isDeleted: true,
			},
		});

		await createAuditLog(tx, {
			action: AuditAction.DELETE,
			entityName: EntityName.SERVICE,
			entityId: deletedRequest.id,
			performedById: user.userId,
			details: {
				actionType: "SOFT_DELETE",
				title: serviceRequest.title,
				statusAtDeletion: serviceRequest.status,
			},
		});

		return deletedRequest;
	});

	return result;
};

 const updateServiceRequest = async (
	id: string,
	userId: string,
	payload: Partial<ICreateServiceRequestInput> & {
		images?: string[];
		imagePublicIds?: string[];
	},
) => {
	const serviceRequest = await prisma.serviceRequest.findFirst({
		where: { id, isDeleted: false },
	});

	if (!serviceRequest) {
		throw new AppError(404, "Service request not found.");
	}

	if (serviceRequest.citizenId !== userId) {
		throw new AppError(403, "You can only update your own service request.");
	}

	if (serviceRequest.status !== RequestStatus.PENDING) {
		throw new AppError(
			400,
			"Cannot update service request once processing has started.",
		);
	}

	if (payload.imagePublicIds && payload.imagePublicIds.length > 0) {
		if (
			serviceRequest.imagePublicIds &&
			serviceRequest.imagePublicIds.length > 0
		) {
			for (const publicId of serviceRequest.imagePublicIds) {
				await deleteFromCloudinary(publicId);
			}
		}
	}

	const result = await prisma.$transaction(async (tx) => {
		const updated = await tx.serviceRequest.update({
			where: { id },
			data: payload,
		});

		await createAuditLog(tx, {
			action: AuditAction.UPDATE,
			entityName: EntityName.SERVICE,
			entityId: updated.id,
			performedById: userId,
			details: {
				actionType: "UPDATE_REQUEST_DETAILS",
				updatedFields: Object.keys(payload),
			},
		});

		return updated;
	});

	return result;
};

export const ServiceRequestService = {
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
