import { Router } from "express";
import {
  getSupplierAnalytics,
  getSupplierRatingsAnalytics,
} from "../controllers/supplierAnalytics.controller";
import validateRequest from "../middlewares/validateSchema";
import {
  supplierIdSchema,
  salesAnalyticsQuerySchema,
  salesAnalyticsSchema,
  ratingsAnalyticsSchema,
} from "../Schema/supplierAnalytics.schema";

const supplierAnalyticsRoute = Router();

// Deifining routes here
supplierAnalyticsRoute.get(
  "/:supplierId/sales",
  // validateRequest({
  //   params: supplierIdSchema,
  //   body: salesAnalyticsQuerySchema,
  // }),
  getSupplierAnalytics
);
supplierAnalyticsRoute.get(
  "/:supplierId/ratings",
  // validateRequest({ params: supplierIdSchema, body: ratingsAnalyticsSchema }),
  getSupplierRatingsAnalytics
);

export default supplierAnalyticsRoute;

// http://localhost:3001/api/v1/supplier/analytics/:supplierId/sales
