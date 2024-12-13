import { z } from "zod";

export const productIdSchema = z.object({
  productId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid product ID format"),
});

export const paginationSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : undefined)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : undefined)),
});

export const searchProductSchema = z.object({
  searchTerm: z
    .string()
    .min(1, "Search term must not be empty")
    .max(100, "Search term is too long"),
});

export const filterProductSchema = z.object({
  minPrice: z
    .string()
    .optional()
    .transform((val) => (val ? parseFloat(val) : undefined)),
  maxPrice: z
    .string()
    .optional()
    .transform((val) => (val ? parseFloat(val) : undefined)),
  inStock: z
    .string()
    .optional()
    .refine((val) => val === "true" || val === "false", {
      message: "inStock must be 'true' or 'false'",
    })
    .transform((val) => (val === "true" ? true : false)),
  supplierId: z
    .string()
    .regex(/^[a-f\d]{24}$/i, "Invalid supplier ID format")
    .optional(),
  rating: z
    .string()
    .optional()
    .transform((val) => (val ? parseFloat(val) : undefined)),
  subcategoryId: z
    .string()
    .regex(/^[a-f\d]{24}$/i, "Invalid subcategory ID format")
    .optional(),

  sortBy: z.string().optional(),
  sortOrder: z
    .string()
    .optional()
    .refine((val) => val === "asc" || val === "desc", {
      message: "sortOrder must be 'asc' or 'desc'",
    }),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 10)),
});

export const filterProductParamsSchema = z.object({
  categoryId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid category ID format"),
});
export const filterProductQuerySchema = filterProductSchema;

export const filterProductFullSchema = z.object({
  params: filterProductParamsSchema,
  query: filterProductQuerySchema,
});

export const getAllProductsSchema = z.object({
  query: paginationSchema,
});

// Schema for searchProduct API
export const searchProductFullSchema = z.object({
  params: searchProductSchema,
});

export type ProductIdParams = z.infer<typeof productIdSchema>;
export type PaginationQuery = z.infer<typeof paginationSchema>;
export type SearchProductParams = z.infer<typeof searchProductSchema>;
export type FilterProductParams = z.infer<typeof filterProductParamsSchema>;
export type FilterProductQuery = z.infer<typeof filterProductQuerySchema>;
