import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { stripe } from "../../lib/stripe";
import config from "../../config";
import { PaymentService } from "./payment.service";

export const createCheckoutSession = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId as string;
    const { serviceRequestId } = req.body;

    const result = await PaymentService.createCheckoutSession(
      userId,
      serviceRequestId,
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Checkout session created successfully",
      data: result,
    });
  },
);


// Stripe Webhook 
export const handleWebhook = catchAsync(async (req: Request, res: Response) => {
  const signature = req.headers["stripe-signature"] as string;

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      config.stripe_webhook_secret as string
    );
  } catch (err: any) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  await PaymentService.handleStripeWebhook(event);

  res.status(200).json({ received: true });
});


export const PaymentController = {
  createCheckoutSession,
  handleWebhook,
};