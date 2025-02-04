import { Router } from "express";
import {
  getSupplierProfile,
  updateSupplierProfile,
} from "../controllers/supplierProfile.controller";
import authMiddleware from "../middlewares/authMiddleware";
import handleImageUpload from "../middlewares/imageMiddleware";

const supplierProfileRoute = Router();

// Define here the profile Routes
supplierProfileRoute.get("/", authMiddleware, getSupplierProfile);
supplierProfileRoute.patch(
  "/",
  authMiddleware,
  handleImageUpload,
  updateSupplierProfile
);

export default supplierProfileRoute;
