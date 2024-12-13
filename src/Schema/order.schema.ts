import { z } from "zod";

export const createOrderSchema = z.object({
  userId: z.string().min(1, "User ID is required."),
  products: z
    .array(
      z.object({
        productId: z.string().min(1, "Product ID is required."),
        quantity: z.number().min(1, "Quantity must be at least 1."),
      })
    )
    .min(1, "At least one product is required."),
  shippingAddressId: z.string().min(1, "Shipping address ID is required."),
  payment_id: z.string().min(1, "Payment ID is required."),
});

export const getOrderSchema = z.object({
  orderId: z.string().min(1, "Order ID is required."),
  userId: z.string().min(1, "User ID is required."),
});

export const cancelOrderSchema = z.object({
  orderId: z.string().min(1, "Order ID is required."),
  userId: z.string().min(1, "User ID is required."),
});

export const returnOrderSchema = z.object({
  orderId: z.string().min(1, "Order ID is required."),
  userId: z.string().min(1, "User ID is required."),
  reason: z.string().min(1, "Reason is required."),
  products: z
    .array(
      z.object({
        productId: z.string().min(1, "Product ID is required."),
        quantity: z.number().min(1, "Quantity must be at least 1."),
      })
    )
    .min(1, "At least one product is required."),
});

export const exchangeOrderSchema = z.object({
  orderId: z.string().min(1, "Order ID is required."),
  userId: z.string().min(1, "User ID is required."),
  reason: z.string().min(1, "Reason is required."),
  products: z
    .array(
      z.object({
        productId: z.string().min(1, "Product ID is required."),
        quantity: z.number().min(1, "Quantity must be at least 1."),
      })
    )
    .min(1, "At least one product is required."),
});
