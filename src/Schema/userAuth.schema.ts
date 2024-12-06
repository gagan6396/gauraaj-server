import { z } from "zod";

// User Registration schema
export const registerSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email format"),
  phone: z.string().regex(/^\d{10}$/, "Phone number must be 10 digits"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password cannot exceed 100 characters"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid Email format"),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email format"),
});

export const resetPasswordSchema = z.object({
  email: z.string().email("Invalid email format"),
  otp: z
    .string()
    .length(6, "OTP must be exactly of 6 characters")
    .regex(/^\d{6}$/, "OTP must be numeric"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(25, "password can't exceed 25 characters"),
});
