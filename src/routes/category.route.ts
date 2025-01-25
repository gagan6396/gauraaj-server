import { Router } from "express";
import {
  createCategory,
  getAllCategory,
  updateCategory,
  subCategoryFetching,
  deleteCategory,
  createSubCategory,
  updateSubCategory,
  deleteSubCategory,
  fetchCategoryById,
  fetchSubCategoryById,
  fetchProductBySubCategory,
  getAllSubcategories,
  getSubcategorySkuParameters,
} from "../controllers/category.controller";
import {
  createCategorySchema,
  updateCategorySchema,
  fetchCategoryByIdSchema,
  deleteCategorySchema,
  createSubCategorySchema,
  updateSubCategorySchema,
  deleteSubCategorySchema,
  fetchSubCategoryByIdSchema,
  fetchProductBySubCategorySchema,
} from "../Schema/category.schema";
import validateRequest from "../middlewares/validateSchema";
import handleImageUpload from "../middlewares/imageMiddleware";

const categoryRoute = Router();

// Define here category routes
categoryRoute.post("/", handleImageUpload, createCategory);
categoryRoute.get("/", getAllCategory);
categoryRoute.get("/:categoryId", fetchCategoryById);
categoryRoute.get("/:categoryId/subcategory", subCategoryFetching);
categoryRoute.put("/:categoryId", handleImageUpload, updateCategory);
categoryRoute.delete("/:categoryId", deleteCategory);

// Subcategory Creation
categoryRoute.post(
  "/:categoryId/subcategory",
  handleImageUpload,
  createSubCategory
);
categoryRoute.get(
  "/:categoryId/subcategory/:subCategoryId",
  fetchSubCategoryById
);
categoryRoute.put(
  "/:categoryId/subcategory/:subCategoryId",
  handleImageUpload,
  updateSubCategory
);

categoryRoute.delete(
  "/:categoryId/subcategory/:subCategoryId",
  deleteSubCategory
);

// SubCategory Product
categoryRoute.get("/subcategory/:subCategoryId", fetchProductBySubCategory);

// GetSubcategoryParameters
categoryRoute.get(
  "/:categoryId/subcategory/:subCategoryId/parameters",
  getSubcategorySkuParameters
);

categoryRoute.get("/:categoryId/subcategories", getAllSubcategories);

export default categoryRoute;
