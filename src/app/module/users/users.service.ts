import { prisma } from "../../lib/prisma";
import AppError from "../../utils/appError";
import {
	deleteFromCloudinary,
	uploadToCloudinary,
} from "../../utils/cloudinary";
import type { IUpdateProfileInput } from "./users.interface";

// Get Own Profile Details
const getMe = async (userId: string) => {
	const user = await prisma.user.findFirst({
		where: {
			id: userId,
			isDeleted: false,
		},
		select: {
			id: true,
			name: true,
			email: true,
			phoneNumber: true,
			role: true,
			status: true,
			imageUrl: true,
			createdAt: true,
			updatedAt: true,
		},
	});

	if (!user) {
		throw new AppError(404, "User profile not found.");
	}
	return user;
};

// Update Profile Service
const updateMe = async (
	userId: string,
	payload: IUpdateProfileInput,
	file?: Express.Multer.File,
) => {
	// 1. Check user exists
	const user = await prisma.user.findFirst({
		where: { id: userId, isDeleted: false },
	});

	if (!user) {
		throw new AppError(404, "User profile not found.");
	}

	let imageUrl = user.imageUrl;
	let imagePublicId = user.imagePublicId;

	if (file) {
		// Delete old image if public_id exists
		if (user.imagePublicId) {
			await deleteFromCloudinary(user.imagePublicId);
		}

		// Upload new image
		const uploadResult = await uploadToCloudinary(file);
		imageUrl = uploadResult.secure_url;
		imagePublicId = uploadResult.public_id;
	}

	// Update Database Record
	const result = await prisma.user.update({
		where: { id: userId },
		data: {
			name: payload.name,
			phoneNumber: payload.phoneNumber,
			imageUrl,
			imagePublicId,
		},
		select: {
			id: true,
			name: true,
			email: true,
			phoneNumber: true,
			imageUrl: true,
			imagePublicId: true,
			role: true,
			status: true,
			updatedAt: true,
		},
	});

	return result;
};

export const UserService = {
	getMe,
	updateMe,
};
