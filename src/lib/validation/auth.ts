import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Enter a valid email address")
    .max(200, "Email is too long"),
  password: z.string().min(1, "Enter your password").max(200),
});

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .max(80, "Name is too long")
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .trim()
    .email("Enter a valid email address")
    .max(200, "Email is too long"),
  password: z
    .string()
    .min(8, "Use at least 8 characters")
    .max(200, "Password is too long"),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Enter a valid email address")
    .max(200, "Email is too long"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
