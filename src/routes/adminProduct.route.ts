import { Router } from "express";
import {
  getAllProducts,
  addNewProduct,
  updateProductById,
  deleteProductById,
} from "../controllers/adminProduct.controller";
import adminAuthMiddleware from "../middlewares/adminMiddleware";
import {
  addNewProductSchema,
  updateProductSchema,
  productIdParamSchema,
  deleteProductSchema,
} from "../Schema/adminProduct.schema";
import validateRequest from "../middlewares/validateSchema";

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
