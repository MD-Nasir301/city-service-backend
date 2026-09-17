import { Router } from "express";
import { auth } from "../../middleware/checkAuth";
import { StaffController } from "./staff.controller";
import { Role } from "../../../generated/prisma/enums";

const router = Router();

router.get(
  "/dashboard-stats",
  auth(Role.STAFF),
  StaffController.getStaffDashboardStats,
);

export const StaffRoutes = router;
