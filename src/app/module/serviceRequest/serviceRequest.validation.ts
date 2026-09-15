import z from "zod";
import { Priority, RequestStatus } from "../../../generated/prisma/enums";

const CreateServiceRequestZodSchema = z.object({
  categoryId: z.string({
    message: "Category ID is required.",
  }),
  title: z
    .string({
      message: "Title must be a string.",
    })
    .min(5, { message: "Title must be at least 5 characters long." }),
  description: z
    .string({
      message: "Description must be a string.",
    })
    .min(10, { message: "Description must be at least 10 characters long." }),
  address: z.string({
    message: "Address is required.",
  }),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  images: z.array(z.string()).optional(),
  priority: z
    .enum([Priority.LOW, Priority.MEDIUM, Priority.HIGH, Priority.URGENT])
    .optional(),
  quantity: z
    .number()
    .min(1, { message: "Quantity must be at least 1." })
    .optional(),
});

const AssignStaffZodSchema = z.object({
  assignedStaffId: z.string({
    message: "Assigned Staff ID is required.",
  }),
});

const UpdateStatusZodSchema = z.object({
  status: z.enum(
    [
      RequestStatus.PENDING,
      RequestStatus.IN_PROGRESS,
      RequestStatus.RESOLVED,
      RequestStatus.CANCELLED,
      RequestStatus.REJECTED,
    ],
    {
      message: "Valid request status is required.",
    },
  ),
});

export const ServiceRequestValidation = {
  CreateServiceRequestZodSchema,
  AssignStaffZodSchema,
  UpdateStatusZodSchema,
};
