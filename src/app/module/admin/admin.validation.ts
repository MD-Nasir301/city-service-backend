import z from "zod";
import { Role } from "../../../generated/prisma/enums";
import { UserStatus } from "../../../generated/prisma/enums";
import { Department } from "../../../generated/prisma/enums";

const UpdateUserStatusZodSchema = z.object({
  status: z.enum([UserStatus.ACTIVE, UserStatus.BLOCKED], {
    message: "Status must be either ACTIVE or BLOCKED",
  }),
});

const updateUserRoleZodSchema = z.object({
  role: z.enum([Role.SUPER_ADMIN, Role.ADMIN, Role.CITIZEN, Role.STAFF], {
    message: "Invalid role provided.",
  }),
});

const createStaffZodSchema = z.object({
  name: z.string({ message: "Name is required." }),
  email: z
    .string({ message: "Email is required." })
    .email("Invalid email format."),
  phoneNumber: z.string().optional(),
  department: z.enum(
    [
      Department.ROAD_REPAIR,
      Department.DRAINAGE_AND_SEWERAGE,
      Department.WASTE_MANAGEMENT,
      Department.PARK_AND_TREE_TRIMMING,
      Department.STREET_LIGHTING,
    ],
    {
      message: "Valid department is required.",
    },
  ),
  designation: z.string().optional(),
  qualification: z.string().optional(),
});

export const AdminValidation = {
  UpdateUserStatusZodSchema,
  updateUserRoleZodSchema,
  createStaffZodSchema,
};
