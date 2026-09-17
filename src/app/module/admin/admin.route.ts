import { Router } from "express";
import { auth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";
import { AdminController } from "./admin.controller";
import { validateRequest } from "../../middleware/validateRequest";
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

export const AdminRoutes = router;
