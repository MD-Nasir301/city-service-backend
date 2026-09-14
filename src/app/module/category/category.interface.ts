import { CategoryType } from "../../../generated/prisma/enums";

export interface ICategoryFilterRequest {
  search?: string;
  type?: CategoryType
  page?: number;
  limit?: number;
}