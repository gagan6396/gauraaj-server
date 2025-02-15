import { Router } from "express";
import {
  addProductBySupplier,
  deleteProductBySupplier,
  getAllSupplierProducts,
  getProductById,
  updateProductBySupplier,
} from "../controllers/supplierProduct.controller";
import authMiddleware from "../middlewares/authMiddleware";
import handleImageUpload from "../middlewares/imageMiddleware";

const supplierProductRoute = Router();

// Define here the supplierProduct Routes
supplierProductRoute.post(
  "/",
  authMiddleware,
  handleImageUpload,
  addProductBySupplier
);
supplierProductRoute.patch(
  "/:productId",
  authMiddleware,
  handleImageUpload,
  updateProductBySupplier
);
supplierProductRoute.delete(
  "/:productId",
  authMiddleware,
  deleteProductBySupplier
);
supplierProductRoute.get(
  "/product-by-id/:productId",
  authMiddleware,
  getProductById
);
supplierProductRoute.get(
  "/:supplierId",
  authMiddleware,
  getAllSupplierProducts
);

export default supplierProductRoute;
