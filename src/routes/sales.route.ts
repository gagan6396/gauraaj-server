import { Router } from "express";
import {
  registerSalesMember,
  loginSalesMember,
  logOut,
  forgotPasswordSalesMember,
  resetSalesMemberPassword,
  getAssignedTerritories,
  getSalesMemberProfile,
  updateSalesMemberProfile,
  getPerformanceMetrics,
} from "../controllers/sales.controller";

const salesRoute = Router();

// SalesMember Profile Routes
salesRoute.post("/member/:memberId/profile", getSalesMemberProfile);
salesRoute.put("/member/:memberId/profile", updateSalesMemberProfile);
salesRoute.get("/member/:memberId/metrics", getPerformanceMetrics);

// Existing Routes
salesRoute.post("/member/register", registerSalesMember);
salesRoute.post("/member/login", loginSalesMember);
salesRoute.post("/member/logout", logOut);
salesRoute.post("/member/forgot-password", forgotPasswordSalesMember);
salesRoute.post("/member/reset-password", resetSalesMemberPassword);

// New Routes
salesRoute.get("/member/:memberId/territories", getAssignedTerritories);

export default salesRoute;
