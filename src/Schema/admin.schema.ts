import { z } from "zod";

export const adminLoginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(20, "Password not longer than 20 characters"),
});
