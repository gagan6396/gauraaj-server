import { Router } from "express";
import {
  getSupplierProfile,
  updateSupplierProfile,
} from "../controllers/supplierProfile.controller";
import handleImageUpload from "../middlewares/imageMiddleware";
import validateRequest from "../middlewares/validateSchema";
import {
  supplierIdParamSchema,
  updateSupplierProfileSchema,
} from "../Schema/supplierProfile.schema";

const supplierProfileRoute = Router();

// Define here the profile Routes
supplierProfileRoute.get(
  "/:supplierId",
  // validateRequest({ params: supplierIdParamSchema }),
  getSupplierProfile
);
supplierProfileRoute.patch(
  "/:supplierId",
  handleImageUpload,
  // validateRequest({
  //   params: supplierIdParamSchema,
  //   body: updateSupplierProfileSchema,
  // }),
  updateSupplierProfile
);

export default supplierProfileRoute;
