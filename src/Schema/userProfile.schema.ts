import { z } from "zod";

export const userIdParamSchema = z.object({
  userId: z.string().refine((id) => id.match(/^[0-9a-fA-F]{24}$/), {
    message: "Invalid user ID",
  }),
});

export const profileUpdateSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  profileImage: z.string().url().optional(),
  shoppingAddress: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zip: z.string().optional(),
    })
    .optional(),
});

export const productIdParamSchema = z.object({
  productId: z.string().refine((id) => id.match(/^[0-9a-fA-F]{24}$/), {
    message: "Invalid product ID",
  }),
});

export const wishlishAddSchema = z.object({
  productId: z.string().refine((id) => id.match(/^[0-9a-fA-F]{24}$/), {
    message: "Invalid product ID",
  }),
});

export const wishlistUpdateSchema = z.object({
  productIds: z
    .array(
      z.string().refine((id) => id.match(/^[0-9a-fA-F]{24}$/), {
        message: "Invalid product ID",
      })
    )
    .nonempty("Product IDs must be a non-empty array"),
});

export const loyaltiReedemSchema = z.object({
  PointsToRedeem: z.number().int().positive("Points must be greater than 0"),
  description: z.string().nonempty("Description is required"),
});


