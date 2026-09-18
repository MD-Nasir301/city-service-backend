import bcrypt from "bcryptjs";
import crypto from "crypto";
import ejs from "ejs";
import type { TokenPayload } from "google-auth-library";
import type { JwtPayload, SignOptions } from "jsonwebtoken";
import path from "path";
import {
  AuthProvider,
  Role,
  UserStatus,
} from "../../../generated/prisma/enums";
import config from "../../config";
import { googleClient } from "../../lib/googlAuth";
import { transporter } from "../../lib/notemailter";
import { prisma } from "../../lib/prisma";
import { redisCLient } from "../../lib/redis";
import { jwtUtils } from "../../utils/jwt";
import type {
  IForgotPasswordPayload,
  IGooglePayload,
  ILoginUserPayload,
  IRegisterCitizenPayload,
  IRequestUser,
  IResetPasswordPayload,
  IVerifyEmailPayload,
} from "./auth.interface";


const registerCitizen = async (payload: IRegisterCitizenPayload) => {
  const { name, password, phoneNumber } = payload;
  const email = payload.email.trim().toLowerCase();

  const isUserExists = await prisma.user.findUnique({
    where: { email },
  });

  if (isUserExists) {
    throw new Error("User with this email already exists");
  }

  const hashedPassword = await bcrypt.hash(
    password,
    Number(config.bcrypt_salt_rounds) || 12,
  );

  const expirationSeconds = 5 * 60;
  const otpkey = `citizen-registration-otp:${email}`;
  const otpValue = crypto.randomInt(100000, 1000000).toString();

  await redisCLient.set(otpkey, otpValue, {
    expiration: {
      type: "EX",
      value: expirationSeconds,
    },
  });

  const citizenRegistrationKey = `citizen-registration-data:${email}`;
  const redisUserDataPayload = {
    name,
    email,
    password: hashedPassword,
    phoneNumber,
  };

  await redisCLient.set(
    citizenRegistrationKey,
    JSON.stringify(redisUserDataPayload),
    {
      expiration: {
        type: "EX",
        value: expirationSeconds,
      },
    },
  );

  const templatePath = path.join(
    process.cwd(),
    "src/app/templates/emali-verification-otp.ejs",
  );
  const html = await ejs.renderFile(templatePath, {
    name,
    otpValue,
    expiryMinutes: expirationSeconds / 60,
  });

  await transporter.sendMail({
    from: `"City Services" <${config.email_sender}>`,
    to: email,
    subject: "Email Verification",
    html,
  });
};

const verifyCitizenEmail = async (payload: IVerifyEmailPayload) => {
  const otp = payload.otp;
  const email = payload.email.trim().toLowerCase();

  const isUserExist = await prisma.user.findUnique({
    where: { email },
  });

  if (isUserExist?.emailVerified) {
    throw new Error("Email Already Verified");
  }

  if (isUserExist?.status === UserStatus.BLOCKED) {
    throw new Error("User is blocked");
  }
  if (isUserExist?.isDeleted) {
    throw new Error("User is deleted");
  }

  const otpkey = `citizen-registration-otp:${email}`;
  const radisOtp = await redisCLient.get(otpkey);

  if (!radisOtp) {
    throw new Error("Invalid OTP");
  }
  if (radisOtp !== otp) {
    throw new Error("OTP does not match");
  }

  const citizenRegistrationKey = `citizen-registration-data:${email}`;
  const redisCitizenData = await redisCLient.get(citizenRegistrationKey);

  if (!redisCitizenData) {
    throw new Error("Registration data not found");
  }

  const citizenPayload: IRegisterCitizenPayload = JSON.parse(redisCitizenData);

  const createdUser = await prisma.user.create({
    data: {
      name: citizenPayload.name,
      email: citizenPayload.email,
      password: citizenPayload.password,
      phoneNumber: citizenPayload.phoneNumber || null,
      role: Role.CITIZEN,
      status: UserStatus.ACTIVE,
      emailVerified: true,
    },
    omit: { password: true },
  });

  await redisCLient.del(otpkey);
  await redisCLient.del(citizenRegistrationKey);

  const templatePath = path.join(
    process.cwd(),
    "src/app/templates/citizen-welcome-email.ejs",
  );

  let html = "";
  try {
    html = await ejs.renderFile(templatePath, {
      name: createdUser.name,
    });
  } catch {
    html = `<h1>Welcome to City Services Platform, ${createdUser.name}!</h1>`;
  }

  await transporter.sendMail({
    from: `"City Services" <${config.email_sender}>`,
    to: email,
    subject: "Welcome To City Services Platform",
    html,
  });

  const jwtPayload = {
    userId: createdUser.id,
    name: createdUser.name,
    email: createdUser.email,
    role: createdUser.role,
    needPasswordChange: false,
  };

  const accessToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_access_secret,
    config.jwt_access_expires_in as SignOptions,
  );

  const refreshToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_refresh_secret,
    config.jwt_refresh_expires_in as SignOptions,
  );

  return {
    user: createdUser,
    accessToken,
    refreshToken,
  };
};

const loginUser = async (payload: ILoginUserPayload) => {
  const { password } = payload;
  const email = payload.email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error("User not found");
  }

  if (user.status === UserStatus.BLOCKED) {
    throw new Error("User is blocked");
  }

  if (user.isDeleted) {
    throw new Error("User is deleted");
  }

  if (user.password === null && user.googleId !== null) {
    throw new Error("User registered with Google. Please Login with Google");
  }

  const isPasswordMatched = await bcrypt.compare(
    password,
    user.password as string,
  );

  if (!isPasswordMatched) {
    throw new Error("Invalid credentials");
  }

  const jwtPayload = {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    needPasswordChange: user.needPasswordChange,
  };

  const accessToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_access_secret,
    config.jwt_access_expires_in as SignOptions,
  );

  const refreshToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_refresh_secret,
    config.jwt_refresh_expires_in as SignOptions,
  );

  return {
    accessToken,
    refreshToken,
  };
};

const refreshToken = async (token: string) => {
  const verifiedRefreshToken = jwtUtils.verifyToken(
    token,
    config.jwt_refresh_secret,
  );

  if (!verifiedRefreshToken.success || !verifiedRefreshToken.data) {
    throw new Error(
      config.node_env === "development"
        ? verifiedRefreshToken.error
        : "Invalid refresh token",
    );
  }

  const data = verifiedRefreshToken.data as JwtPayload;

  const user = await prisma.user.findUnique({
    where: { id: data.userId },
  });

  if (!user || user.isDeleted || user.status !== UserStatus.ACTIVE) {
    throw new Error("User is inactive or not found");
  }

  const jwtPayload = {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    needPasswordChange: user.needPasswordChange,
  };

  const accessToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_access_secret,
    config.jwt_access_expires_in as SignOptions,
  );

  const refreshToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_refresh_secret,
    config.jwt_refresh_expires_in as SignOptions,
  );

  return {
    accessToken,
    refreshToken,
  };
};

const googleLoginService = async (payload: IGooglePayload) => {
  let googleIdTokenPayload: TokenPayload | null | undefined = null;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: payload.idToken,
      audience: config.google_client_id,
    });
    googleIdTokenPayload = ticket.getPayload();
  } catch {
    throw new Error("Invalid or Expired Google Id Token ");
  }

  if (!googleIdTokenPayload) {
    throw new Error("Invalid or Expired Google Id Token ");
  }
  if (!googleIdTokenPayload.email) {
    throw new Error("Google email not found");
  }

  if (!googleIdTokenPayload.name) {
    throw new Error("Google email user name not found");
  }

  const ifUserExistWithGoogleAuth = await prisma.user.findUnique({
    where: {
      email: googleIdTokenPayload.email,
      googleId: googleIdTokenPayload.sub,
    },
  });

  let user = ifUserExistWithGoogleAuth;

  if (!ifUserExistWithGoogleAuth) {
    const ifUserExistWithCredentials = await prisma.user.findUnique({
      where: {
        email: googleIdTokenPayload.email,
        authProvider: AuthProvider.CREDENTIAL,
      },
    });

    if (ifUserExistWithCredentials) {
      if (!ifUserExistWithCredentials.emailVerified) {
        throw new Error("Email not verified");
      }

      if (ifUserExistWithCredentials.status === UserStatus.BLOCKED) {
        throw new Error("User is blocked");
      }
      if (ifUserExistWithCredentials.isDeleted) {
        throw new Error("User is Deleted");
      }

      user = await prisma.user.update({
        where: {
          id: ifUserExistWithCredentials.id,
        },
        data: {
          googleId: googleIdTokenPayload.sub,
        },
      });
    } else {
      // google register
      user = await prisma.user.create({
        data: {
          name: googleIdTokenPayload.name,
          email: googleIdTokenPayload.email,
          role: Role.CITIZEN,
          googleId: googleIdTokenPayload.sub,
          authProvider: AuthProvider.GOOGLE,
          emailVerified: true,
        },
      });

      const templatePath = path.join(
        process.cwd(),
        "src/app/templates/citizen-welcome-email.ejs",
      );
      let html = "";
      try {
        html = await ejs.renderFile(templatePath, {
          name: user.name,
        });
      } catch {
        html = `<h1>Welcome to City Services Platform, ${user.name}!</h1>`;
      }

      await transporter.sendMail({
        from: `"City Services" <${config.email_sender}>`,
        to: user.email,
        subject: "Welcome To City Services Platform",
        html,
      });
    }
  }

  if (!user) {
    throw new Error("User not found ");
  }

  if (user.status === UserStatus.BLOCKED) {
    throw new Error("User is blocked");
  }
  if (user.isDeleted) {
    throw new Error("User is Deleted");
  }

  const jwtPayload = {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    needPasswordChange: user.needPasswordChange,
  };

  const accessToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_access_secret,
    config.jwt_access_expires_in as SignOptions,
  );

  const refreshToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_refresh_secret,
    config.jwt_refresh_expires_in as SignOptions,
  );

  return {
    accessToken,
    refreshToken,
  };
};

const forgotPassword = async (payload: IForgotPasswordPayload) => {
  const { email } = payload;

  const isUserExist = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!isUserExist) {
    throw new Error("User Does Not Exist");
  }
  if (!isUserExist.emailVerified) {
    throw new Error("User email not verified");
  }

  if (isUserExist.status === UserStatus.BLOCKED) {
    throw new Error("User is blocked");
  }
  if (isUserExist.isDeleted) {
    throw new Error("User is deleted");
  }
  if (isUserExist.googleId && isUserExist.authProvider === AuthProvider.GOOGLE) {
    throw new Error("User has account with google");
  }

  const otp = crypto.randomInt(100000, 1000000).toString();
  const key = `forgot-password-otp:${isUserExist.email}`;
  const expirationSeconds = 5 * 60;
  await redisCLient.set(key, otp, {
    expiration: {
      type: "EX",
      value: expirationSeconds,
    },
  });

  const templatePath = path.join(
    process.cwd(),
    "src/app/templates/forgot-password.ejs",
  );
  const html = await ejs.renderFile(templatePath, {
    name: isUserExist.name,
    otp,
    expiryMinutes: expirationSeconds / 60,
  });

  await transporter.sendMail({
    from: `"City Services" <${config.email_sender}>`,
    to: isUserExist.email,
    subject: "Forgot Password",
    html,
  });
};

const resetPassword = async (payload: IResetPasswordPayload) => {
  const { email, otp, newPassword } = payload;

  const isUserExist = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!isUserExist) {
    throw new Error("User Does Not Exist");
  }
  if (!isUserExist.emailVerified) {
    throw new Error("User email not verified");
  }

  if (isUserExist.status === UserStatus.BLOCKED) {
    throw new Error("User is blocked");
  }
  if (isUserExist.isDeleted) {
    throw new Error("User is deleted");
  }
  if (isUserExist.googleId && isUserExist.authProvider === AuthProvider.GOOGLE) {
    throw new Error("User has account with google");
  }
  const key = `forgot-password-otp:${isUserExist.email}`;
  const radisOtp = await redisCLient.get(key);

  if (!radisOtp) {
    throw new Error("Invalid OTP");
  }
  if (radisOtp !== otp) {
    throw new Error("OTP does not match");
  }

  const hashedNewPassword = await bcrypt.hash(
    newPassword,
    Number(config.bcrypt_salt_rounds) || 12,
  );

  await prisma.user.update({
    where: {
      email: isUserExist.email,
    },
    data: {
      password: hashedNewPassword,
    },
  });

  await redisCLient.del(key);

  const templatePath = path.join(
    process.cwd(),
    "src/app/templates/reset-password-success.ejs",
  );
  const html = await ejs.renderFile(templatePath, {
    name: isUserExist.name,
  });

  await transporter.sendMail({
    from: `"City Services" <${config.email_sender}>`,
    to: isUserExist.email,
    subject: "Security Notification: Password Changed",
    html,
  });
};

export const AuthService = {
  registerCitizen,
  verifyCitizenEmail,
  loginUser,
  refreshToken,
  googleLoginService,
  forgotPassword,
  resetPassword,
};