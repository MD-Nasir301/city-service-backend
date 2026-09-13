/** biome-ignore-all lint/style/useConst: <explanation> */
import { error } from "node:console";
import bcrypt from "bcryptjs";
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
import { prisma } from "../../lib/prisma";
import { jwtUtils } from "../../utils/jwt";
import type {
  IForgotPasswordPayload,
  IGooglePayload,
  ILoginUserPayload,
  IRegisterPatientPayload,
  IRequestUser,
  IResetPasswordPayload,
  IverifyEmailPayload,
} from "./auth.interface";
import crypto from "crypto";
import { redisCLient } from "../../lib/redis";
import { transporter } from "../../lib/notemailter";
import ejs from "ejs";
import {
  createPasswordChangedEmailHtml,
  createResetPasswordEmailHtml,
  resetPasswordEmailHtml,
} from "../../utils/emailTemplate";
import { RedisClient } from "redis";

const registerPatient = async (payload: IRegisterPatientPayload) => {
  const { name, password, patient: patientData } = payload;
  const email = payload.email.trim().toLowerCase();

  const isUserExists = await prisma.user.findUnique({
    where: { email },
  });

  if (isUserExists) {
    throw new Error("User with this email already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 8);

  const expirationSeconds = 5 * 60;
  const otpkey = `patient-registration-otp:${email}`;
  const otpValue = crypto.randomInt(100000, 1000000).toString();

  await redisCLient.set(otpkey, otpValue, {
    expiration: {
      type: "EX",
      value: expirationSeconds,
    },
  });

  const patientRegistrationKey = `patient-registration-data:${email}`;
  const redisUserDataPayload = {
    name,
    email,
    password: hashedPassword,
    patient: patientData,
  };

  await redisCLient.set(
    patientRegistrationKey,
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
    from: config.email_sender,
    to: email,
    subject: "Email Verification",
    html,
  });
};

const verifyPatientEmail = async (payload: IverifyEmailPayload) => {
  const otp = payload.otp;
  const email = payload.email.trim().toLowerCase();

  const isUserExist = await prisma.user.findUnique({
    where: { email },
  });

  if (isUserExist?.emailVerified) {
    throw new Error("Email Already Verified");
  }

  if (isUserExist?.status === "BLOCKED") {
    throw new Error("User is block");
  }
  if (isUserExist?.isDeleted || isUserExist?.status === "DELETED") {
    throw new Error("User is deleted");
  }

  const otpkey = `patient-registration-otp:${email}`;
  const radisOtp = await redisCLient.get(otpkey);

  if (!radisOtp) {
    throw new Error("Invalid OTP");
  }
  if (radisOtp !== otp) {
    throw new Error("OTP does not match");
  }

  await redisCLient.del(otpkey);

  const patientRegistrationKey = `patient-registration-data:${email}`;
  const redisPatientData = await redisCLient.get(patientRegistrationKey);

  if (!redisPatientData) {
    throw new Error("Patient registration data not found");
  }

  const patientPayload: IRegisterPatientPayload = JSON.parse(redisPatientData);

  const createdUser = await prisma.user.create({
    data: {
      name: patientPayload.name,
      email: patientPayload.email,
      password: patientPayload.password,
      role: Role.PATIENT,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      patient: {
        create: {
          name: patientPayload.name,
          email: patientPayload.email,
          contactNumber: patientPayload?.patient?.contactNumber || "",
        },
      },
    },
    omit: { password: true },
    include: { patient: true },
  });

  await redisCLient.del(patientRegistrationKey);

  const templatePath = path.join(
    process.cwd(),
    "src/app/templates/patient-welcome-email.ejs",
  );
  const html = await ejs.renderFile(templatePath, {
    name: createdUser.name,
  });

  await transporter.sendMail({
    from: config.email_sender,
    to: email,
    subject: "Welcome To PH Health Care",
    html,
  });

  const { patient, ...user } = createdUser;
  const jwtPayload = {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
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
    user,
    patient,
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

  if (user.isDeleted || user.status === UserStatus.DELETED) {
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

const getMe = async (user: IRequestUser) => {
  const isUserExists = await prisma.user.findUnique({
    where: {
      id: user.userId,
    },
    include: {
      patient: true,
    },
    omit: {
      password: true,
    },
  });

  if (!isUserExists) {
    throw new Error("User not found");
  }

  return isUserExists;
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
    console.log("Google ID Token Verification Failed Error ", error);
    throw new Error("Invalid or Expired Google Id Token ");
  }

  if (!googleIdTokenPayload) {
    throw new Error("Invalid or Expired Google Id Token ");
  }
  if (!googleIdTokenPayload.email) {
    throw new Error("Google emeil not found");
  }

  if (!googleIdTokenPayload.name) {
    throw new Error("Google emeil user name  not found");
  }

  const ifPatientExistWithGoogleAuth = await prisma.user.findUnique({
    where: {
      email: googleIdTokenPayload.email,
      role: Role.PATIENT,
      googleId: googleIdTokenPayload.sub,
    },
  });

  let user = ifPatientExistWithGoogleAuth;

  if (!ifPatientExistWithGoogleAuth) {
    const ifPatientExistWithCredentials = await prisma.user.findUnique({
      where: {
        email: googleIdTokenPayload.email,
        role: Role.PATIENT,
        authProvider: AuthProvider.CREDENTIAL,
      },
    });

    if (ifPatientExistWithCredentials) {
      if (!ifPatientExistWithCredentials.emailVerified) {
        throw new Error("Email not verified");
      }

      if (ifPatientExistWithCredentials.status === UserStatus.BLOCKED) {
        throw new Error("User is blocked");
      }
      if (
        ifPatientExistWithCredentials.isDeleted ||
        ifPatientExistWithCredentials.status === UserStatus.DELETED
      ) {
        throw new Error("User is Deleted");
      }

      user = await prisma.user.update({
        where: {
          id: ifPatientExistWithCredentials.id,
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
          role: Role.PATIENT,
          googleId: googleIdTokenPayload.sub,
          authProvider: AuthProvider.GOOGLE,
          emailVerified: true,
          patient: {
            create: {
              name: googleIdTokenPayload.name,
              email: googleIdTokenPayload.email,
            },
          },
        },
      });
        const templatePath = path.join(
    process.cwd(),
    "src/app/templates/patient-welcome-email.ejs",
  );
  const html = await ejs.renderFile(templatePath, {
    name: user.name,
  });

  await transporter.sendMail({
    from: config.email_sender,
    to: user.email,
    subject: "Welcome To PH Health Care",
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
  if (user.isDeleted || user.status === UserStatus.DELETED) {
    throw new Error("User is Deleted");
  }

  const jwtPayload = {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
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
    throw new Error("User user not varified");
  }

  if (isUserExist.status === "BLOCKED") {
    throw new Error("User is block");
  }
  if (isUserExist.isDeleted || isUserExist.status === "DELETED") {
    throw new Error("User is deleted");
  }
  if (isUserExist.googleId && isUserExist.authProvider === "GOOGLE") {
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
    from: config.email_sender,
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
    throw new Error("User user not varified");
  }

  if (isUserExist.status === "BLOCKED") {
    throw new Error("User is block");
  }
  if (isUserExist.isDeleted || isUserExist.status === "DELETED") {
    throw new Error("User is deleted");
  }
  if (isUserExist.googleId && isUserExist.authProvider === "GOOGLE") {
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
    Number(config.bcrypt_salt_rounds),
  );

  await prisma.user.update({
    where: {
      email: isUserExist.email,
    },
    data: {
      password: hashedNewPassword,
    },
  });

  await redisCLient.del([key]);

  const templatePath = path.join(
    process.cwd(),
    "src/app/templates/reset-password-success.ejs",
  );
  const html = await ejs.renderFile(templatePath, {
    name: isUserExist.name,
  });

  await transporter.sendMail({
    from: `"PH HealthCare" <${config.email_sender}>`,
    to: isUserExist.email,
    subject: "Security Notification: Password Changed",
    html,
  });
};

export const AuthService = {
  registerPatient,
  verifyPatientEmail,
  loginUser,
  getMe,
  refreshToken,
  googleLoginService,
  forgotPassword,
  resetPassword,
};

