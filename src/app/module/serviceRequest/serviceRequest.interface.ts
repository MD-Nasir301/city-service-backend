import { CategoryType, Priority, RequestStatus } from "../../../generated/prisma/enums";

export interface ICreateServiceRequestInput {
  categoryId: string;
  title: string;
  description: string;
  address: string;
  latitude?: number;
  longitude?: number;
  images?: string[];
  priority?: Priority;
  quantity?: number;
}

export interface IServiceRequestFilterParams {
  search?: string;
  status?: RequestStatus;
  priority?: Priority;
  type?: CategoryType;
  categoryId?: string;
  page?: string;
  limit?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}