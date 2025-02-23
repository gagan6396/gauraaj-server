import { Router } from "express";
import {
  filterProduct,
  getAllProducts,
  getAllProductsWithOutAuth,
  getProductById,
  getProductByIdWithOutAuth,
  searchProduct,
} from "../controllers/product.controller";
import authMiddleware from "../middlewares/authMiddleware";

const productRoute = Router();

// Define productRoute
productRoute.get("/", getAllProductsWithOutAuth);
productRoute.get("/auth", authMiddleware, getAllProducts);
productRoute.get("/:productId", getProductByIdWithOutAuth);
productRoute.get("/auth/:productId", authMiddleware, getProductById);
productRoute.get("/search/:searchTerm", searchProduct);
productRoute.get("/filter/:categoryId", filterProduct);

export default productRoute;
