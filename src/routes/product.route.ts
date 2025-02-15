import { Router } from "express";
import {
  filterProduct,
  getAllProducts,
  getProductById,
  searchProduct,
} from "../controllers/product.controller";
import authMiddleware from "../middlewares/authMiddleware";

const productRoute = Router();

// Define productRoute
productRoute.get("/", authMiddleware, getAllProducts);
productRoute.get("/:productId", authMiddleware, getProductById);
productRoute.get("/search/:searchTerm", searchProduct);
productRoute.get("/filter/:categoryId", filterProduct);

export default productRoute;
