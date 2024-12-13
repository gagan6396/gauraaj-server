import express, { Router } from "express";
import {
  getAllUserByAdmin,
  updateUserProfile,
  deleteUserByAdmin,
} from "../controllers/adminUser.controller";
import adminAuthMiddleware from "../middlewares/adminMiddleware";
const adminUserRoute = Router();

adminUserRoute.get("/users", adminAuthMiddleware, getAllUserByAdmin);
adminUserRoute.put("/users/:userId", adminAuthMiddleware, updateUserProfile);
adminUserRoute.delete("/users/:userId", adminAuthMiddleware, deleteUserByAdmin);

export default adminUserRoute;
