import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { AdminController } from "./admin.controller";
import { AdminValidation } from "./admin.validation";

const router = Router();

router.get(
	"/users",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	AdminController.getAllUsers,
);

router.patch(
	"/users/:id/status",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	validateRequest(AdminValidation.UpdateUserStatusZodSchema),
	AdminController.updateUserStatus,
);

router.patch(
	"/users/:id/role",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	validateRequest(AdminValidation.updateUserRoleZodSchema),
	AdminController.updateUserRole,
);

router.get(
	"/dashboard-stats",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	AdminController.getAdminDashboardStats,
);

router.get(
	"/audit-logs",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	AdminController.getAllAuditLogs,
);

router.post(
	"/create-staff",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	validateRequest(AdminValidation.createStaffZodSchema),
	AdminController.createStaff,
);

export const AdminRoutes = router;
