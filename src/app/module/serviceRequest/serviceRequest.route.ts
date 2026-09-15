

import express from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { ServiceRequestController } from "./serviceRequest.controller";
import { ServiceRequestValidation } from "./serviceRequest.validation";

const router = express.Router();

router.post(
  "/",
  auth(Role.CITIZEN, Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(ServiceRequestValidation.CreateServiceRequestZodSchema),
  ServiceRequestController.createServiceRequest
);

export const ServiceRequestRoutes = router;