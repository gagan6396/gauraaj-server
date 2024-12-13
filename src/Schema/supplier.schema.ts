import { z } from "zod";
import { exchangeOrder } from "../controllers/order.controller";

// Supplier Registration logic
export const supplierRegisterSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters long"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be atleast 8 character long")
    .max(25, "Password not more than 25 characters"),
  phone: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(13, "Phone number cannot exceed 13 digits"),
  shop_name: z.string().min(2, "Shop name must be at least 2 characters long"),
  shop_address: z.object({
    street: z.string().min(1, "Street address is required"),
    city: z.string().min(1, "City is required"),
    state: z.string().min(1, "State is required"),
    postalCode: z.string().regex(/^\d{5}(-\d{4})?$/, "Invalid postal code"),
    country: z.string().min(2, "Country is required"),
  }),
});

// Supplier login schema validation
export const supplierLoginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
});

// Supplier forgat password validation
export const supplierForgatSchema = z.object({
  email: z.string().email("Invalid email format"),
});

// Supplier reset password validation
export const supplierResetSchema = z.object({
  email: z.string().email("Invalid email address"),
  otp: z.string().regex(/^\d{6}$/, "OTP must be a 6-digit number"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .max(50, "Password cannot exceed 50 characters"),
});