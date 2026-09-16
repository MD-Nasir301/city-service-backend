import { Router } from "express";
import { auth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";
import { validateRequest } from "../../middleware/validateRequest";
import { CommentValidation } from "./comments.validation";
import { CommentController } from "./comments.controller";


const router = Router();

router.post(
  "/",
  auth(Role.CITIZEN, Role.STAFF, Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(CommentValidation.CreateCommentZodSchema),
  CommentController.createComment
);

export const CommentRoutes = router;