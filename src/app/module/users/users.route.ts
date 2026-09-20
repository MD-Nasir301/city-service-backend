import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { upload } from "../../lib/multer";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { UserController } from "./users.controller";
import { UserValidation } from "./users.validation";

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
	UserController.updateMe,
);

export const UserRoutes = router;
