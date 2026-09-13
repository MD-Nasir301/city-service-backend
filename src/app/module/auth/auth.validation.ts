import z from "zod";

const CitizenRegistrationZodSchema = z.object({
  name: z.string(),
  email: z.string(),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long." })
    .max(100, { message: "Password cannot exceed 100 characters." })
    .regex(/[A-Z]/, {
      message: "Password must contain at least one uppercase letter.",
    })
    .regex(/[a-z]/, {
      message: "Password must contain at least one lowercase letter.",
    })
    .regex(/[0-9]/, { message: "Password must contain at least one number." })
    .regex(/[^a-zA-Z0-9]/, {
      message: "Password must contain at least one special character.",
    }),
  phoneNumber: z.string().optional(),
});

const CitizenEmailVerifyZodSchema = z.object({
  email: z.string(),
  otp: z.string().length(6),
});

const LoginZodSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long." })
    .max(100, { message: "Password cannot exceed 100 characters." })
    .regex(/[A-Z]/, {
      message: "Password must contain at least one uppercase letter.",
    })
    .regex(/[a-z]/, {
      message: "Password must contain at least one lowercase letter.",
    })
    .regex(/[0-9]/, { message: "Password must contain at least one number." })
    .regex(/[^a-zA-Z0-9]/, {
      message: "Password must contain at least one special character.",
    }),
});

const ForgotPasswordZodSchema = z.object({
  email: z.string().email(),
});

const ResetPasswordZodSchema = z.object({
  email: z.string().email(),
  newPassword: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long." })
    .max(100, { message: "Password cannot exceed 100 characters." })
    .regex(/[A-Z]/, {
      message: "Password must contain at least one uppercase letter.",
    })
    .regex(/[a-z]/, {
      message: "Password must contain at least one lowercase letter.",
    })
    .regex(/[0-9]/, { message: "Password must contain at least one number." })
    .regex(/[^a-zA-Z0-9]/, {
      message: "Password must contain at least one special character.",
    }),
  otp: z.string().length(6),
});

export const userValidation = {
  CitizenRegistrationZodSchema,
  CitizenEmailVerifyZodSchema,
  LoginZodSchema,
  ForgotPasswordZodSchema,
  ResetPasswordZodSchema,
};