import { email } from "zod";
import { RequestStatus } from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import type { IStaffDashboardStats } from "./staff.interface";

const getStaffDashboardStats = async (
  staffId: string,
): Promise<IStaffDashboardStats> => {
  const [
    totalAssignedRequests,
    inProgressRequests,
    resolvedRequests,
    cancelledRequests,
    rejectedRequests,
  ] = await Promise.all([
    prisma.serviceRequest.count({
      where: { assignedStaffId: staffId },
    }),
    prisma.serviceRequest.count({
      where: {
        assignedStaffId: staffId,
        status: RequestStatus.IN_PROGRESS,
      },
    }),
    prisma.serviceRequest.count({
      where: {
        assignedStaffId: staffId,
        status: RequestStatus.RESOLVED,
      },
    }),
    prisma.serviceRequest.count({
      where: {
        assignedStaffId: staffId,
        status: RequestStatus.CANCELLED,
      },
    }),
    prisma.serviceRequest.count({
      where: {
        assignedStaffId: staffId,
        status: RequestStatus.REJECTED,
      },
    }),
  ]);

  return {
    totalAssignedRequests,
    inProgressRequests,
    resolvedRequests,
    cancelledRequests,
    rejectedRequests,
  };
};

const getAvailableStaff = async () => {
  const availableStaff = await prisma.staffProfile.findMany({
    where: {
      isAvailable: true,
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          imageUrl: true,
        },
      },
    },
  });

  return availableStaff;
};

export const StaffService = {
  getStaffDashboardStats,
  getAvailableStaff,
};
