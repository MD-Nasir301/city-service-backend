import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { StaffController } from "./staff.controller";

const router = Router();

router.get(
	"/dashboard-stats",
	auth(Role.STAFF),
	StaffController.getStaffDashboardStats,
);

export const StaffRoutes = router;
