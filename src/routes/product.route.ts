// routes/supplierProduct.routes.ts
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

// Define supplier product routes
supplierProductRoute.post(
  "/",
  authMiddleware,
  handleImageUpload, // Handles image uploads; we'll extend it for video if needed
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
supplierProductRoute.get("/product-by-id/:productId", getProductById);
supplierProductRoute.get("/:supplierId", getAllSupplierProducts);

export default supplierProductRoute;
