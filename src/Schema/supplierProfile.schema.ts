import { z } from "zod";

export const supplierIdParamSchema = z.object({
  supplierId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid Supplier ID format"),
});

export const updateSupplierProfileSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters long")
    .optional(),
  email: z.string().email("Invalid email address").optional(),
  phone: z
    .string()
    .regex(/^\+?\d{10,15}$/, "Invalid phone number format")
    .optional(),
  shop_name: z
    .string()
    .min(2, "Shop name must be at least 2 characters long")
    .optional(),
  shop_address: z
    .object({
      street: z.string().min(1, "Street address is required").optional(),
      city: z.string().min(1, "City is required").optional(),
      state: z.string().min(1, "State is required").optional(),
      postalCode: z
        .string()
        .regex(/^\d{5}(-\d{4})?$/, "Invalid postal code")
        .optional(),
      country: z.string().min(2, "Country is required").optional(),
    })
    .optional(),
  imageUrls: z.array(z.string().url("Invalid image URL")).optional(), // For multiple image URLs
  imageUrl: z.string().url("Invalid image URL").optional(), // For single image URL
});
