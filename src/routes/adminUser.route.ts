import { Router } from "express";
import {
  deleteUserByAdmin,
  getAllUserByAdmin,
  updateUserProfile,
} from "../controllers/adminUser.controller";
import authMiddleware from "../middlewares/authMiddleware";
const adminUserRoute = Router();

adminUserRoute.get("/users", authMiddleware, getAllUserByAdmin);
adminUserRoute.put("/users/:userId", authMiddleware, updateUserProfile);
adminUserRoute.delete("/users/:userId", authMiddleware, deleteUserByAdmin);

export default adminUserRoute;
