import { Router } from "express";
import {
  filterProduct,
  getAllProducts,
  getProductById,
  searchProduct,
} from "../controllers/product.controller";

const productRoute = Router();

// Define productRoute
productRoute.get("/", getAllProducts);
productRoute.get("/:productId", getProductById);
productRoute.get("/search/:searchTerm", searchProduct);
productRoute.get("/filter/:categoryId", filterProduct);

export default productRoute;
