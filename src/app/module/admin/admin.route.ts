import { Router } from "express";
import { auth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";
import { AdminController } from "./admin.controller";

const router = Router();

router.get(
  "/users",
  auth(Role.ADMIN, Role.SUPER_ADMIN),
  AdminController.getAllUsers,
);

export const AdminRoutes = router;
