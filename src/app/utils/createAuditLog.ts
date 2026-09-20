import type { Prisma } from "../../../generated/prisma/client";
import type { AuditAction } from "../../../generated/prisma/enums";

interface IAuditLogPayload {
	action: AuditAction;
	entityName: string;
	entityId: string;
	performedById: string;
	details?: Record<string, any>;
}

export const createAuditLog = async (
	tx: Prisma.TransactionClient,
	payload: IAuditLogPayload,
) => {
	const { action, entityName, entityId, performedById, details } = payload;

	return await tx.auditLog.create({
		data: {
			action,
			entityName,
			entityId,
			performedById,
			details: details || {},
		},
	});
};
