import {
  CategoryType,
  Priority,
  RequestStatus,
} from "../../../generated/prisma/enums";

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
  preferredStartDate?: string | Date;
  preferredEndDate?: string | Date;
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

export interface IMyServiceRequestFilterParams {
  search?: string;
  status?: RequestStatus;
  priority?: Priority;
  type?: CategoryType;
  page?: string;
  limit?: string;
}

export interface IMyAssignedFilterParams {
  search?: string;
  status?: RequestStatus;
  priority?: Priority;
  type?: CategoryType;
  page?: string;
  limit?: string;
}
