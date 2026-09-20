import express from "express";
import { Role } from "../../../generated/prisma/enums";
import { upload } from "../../lib/multer";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { ServiceRequestController } from "./serviceRequest.controller";
import { ServiceRequestValidation } from "./serviceRequest.validation";

const router = express.Router();

router.post(
	"/",
	auth(Role.ADMIN, Role.CITIZEN, Role.SUPER_ADMIN),
	upload.array("images", 4),
	ServiceRequestController.createServiceRequest,
);

router.get(
	"/",
	auth(Role.CITIZEN, Role.STAFF, Role.ADMIN, Role.SUPER_ADMIN),
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
	ServiceRequestController.getMyAssignedRequests,
);

router.get(
	"/:id",
	auth(Role.CITIZEN, Role.STAFF, Role.ADMIN, Role.SUPER_ADMIN),
	ServiceRequestController.getSingleServiceRequest,
);

router.patch(
	"/:serviceRequestId/assign",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	validateRequest(ServiceRequestValidation.AssignStaffZodSchema),
	ServiceRequestController.assignStaff,
);

router.patch(
	"/:id/status",
	auth(Role.STAFF, Role.ADMIN, Role.SUPER_ADMIN),
	validateRequest(ServiceRequestValidation.UpdateStatusZodSchema),
	ServiceRequestController.updateServiceRequestStatus,
);

router.delete(
	"/:id",
	auth(Role.CITIZEN, Role.ADMIN, Role.SUPER_ADMIN),
	ServiceRequestController.deleteServiceRequest,
);

router.patch(
	"/:id",
	auth(Role.CITIZEN, Role.ADMIN, Role.SUPER_ADMIN),
	upload.array("images", 4),
	ServiceRequestController.updateServiceRequest,
);

export const ServiceRequestRoutes = router;
