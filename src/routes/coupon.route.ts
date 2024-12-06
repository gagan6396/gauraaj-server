import { Router } from "express";
import { createSupplierCoupon } from "../controllers/coupon.controller";

const couponRoute = Router();

couponRoute.post("/create/:userId", createSupplierCoupon);

export default couponRoute;
