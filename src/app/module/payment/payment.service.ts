
import config from "../../config";
import { stripe } from "../../lib/stripe";
import { prisma } from "../../lib/prisma";
import { PaymentStatus, RequestStatus } from "../../../generated/prisma/enums";
import AppError from "../../utils/appError";
import Stripe from "stripe";

export const createCheckoutSession = async (
  userId: string,
  serviceRequestId: string,
) => {
 
  const serviceRequest = await prisma.serviceRequest.findUnique({
    where: { id: serviceRequestId },
    include: { category: true },
  });

  if (!serviceRequest) {
    throw new AppError(404, "Service request not found.");
  }

  if (serviceRequest.citizenId !== userId) {
    throw new AppError(403, "You can only pay for your own service request.");
  }

  if (serviceRequest.isPaid) {
    throw new AppError(400, "This service request has already been paid for.");
  }
  if (serviceRequest.status === RequestStatus.RESOLVED) {
    throw new AppError(400, "This service request has already been resolved.");
  }
  if (serviceRequest.status !== RequestStatus.ACCEPTED) {
    throw new AppError(400, "This service request is not accepted or ready for payment yet.");
  }

  const amount = serviceRequest.totalAmount;
  if (!amount || amount <= 0) {
    throw new AppError(400, "This service is free! or  Invalid service amount for payment.");
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "bdt",
          product_data: {
            name: serviceRequest.title,
            description: `Category: ${serviceRequest.category.name}`,
          },
          unit_amount: Math.round(amount * 100), 
        },
        quantity: 1,
      },
    ],

    success_url: `${config.client_app_url}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.client_app_url}/payments/cancel`,
    metadata: {
      serviceRequestId: serviceRequest.id,
      userId: userId,
    },
  });

  await prisma.payment.upsert({
    where: { serviceRequestId: serviceRequest.id },
    update: {
      amount,
      transactionId: session.id, 
      status: PaymentStatus.PENDING,
    },
    create: {
      userId,
      serviceRequestId: serviceRequest.id,
      amount,
      transactionId: session.id, 
      status: PaymentStatus.PENDING,
    },
  });

  return {
    paymentUrl: session.url,
  };
};




// Webhook 
export const handleStripeWebhook = async (event: Stripe.Event) => {
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const serviceRequestId = session.metadata?.serviceRequestId;
    const transactionId = session.id;

    if (!serviceRequestId) return;

    // Prisma Transaction 
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { transactionId },
        data: {
          status: PaymentStatus.PAID,
          paymentMethod: session.payment_method_types[0] || "card",
        },
      });

      await tx.serviceRequest.update({
        where: { id: serviceRequestId },
        data: {
          isPaid: true,
        },
      });
    });
  }
};


export const PaymentService = {
    createCheckoutSession,
    handleStripeWebhook
} 