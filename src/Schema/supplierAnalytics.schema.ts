import { z } from "zod";


export const supplierIdSchema = z.object({
  supplierId: z
    .string()
    .regex(/^[a-f\d]{24}$/i, { message: "Invalid Supplier ID format." }),
});

export const salesAnalyticsQuerySchema = z.object({
  range: z.enum(["daily", "weekly", "monthly", "yearly"]).optional(),
});


export const salesAnalyticsSchema = z.object({
  params: supplierIdSchema,
  query: salesAnalyticsQuerySchema,
});


export const ratingsAnalyticsSchema = z.object({
  params: supplierIdSchema,
});
