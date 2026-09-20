import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { CommentController } from "./comments.controller";
import { CommentValidation } from "./comments.validation";

const router = Router();

router.post(
	"/",
	auth(Role.CITIZEN, Role.STAFF, Role.ADMIN, Role.SUPER_ADMIN),
	validateRequest(CommentValidation.CreateCommentZodSchema),
	CommentController.createComment,
);

router.get(
	"/:serviceRequestId",
	auth(Role.CITIZEN, Role.STAFF, Role.ADMIN, Role.SUPER_ADMIN),
	CommentController.getCommentsByServiceRequestId,
);

router.delete(
	"/:id",
	auth(Role.CITIZEN, Role.STAFF, Role.ADMIN, Role.SUPER_ADMIN),
	CommentController.deleteComment,
);

router.patch(
	"/:id",
	auth(Role.CITIZEN, Role.STAFF, Role.ADMIN, Role.SUPER_ADMIN),
	validateRequest(CommentValidation.UpdateCommentZodSchema),
	CommentController.updateComment,
);

export const CommentRoutes = router;
