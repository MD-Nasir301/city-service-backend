import config from "../../config";
import { stripe } from "../../lib/stripe";
import { prisma } from "../../lib/prisma";
import { PaymentStatus, RequestStatus } from "../../../generated/prisma/enums";
import AppError from "../../utils/appError";
import Stripe from "stripe";
import { transporter } from "../../lib/notemailter";
import path from "path/win32";
import ejs from "ejs";

const createCheckoutSession = async (
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
    throw new AppError(
      400,
      "This service request is not accepted or ready for payment yet.",
    );
  }

  const amount = serviceRequest.totalAmount;
  if (!amount || amount <= 0) {
    throw new AppError(
      400,
      "This service is free! or  Invalid service amount for payment.",
    );
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

    success_url: `${config.frontend_url}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.frontend_url}/payments/cancel`,
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
const handleStripeWebhook = async (event: Stripe.Event) => {
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const serviceRequestId = session.metadata?.serviceRequestId;
    const userId = session.metadata?.userId;
    const transactionId = session.id;

    if (!serviceRequestId) return;

    // Database Transaction
    const { updatedPayment, serviceRequest, user } = await prisma.$transaction(
      async (tx) => {
        const updatedPayment = await tx.payment.update({
          where: { transactionId },
          data: {
            status: PaymentStatus.PAID,
            paymentMethod: session.payment_method_types[0] || "card",
          },
        });

        const serviceRequest = await tx.serviceRequest.update({
          where: { id: serviceRequestId },
          data: { isPaid: true },
        });

        const user = await tx.user.findUnique({
          where: { id: userId },
        });

        return { updatedPayment, serviceRequest, user };
      },
    );

    // Success Email
    if (user?.email) {
      const templatePath = path.join(
        process.cwd(),
        "src/app/templates/payment-success.ejs",
      );

      const html = await ejs.renderFile(templatePath, {
        name: user.name,
        serviceTitle: serviceRequest.title,
        amount: updatedPayment.amount,
        transactionId: updatedPayment.transactionId,
      });

      await transporter.sendMail({
        from: `"City Services" <${config.email_sender}>`,
        to: user.email,
        subject: "Payment Confirmation - City Services",
        html,
      });
    }
  }

  if (event.type === "checkout.session.async_payment_failed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const serviceRequestId = session.metadata?.serviceRequestId;
    const userId = session.metadata?.userId;
    const transactionId = session.id;

    if (!serviceRequestId) return;

    await prisma.payment.update({
      where: { transactionId },
      data: { status: PaymentStatus.FAILED },
    });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const serviceRequest = await prisma.serviceRequest.findUnique({
      where: { id: serviceRequestId },
    });

    if (user?.email) {
      const templatePath = path.join(
        process.cwd(),
        "src/app/templates/payment-failed.ejs",
      );

      const html = await ejs.renderFile(templatePath, {
        name: user.name,
        serviceTitle: serviceRequest?.title || "Service",
      });

      await transporter.sendMail({
        from: `"City Services" <${config.email_sender}>`,
        to: user.email,
        subject: "Payment Failed - City Services",
        html,
      });
    }
  }
};

const getMyPayments = async (userId: string) => {
  const payments = await prisma.payment.findMany({
    where: { userId },
    include: {
      serviceRequest: {
        select: {
          id: true,
          title: true,
          category: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return payments;
};

export const getPaymentById = async (
  paymentId: string,
  userId: string,
  role: string
) => {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      serviceRequest: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!payment) {
    throw new AppError(404, "Payment record not found.");
  }

  if (role === "CITIZEN" && payment.userId !== userId) {
    throw new AppError(403, "You do not have permission to view this payment.");
  }

  if (role === "STAFF" && payment.serviceRequest.assignedStaffId !== userId) {
    throw new AppError(
      403,
      "You can only view payment details for service requests assigned to you."
    );
  }

  return payment;
};

export const PaymentService = {
  createCheckoutSession,
  handleStripeWebhook,
  getMyPayments,
  getPaymentById
};
