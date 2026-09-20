import { Router } from "express";
import { PaymentController } from "./payment.controller";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";

const router = Router();

router.post(
  "/create-checkout-session",
  auth(Role.CITIZEN),
  PaymentController.createCheckoutSession,
);

router.get(
  "/my-payments",
  auth(Role.CITIZEN, Role.ADMIN, Role.SUPER_ADMIN),
  PaymentController.getMyPayments,
);

router.get(
  "/:id",
  auth(Role.CITIZEN, Role.STAFF, Role.ADMIN, Role.SUPER_ADMIN),
  PaymentController.getPaymentById,
);

export const PaymentRoutes = router;
