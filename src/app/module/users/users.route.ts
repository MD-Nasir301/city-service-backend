import { Router } from "express";
import { auth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";
import { UserController } from "./users.controller";
import { validateRequest } from "../../middleware/validateRequest";
import { UserValidation } from "./users.validation";
import { upload } from "../../lib/multer";

const router = Router();

router.get(
  "/me",
  auth(Role.CITIZEN, Role.STAFF, Role.ADMIN, Role.SUPER_ADMIN),
  UserController.getMe,
);


router.patch(
  "/me",
  auth(Role.CITIZEN, Role.STAFF, Role.ADMIN, Role.SUPER_ADMIN),
  upload.single("image"), // Form-data field name: 'image'
  validateRequest(UserValidation.UpdateProfileZodSchema),
  UserController.updateMe
);

export const UserRoutes = router;
