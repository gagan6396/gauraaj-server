import { z } from "zod";


export const updateSalesPerformanceSchema = z.object({
  totalSales: z
    .number()
    .min(0, "Total sales must be greater than or equal to 0"),
  numberOfClients: z
    .number()
    .min(0, "Number of clients must be greater than or equal to 0"),
  incentivesEarned: z
    .number()
    .min(0, "Incentives earned must be greater than or equal to 0"),
  conversionRate: z
    .number()
    .min(0, "Conversion rate must be greater than or equal to 0")
    .max(100),
});


export const assignSalesTargetSchema = z.object({
  targetAmount: z
    .number()
    .min(0, "Target amount must be greater than or equal to 0"),
  period: z.string().nonempty("Period is required"),
});


export const adminSalesTeamValidationSchemas = {
  updateSalesPerformanceSchema,
  assignSalesTargetSchema,
};
