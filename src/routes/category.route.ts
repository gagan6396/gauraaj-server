import { Router } from "express";
import {
  createCategory,
  createSubCategory,
  deleteCategory,
  deleteSubCategory,
  fetchCategoryById,
  fetchProductByCategory,
  fetchProductBySubCategory,
  fetchSubCategoryById,
  getAllCategory,
  getAllSubcategories,
  getSubcategorySkuParameters,
  subCategoryFetching,
  updateCategory,
  updateCategorySequence,
  updateSubCategory,
} from "../controllers/category.controller";
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

categoryRoute.patch("/update-sequence/:categoryId", updateCategorySequence);

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
categoryRoute.get("/category/:CategoryId", fetchProductByCategory);

// GetSubcategoryParameters
categoryRoute.get(
  "/:categoryId/subcategory/:subCategoryId/parameters",
  getSubcategorySkuParameters
);

categoryRoute.get("/:categoryId/subcategories", getAllSubcategories);

export default categoryRoute;
