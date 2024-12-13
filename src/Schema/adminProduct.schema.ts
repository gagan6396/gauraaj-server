import { z } from "zod";

export const addNewProductSchema = z.object({
  name: z.string().min(1, "Product name is required."),
  description: z.string().min(1, "Product description is required."),
  price: z.number().positive("Price must be a positive number."),
  stock: z.number().int().min(0, "Stock must be a non-negative integer."),
  images: z.array(z.string().url("Each image URL must be valid.")),
  supplier_id: z.string().min(1, "Supplier ID is required."),
  category_id: z.string().min(1, "Category ID is required."),
});

export const updateProductSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  price: z.number().positive("Price must be a positive number.").optional(),
  stock: z
    .number()
    .int()
    .min(0, "Stock must be a non-negative integer.")
    .optional(),
  images: z.array(z.string().url("Each image URL must be valid.")).optional(),
  supplier_id: z.string().optional(),
  category_id: z.string().optional(),
});

export const productIdParamSchema = z.object({
  productId: z.string().min(1, "Product ID is required."),
});

// Schema for deleting a product
export const deleteProductSchema = productIdParamSchema;
