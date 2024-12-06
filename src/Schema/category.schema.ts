import { z } from "zod";

export const createCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().min(1, "Description is required"),
    image: z.string().optional(),
    slug: z.string().optional(),
    parentCategoryId: z.string().optional(),
  }),
});

export const updateCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required").optional(),
    description: z.string().min(1, "Description is required").optional(),
    image: z.string().optional(),
    slug: z.string().optional(),
  }),
  params: z.object({
    categoryId: z.string().length(24, "Invalid Category ID"),
  }),
});

export const fetchCategoryByIdSchema = z.object({
  params: z.object({
    categoryId: z.string().length(24, "Invalid Category ID"),
  }),
});

export const deleteCategorySchema = z.object({
  params: z.object({
    categoryId: z.string().length(24, "Invalid Category ID"),
  }),
});

export const createSubCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().min(1, "Description is required"),
    image: z.string().optional(),
    slug: z.string().optional(),
  }),
  params: z.object({
    categoryId: z.string().length(24, "Invalid Parent Category ID"),
  }),
});

export const updateSubCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required").optional(),
    description: z.string().min(1, "Description is required").optional(),
    image: z.string().optional(),
    slug: z.string().optional(),
  }),
  params: z.object({
    categoryId: z.string().length(24, "Invalid Parent Category ID"),
    subCategoryId: z.string().length(24, "Invalid Subcategory ID"),
  }),
});

export const deleteSubCategorySchema = z.object({
  params: z.object({
    categoryId: z.string().length(24, "Invalid Parent Category ID"),
    subCategoryId: z.string().length(24, "Invalid Subcategory ID"),
  }),
});

export const fetchSubCategoryByIdSchema = z.object({
  params: z.object({
    categoryId: z.string().length(24, "Invalid Parent Category ID"),
    subCategoryId: z.string().length(24, "Invalid Subcategory ID"),
  }),
});

export const fetchProductBySubCategorySchema = z.object({
  params: z.object({
    subCategoryId: z.string().length(24, "Invalid Subcategory ID"),
  }),
});
