import type { Request, Response } from "express";
import type Stripe from "stripe";
import config from "../../config";
import { stripe } from "../../lib/stripe";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { PaymentService } from "./payment.service";

 const createCheckoutSession = catchAsync(
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
const handleWebhook = catchAsync(async (req: Request, res: Response) => {
	const signature = req.headers["stripe-signature"] as string;

	let event : Stripe.Event;
	try {
		event = stripe.webhooks.constructEvent(
			req.body,
			signature,
			config.stripe_webhook_secret as string,
		);
	} catch (err: any) {
		return res.status(400).send(`Webhook Error: ${err.message}`);
	}

	await PaymentService.handleStripeWebhook(event);

	res.status(200).json({ received: true });
});

const getMyPayments = catchAsync(async (req: Request, res: Response) => {
	const userId = req.user?.userId as string;
	const result = await PaymentService.getMyPayments(userId);

	sendResponse(res, {
		statusCode: 200,
		success: true,
		message: "Payment history retrieved successfully",
		data: result,
	});
});

const getPaymentById = catchAsync(async (req: Request, res: Response) => {
	const { id } = req.params;
	const userId = req.user?.userId as string;
	const role = req.user?.role as string;

	const result = await PaymentService.getPaymentById(
		id as string,
		userId,
		role,
	);

	sendResponse(res, {
		statusCode: 200,
		success: true,
		message: "Payment details retrieved successfully",
		data: result,
	});
});

const getAllPayments = catchAsync(async (req: Request, res: Response) => {
	const result = await PaymentService.getAllPayments(req.query);

	sendResponse(res, {
		statusCode: 200,
		success: true,
		message: "All payment records retrieved successfully",
		meta: result.meta,
		data: result.data,
	});
});

export const PaymentController = {
	createCheckoutSession,
	handleWebhook,
	getMyPayments,
	getPaymentById,
	getAllPayments,
};
