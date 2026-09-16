import { Router } from "express";
import { auth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";
import { UserController } from "./users.controller";

const router = Router();

router.get(
  "/me",
  auth(Role.CITIZEN, Role.STAFF, Role.ADMIN, Role.SUPER_ADMIN),
  UserController.getMe,
);

export const UserRoutes = router;
