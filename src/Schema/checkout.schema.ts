import { z } from "zod";

export const validateCartSchema = z.object({
  userId: z.string().min(24).max(24),
});

export const applyCouponSchema = z.object({
  code: z.string().min(1, "Coupon code is required"),
});

export const reviewOrderSchema = z.object({
  userId: z.string().min(24).max(24),
  shippingOption: z.enum(["standard", "express"]).default("standard"),
});

export const confirmOrderSchema = z.object({
  shippingOption: z.enum(["standard", "express"]).default("standard"),
});
