import type { NextFunction, Request, Response } from "express";
import type { JwtPayload } from "jsonwebtoken";
import config from "../config";
import { prisma } from "../lib/prisma";
import { catchAsync } from "../utils/catchAsync";
import { jwtUtils } from "../utils/jwt";

export const optionalAuth = () => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies.accessToken
      ? req.cookies.accessToken
      : req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization?.split(" ")[1]
        : req.headers.authorization;

    if (!token) {
      req.user = undefined;
      return next();
    }

    const verifiedToken = jwtUtils.verifyToken(token, config.jwt_access_secret);

    if (!verifiedToken.success) {
      req.user = undefined;
      return next();
    }

    const { email, name, userId, role } = verifiedToken.data as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: userId, email },
    });

    if (!user || user.status === "BLOCKED") {
      req.user = undefined;
      return next();
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
