import { z } from "zod";

export const supplierIdParamsSchema = z.object({
  supplierId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid Supplier ID format"),
});

// add product
export const supplierAddProductSchema = z.object({
  name: z.string().min(2, "Product name must be at least 2 characters long"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  price: z
    .number()
    .positive("Price must be a positive number")
    .max(1000000, "Price exceeds the allowed limit"),
  stock: z
    .number()
    .int("Stock must be an integer")
    .nonnegative("Stock must be a non-negative number"),
  category_id: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid Category ID format"),
  subcategory_id: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid Subcategory ID format")
    .optional(),
  imageUrl: z.string().url("Invalid image URL"),
});

// updating product schema
export const supplierUpdateProductSchema = z.object({
  productId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Product ID format"),
  name: z.string().min(2).optional(),
  description: z.string().min(10).optional(),
  price: z.number().positive().optional(),
  stock: z.number().int().nonnegative().optional(),
  category_id: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .optional(),
  subcategory_id: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .optional(),
  images: z.array(z.string().url("Invalid image URL")).optional(),
});

// getAllSupplierProducts

export const getAllSupplierProductsSchema = z.object({
  supplierId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid Supplier ID format"),
});

// TODO: Write the bulk insertion product Schema here
// export const supplierBulkProductInsertion = z.object({});
