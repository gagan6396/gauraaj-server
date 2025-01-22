import { Router } from "express";
import {
  addProductBySupplier,
  deleteProductBySupplier,
  getAllSupplierProducts,
  updateProductBySupplier,
} from "../controllers/supplierProduct.controller";
import handleImageUpload from "../middlewares/imageMiddleware";

const supplierProductRoute = Router();

// Define here the supplierProduct Routes
supplierProductRoute.post(
  "/:supplierId",
  handleImageUpload,
  addProductBySupplier
);
supplierProductRoute.patch(
  "/:supplierId",
  handleImageUpload,
  // validateRequest({
  //   params: supplierIdParamsSchema,
  //   body: supplierUpdateProductSchema,
  // }),
  updateProductBySupplier
);
supplierProductRoute.delete(
  "/:supplierId/:productId",
  // validateRequest({ params: supplierIdParamsSchema }),
  deleteProductBySupplier
);
supplierProductRoute.get(
  "/:supplierId",
  // validateRequest({
  //   params: supplierIdParamsSchema,
  //   body: getAllSupplierProductsSchema,
  // }),
  getAllSupplierProducts
);

export default supplierProductRoute;
