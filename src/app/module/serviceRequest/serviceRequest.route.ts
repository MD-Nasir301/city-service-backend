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
  ServiceRequestController.createServiceRequest,
);
router.get(
  "/",
  auth(Role.ADMIN, Role.SUPER_ADMIN, Role.STAFF),
  ServiceRequestController.getAllServiceRequests,
);

router.get(
  "/my-requests",
  auth(Role.CITIZEN, Role.ADMIN, Role.SUPER_ADMIN),
  ServiceRequestController.getMyServiceRequests,
);

router.get(
  "/my-assigned",
  auth(Role.STAFF),
  ServiceRequestController.getMyAssignedRequests
);

router.get(
  "/:id",
  auth(Role.CITIZEN, Role.STAFF, Role.ADMIN, Role.SUPER_ADMIN),
  ServiceRequestController.getSingleServiceRequest
);

export const ServiceRequestRoutes = router;
