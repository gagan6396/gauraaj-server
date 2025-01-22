import { Router } from "express";
import {
  addProductBySupplier,
  updateProductBySupplier,
  getAllSupplierProducts,
  deleteProductBySupplier,
} from "../controllers/supplierProduct.controller";
import handleImageUpload from "../middlewares/imageMiddleware";
import validateRequest from "../middlewares/validateSchema";
import {
  supplierIdParamsSchema,
  supplierAddProductSchema,
  supplierUpdateProductSchema,
  getAllSupplierProductsSchema,
} from "../Schema/supplierProduct.schema";

const supplierProductRoute = Router();

// Define here the supplierProduct Routes
supplierProductRoute.post(
  "/:supplierId",
  handleImageUpload,
<<<<<<< HEAD
  // validateRequest({
  //   params: supplierIdParamsSchema,
  //   body: supplierAddProductSchema,
  // }),
=======
>>>>>>> ravichandra/main
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
