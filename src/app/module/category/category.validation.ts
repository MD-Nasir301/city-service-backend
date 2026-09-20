import z from "zod";
import { CategoryType } from "../../../generated/prisma/enums";

const CreateCategoryZodSchema = z.object({
	name: z
		.string({
			message: "Category name must be a string.",
		})
		.min(3, { message: "Name must be at least 3 characters long." }),
	description: z.string().optional(),
	type: z.enum([CategoryType.FREE, CategoryType.PAID], {
		message: "Type must be either FREE or PAID.",
	}),
	unitName: z.string().optional().nullable(),
	basePrice: z
		.number()
		.min(0, { message: "Base price cannot be negative." })
		.default(0),
});

const UpdateCategoryZodSchema = z.object({
	name: z
		.string()
		.min(3, { message: "Name must be at least 3 characters long." })
		.optional(),
	description: z.string().optional(),
	type: z.enum([CategoryType.FREE, CategoryType.PAID]).optional(),
	unitName: z.string().optional().nullable(),
	basePrice: z
		.number()
		.min(0, { message: "Base price cannot be negative." })
		.optional(),
	isActive: z.boolean().optional(),
});

export const CategoryValidation = {
	CreateCategoryZodSchema,
	UpdateCategoryZodSchema,
};
