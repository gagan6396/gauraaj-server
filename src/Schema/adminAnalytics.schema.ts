import { z } from "zod";

export const totalSalesAnalyticsQuerySchema = z.object({
  startDate: z
    .string()
    .min(1, "Start date is required")
    .refine((val) => !isNaN(Date.parse(val)), {
      message: "Invalid start date format",
    }),
  endDate: z
    .string()
    .min(1, "End date is required")
    .refine((val) => !isNaN(Date.parse(val)), {
      message: "Invalid end date format",
    }),
});

