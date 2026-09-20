import type { NextFunction, Request, Response } from "express";
import type z from "zod";
import { catchAsync } from "../utils/catchAsync";
import AppError from "../utils/appError";

export const validateRequest = (zodSchema: z.ZodObject) => {
    return catchAsync((req: Request, res: Response, next: NextFunction) => {
        const payload = req.body ?? {};

        const result = zodSchema.safeParse(payload);

        if (!result.success) {
            throw new AppError(400, result.error.issues[0].message);
        }

        req.body = result.data;
        next();
    });
};