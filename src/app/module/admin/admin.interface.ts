import { AuditAction, Department, Role, UserStatus } from "../../../generated/prisma/enums";

export interface IUserFilterables {
  search?: string;
  role?: Role;
  status?: UserStatus;
  page?: string;
  limit?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}


export interface IAdminDashboardStats {
  users: {
    totalUsers: number;
    totalCitizens: number;
    totalStaff: number;
    totalAdmins: number;
    totalSupperAdmins: number;
  };
  serviceRequests: {
    totalRequests: number;
    pendingRequests: number;
    inProgressRequests: number;
    resolvedRequests: number;
    cancelledRequests: number;
    rejectedRequests: number;
  };
  categories: {
    totalCategories: number;
  };
}

export interface IAuditLogFilterables {
  search?: string;
  action?: AuditAction
  entityName?: string;
  performedById?: string;
  page?: string;
  limit?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface ICreateStaffInput {
  name: string;
  email: string;
  phoneNumber?: string;
  department: Department;
  designation?: string;
  qualification?: string;
}