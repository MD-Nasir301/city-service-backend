import z from "zod";
import { UserStatus } from "../../../generated/prisma/enums";

const UpdateUserStatusZodSchema = z.object({
  status: z.enum([UserStatus.ACTIVE, UserStatus.BLOCKED], {
    message: "Status must be either ACTIVE or BLOCKED",
  }),
});

export const AdminValidation = {
  UpdateUserStatusZodSchema,
};


