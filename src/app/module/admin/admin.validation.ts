import z from "zod";
import { Role } from "../../../generated/prisma/enums";
import { UserStatus } from "../../../generated/prisma/enums";

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

export const AdminValidation = {
  UpdateUserStatusZodSchema,
  updateUserRoleZodSchema,
};
