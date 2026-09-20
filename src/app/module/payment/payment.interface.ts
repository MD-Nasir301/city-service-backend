export interface ICreateCheckoutSessionInput {
	serviceRequestId: string;
}

export interface IPaymentQuery {
	page?: string | number;
	limit?: string | number;
	status?: string;
	search?: string;
}
