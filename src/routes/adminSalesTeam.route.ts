import { Router } from "express";
<<<<<<< HEAD
import {
  assignRoleToSalesMember,
  assignSalesTarget,
  assignTerritoryToSalesMember,
  deleteSalesTeamMember,
  getAllSalesTeamMember,
  getSalesTeamLeaderboard,
  getSalesTeamMemberById,
  getTeamOverview,
  updatedPerformanceMetrics,
  updateSalesPerformance,
  updateSalesTeamMember,
} from "../controllers/adminSalesTeam.controller";
import adminAuthMiddleware from "../middlewares/adminMiddleware";
import authMiddleware from "../middlewares/authMiddleware";
=======
import adminAuthMiddleware from "../middlewares/adminMiddleware";
import {
  getAllSalesTeamMember,
  getSalesTeamMemberById,
  updateSalesTeamMember,
  deleteSalesTeamMember,
  updateSalesPerformance,
  assignSalesTarget,
  getSalesTeamLeaderboard,
  assignRoleToSalesMember,
  assignTerritoryToSalesMember,
  getTeamOverview,
  updatedPerformanceMetrics,
} from "../controllers/adminSalesTeam.controller";
import authMiddleware from "../middlewares/authMiddleware";
import validateRequest from "../middlewares/validateSchema";
import {
  updateSalesPerformanceSchema,
  assignSalesTargetSchema,
  adminSalesTeamValidationSchemas,
} from "../Schema/adminSales.schema";
>>>>>>> ravichandra/main
import adminSupplierRoute from "./adminSupplier.route";

const adminSalesTeamRoute = Router();

adminSalesTeamRoute.get(
  "/sales/members",
  adminAuthMiddleware,
  getAllSalesTeamMember
);
adminSalesTeamRoute.get(
  "/sales/member/:memberId",
  adminAuthMiddleware,
  getSalesTeamMemberById
);
adminSalesTeamRoute.put(
  "/sales/member/:memberId",
  adminAuthMiddleware,
  updateSalesTeamMember
);
adminSalesTeamRoute.delete(
  "/sales/member/:memberId",
  adminAuthMiddleware,
  deleteSalesTeamMember
);

// new Routes

adminSalesTeamRoute.put(
  "/sales/performance/update",
  authMiddleware,
  // validateRequest({ body: updateSalesPerformanceSchema }),
  updateSalesPerformance
);
adminSalesTeamRoute.put(
  "/sales/members/:memberId/assign-target",
  adminAuthMiddleware,
  // validateRequest({ body: assignSalesTargetSchema }),
  assignSalesTarget
);
adminSalesTeamRoute.get(
  "/sales/teams/performance/leaderboard",
  adminAuthMiddleware,
  getSalesTeamLeaderboard
);

// Role and territory distribution
adminSalesTeamRoute.put(
  "/sales/member/:memberId/assign-role",
  adminAuthMiddleware,
  assignRoleToSalesMember
);
adminSalesTeamRoute.put(
  "/sales/member/:memberId/assign-territory",
  adminAuthMiddleware,
  assignTerritoryToSalesMember
);

// Team overview api
adminSalesTeamRoute.get(
  "/sales/team/overview",
  adminAuthMiddleware,
  getTeamOverview
);

// Sales Team metrics update
adminSupplierRoute.post(
  "/sales/:memberId/update-metrics",
  adminAuthMiddleware,
  updatedPerformanceMetrics
);

export default adminSalesTeamRoute;
