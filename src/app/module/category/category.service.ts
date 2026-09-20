
import { AuditAction, EntityName } from "../../../generated/prisma";
import { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import AppError from "../../utils/appError";
import { createAuditLog } from "../../utils/createAuditLog";
import type { ICategoryFilterRequest } from "./category.interface";

// Create Category (with AuditLog)
const createCategory = async (
	payload: Prisma.CategoryCreateInput,
	adminId?: string,
) => {
	const isExist = await prisma.category.findUnique({
		where: { name: payload.name },
	});

	if (isExist) {
		throw new AppError(400, "Category with this name already exists!");
	}

	const result = await prisma.$transaction(async (tx) => {
		const newCategory = await tx.category.create({
			data: payload,
		});

		if (adminId) {
			await tx.auditLog.create({
				data: {
					action: AuditAction.CREATE,
					entityName: EntityName.CATEGORY,
					entityId: newCategory.id,
					performedById: adminId,
					details: { name: newCategory.name, type: newCategory.type },
				},
			});
		}

		return newCategory;
	});

	return result;
};

// Get All Categories
const getAllCategories = async (query: ICategoryFilterRequest) => {
	const { search, type, page = 1, limit = 10 } = query;
	const skip = (Number(page) - 1) * Number(limit);
	const take = Number(limit);

	const whereConditions: Prisma.CategoryWhereInput = {
		isDeleted: false,
	};

	if (search) {
		whereConditions.OR = [
			{ name: { contains: search, mode: "insensitive" } },
			{ description: { contains: search, mode: "insensitive" } },
		];
	}

	if (type) {
		whereConditions.type = type;
	}

	const [result, total] = await Promise.all([
		prisma.category.findMany({
			where: whereConditions,
			skip,
			take,
			orderBy: { createdAt: "desc" },
		}),
		prisma.category.count({ where: whereConditions }),
	]);

	return {
		meta: {
			page: Number(page),
			limit: Number(limit),
			total,
			totalPage: Math.ceil(total / Number(limit)),
		},
		data: result,
	};
};

// Get Single Category
const getSingleCategory = async (id: string) => {
	const result = await prisma.category.findFirst({
		where: {
			id,
			isDeleted: false,
		},
	});

	if (!result) {
		throw new AppError(404, "Category not found!");
	}

	return result;
};

// Update Category (with AuditLog)
const updateCategory = async (
	id: string,
	payload: Prisma.CategoryUpdateInput,
	adminId?: string,
) => {
	const category = await prisma.category.findFirst({
		where: { id, isDeleted: false },
	});

	if (!category) {
		throw new AppError(404, "Category not found or already deleted!");
	}

	if (payload.name && typeof payload.name === "string") {
		const isExist = await prisma.category.findFirst({
			where: {
				name: payload.name,
				isDeleted: false,
				id: { not: id },
			},
		});

		if (isExist) {
			throw new AppError(400, "Category with this name already exists!");
		}
	}

	const result = await prisma.$transaction(async (tx) => {
		const updatedCategory = await tx.category.update({
			where: { id },
			data: payload,
		});

		if (adminId) {
			await createAuditLog(tx, {
				action: AuditAction.UPDATE,
				entityName: EntityName.CATEGORY,
				entityId: updatedCategory.id,
				performedById: adminId,
				details: { oldData: category, newData: updatedCategory },
			});
		}

		return updatedCategory;
	});

	return result;
};

// Soft Delete Category (with AuditLog)
const deleteCategory = async (id: string, adminId?: string) => {
	const category = await prisma.category.findFirst({
		where: { id, isDeleted: false },
	});

	if (!category) {
		throw new AppError(404, "Category not found or already deleted!");
	}

	const result = await prisma.$transaction(async (tx) => {
		const deletedCategory = await tx.category.update({
			where: { id },
			data: {
				isDeleted: true,
				updatedAt: new Date(),
			},
		});

		if (adminId) {
			await createAuditLog(tx, {
				action: AuditAction.DELETE,
				entityName: EntityName.CATEGORY,
				entityId: deletedCategory.id,
				performedById: adminId,
				details: { name: deletedCategory.name },
			});
		}

		return deletedCategory;
	});

	return result;
};

export const CategoryService = {
	createCategory,
	getAllCategories,
	getSingleCategory,
	updateCategory,
	deleteCategory,
};
