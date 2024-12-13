import { Router } from "express";
import {
  getGeneralAnalytics,
  getUserAnalytics,
  getOrderAnalytics,
  getTotalSalesAnalytics,
  adminDashboard,
} from "../controllers/adminAnalytics.controller";
import adminAuthMiddleware from "../middlewares/adminMiddleware";
import validateRequest from "../middlewares/validateSchema";
import { totalSalesAnalyticsQuerySchema } from "../Schema/adminAnalytics.schema";

const adminAnalyticsRoute = Router();

// Analytics Routes
adminAnalyticsRoute.get("/analytics", adminAuthMiddleware, getGeneralAnalytics);
adminAnalyticsRoute.get(
  "/analytics/users",
  adminAuthMiddleware,
  // validateRequest({}),
  getUserAnalytics
);
adminAnalyticsRoute.get(
  "/analytics/orders",
  adminAuthMiddleware,
  // validateRequest({}),
  getOrderAnalytics
);
adminAnalyticsRoute.get(
  "/analytics/sales",
  adminAuthMiddleware,
  // validateRequest({ query: totalSalesAnalyticsQuerySchema }),
  getTotalSalesAnalytics
);

adminAnalyticsRoute.get("/dashboard", adminAuthMiddleware, adminDashboard);

export default adminAnalyticsRoute;
