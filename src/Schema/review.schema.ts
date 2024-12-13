import { z } from "zod";

// Add Review Schema
export const addReviewSchema = z.object({
  userId: z.string().length(24, "Invalid user ID format"),
  productId: z.string().length(24, "Invalid product ID format"),
  rating: z
    .number()
    .min(1, "Rating must be at least 1")
    .max(5, "Rating cannot exceed 5"),
  comment: z.string().nonempty("Comment is required"),
  images: z.array(z.string().url()).optional(),
});

// Update Review Schema
export const updateReviewSchema = z
  .object({
    rating: z
      .number()
      .min(1, "Rating must be at least 1")
      .max(5, "Rating cannot exceed 5")
      .optional(),
    comment: z.string().optional(),
    images: z.array(z.string().url()).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message:
      "At least one field (rating, comment, or images) must be provided for update",
  });

// Review ID Validation Schema
export const reviewIdParamSchema = z.object({
  reviewId: z.string().length(24, "Invalid review ID format"),
});

// Product ID Validation Schema
export const productIdParamSchema = z.object({
  productId: z.string().length(24, "Invalid product ID format"),
});
