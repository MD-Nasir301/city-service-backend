import z from "zod";

const UpdateProfileZodSchema = z.object({
	name: z.string().optional(),
	phoneNumber: z.string().optional(),
});

export const UserValidation = {
	UpdateProfileZodSchema,
};
