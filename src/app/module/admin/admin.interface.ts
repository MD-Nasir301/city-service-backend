import { Role, UserStatus } from "../../../generated/prisma/enums";

export interface IUserFilterables {
  search?: string;
  role?: Role;
  status?: UserStatus;
  page?: string;
  limit?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
