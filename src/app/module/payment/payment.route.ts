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

export const PaymentRoutes = router;
