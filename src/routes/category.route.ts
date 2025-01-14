import { Router } from "express";
import {
  createCategory,
  createSubCategory,
  deleteCategory,
  deleteSubCategory,
  fetchCategoryById,
  fetchProductBySubCategory,
  fetchSubCategoryById,
  getAllCategory,
  getSubcategorySkuParameters,
  subCategoryFetching,
  updateCategory,
  updateSubCategory,
} from "../controllers/category.controller";

const categoryRoute = Router();

// Define here category routes
categoryRoute.post("/", createCategory);
categoryRoute.get("/", getAllCategory);
categoryRoute.get("/:categoryId", fetchCategoryById);
categoryRoute.get("/:categoryId/subcategory", subCategoryFetching);
categoryRoute.put("/:categoryId", updateCategory);
categoryRoute.delete("/:categoryId", deleteCategory);

// Subcategory Creation
categoryRoute.post("/:categoryId/subcategory", createSubCategory);

categoryRoute.get(
  "/:categoryId/subcategory/:subCategoryId",
  fetchSubCategoryById
);
categoryRoute.put("/:categoryId/subcategory/:subCategoryId", updateSubCategory);
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

export default categoryRoute;
