import { Router } from "express";
import {
  addNewProduct,
  deleteProductById,
  getAllProducts,
  updateProductById,
} from "../controllers/adminProduct.controller";
import adminAuthMiddleware from "../middlewares/adminMiddleware";

const adminProductRoute = Router();

// Product Management Routes
adminProductRoute.get("/", adminAuthMiddleware, getAllProducts);
adminProductRoute.post(
  "/",
  adminAuthMiddleware,
  // validateRequest({ body: addNewProductSchema }),
  addNewProduct
);
adminProductRoute.patch(
  "/:productId",
  adminAuthMiddleware,
  // validateRequest({
  //   params: productIdParamSchema,
  //   body: updateProductSchema,
  // }),
  updateProductById
);
adminProductRoute.delete(
  "/:productId",
  adminAuthMiddleware,
  // validateRequest({
  //   body: deleteProductSchema,
  // }),
  deleteProductById
);

export default adminProductRoute;
