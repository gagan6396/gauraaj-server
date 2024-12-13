import { z } from "zod";

export const getUserCartSchema = z.object({
  userId: z.string().min(1, "User ID is required."),
});

export const addProductToCartSchema = z.object({
  userId: z.string().min(1, "User ID is required."),
  quantity: z.number().min(1, "Quantity must be greater than 0."),
});

export const updateCartSchema = z.object({
  userId: z.string().min(1, "User ID is required."),
  quantity: z.number().min(0, "Quantity must be zero or greater."),
});

export const deleteProductFromCartSchema = z.object({
  userId: z.string().min(1, "User ID is required."),
});

export const productIdParamSchema = z.object({
  productId: z.string().min(1, "Product ID is required."),
});
