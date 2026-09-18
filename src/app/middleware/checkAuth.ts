// auth(Role.ADMIN, Role.USER, Role.Author)
// auth() => ...requiredRoles => [Role.ADMIN, Role.USER, Role.AUTHOR]
import type { NextFunction, Request, Response } from "express";
import type { JwtPayload } from "jsonwebtoken";
import type { Role } from "../../generated/prisma/enums";
import config from "../config";
import { prisma } from "../lib/prisma";
import { catchAsync } from "../utils/catchAsync";
import { jwtUtils } from "../utils/jwt";
import AppError from "../utils/appError";

declare global {
  namespace Express {
    interface Request {
      user?: {
        email: string;
        name: string;
        userId: string;
        role: Role;
        needPasswordChange?: boolean;
      };
    }
  }
}

export const auth = (...requiredRoles: Role[]) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies.accessToken
      ? req.cookies.accessToken
      : req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization?.split(" ")[1]
        : req.headers.authorization;

    if (!token) {
      throw new AppError(
        401,
        "You are not logged in. Please log in to access this resource.",
      );
    }

    const verifiedToken = jwtUtils.verifyToken(token, config.jwt_access_secret);

    if (!verifiedToken.success) {
      throw new AppError(401, verifiedToken.error);
    }

    const { email, name, userId, role } = verifiedToken.data as JwtPayload;

    if (requiredRoles.length && !requiredRoles.includes(role)) {
      throw new AppError(
        403,
        "Forbidden. You don't have permission to access this resource.",
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
        email,
      },
    });

    if (!user) {
      throw new AppError(404, "User not found. Please log in again.");
    }

    if (user.status === "BLOCKED") {
      throw new AppError(
        403,
        "Your account has been blocked. Please contact support.",
      );
    }

    const isChangePasswordRoute = req.originalUrl.includes("/reset-password");

    if (user.needPasswordChange && !isChangePasswordRoute) {
      throw new AppError(
        403,
        "You must change your initial password before accessing system resources. Click the 'Forgot Password' link on the login page to reset your password.",
      );
    }

    req.user = {
      email,
      name,
      userId,
      role,
      needPasswordChange: user.needPasswordChange,
    };

    next();
  });
};
