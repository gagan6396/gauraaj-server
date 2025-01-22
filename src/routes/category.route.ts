import { Router } from "express";
import {
  createCategory,
<<<<<<< HEAD
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
=======
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
>>>>>>> ravichandra/main

const categoryRoute = Router();

// Define here category routes
<<<<<<< HEAD
categoryRoute.post("/", createCategory);
=======
categoryRoute.post("/", handleImageUpload, createCategory);
>>>>>>> ravichandra/main
categoryRoute.get("/", getAllCategory);
categoryRoute.get("/:categoryId", fetchCategoryById);
categoryRoute.get("/:categoryId/subcategory", subCategoryFetching);
categoryRoute.put("/:categoryId", updateCategory);
categoryRoute.delete("/:categoryId", deleteCategory);

// Subcategory Creation
<<<<<<< HEAD
categoryRoute.post("/:categoryId/subcategory", createSubCategory);

=======
categoryRoute.post(
  "/:categoryId/subcategory",
  handleImageUpload,
  createSubCategory
);
>>>>>>> ravichandra/main
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
