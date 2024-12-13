import express, { Router } from "express";
import {
  getAllProducts,
  getProductById,
  searchProduct,
  filterProduct,
} from "../controllers/product.controller";
import validateRequest from "../middlewares/validateSchema";
import {
  getAllProductsSchema,
  productIdSchema,
  searchProductFullSchema,
  filterProductFullSchema,
} from "../Schema/product.schema";

const productRoute = Router();

// Define productRoute
productRoute.get(
  "/",
  // validateRequest({ body: getAllProductsSchema }),
  getAllProducts
);
productRoute.get(
  "/:productId",
  // validateRequest({ params: productIdSchema }),
  getProductById
);
productRoute.get(
  "/search/:searchTerm",
  // validateRequest({ body: searchProductFullSchema }),
  searchProduct
);
productRoute.get(
  "/filter/:categoryId",
  // validateRequest({ params: filterProductFullSchema }),
  filterProduct
);

export default productRoute;
