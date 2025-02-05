import { Router } from "express";
import {
  applyCoupon,
  reviewOrder,
  validateCart,
} from "../controllers/checkout.controller";
import authMiddleware from "../middlewares/authMiddleware";

const checkoutRoute = Router();

checkoutRoute.post("/validate-cart", authMiddleware, validateCart);
checkoutRoute.post("/apply-coupon", authMiddleware, applyCoupon);
checkoutRoute.get("/review-order", authMiddleware, reviewOrder);

// TODO: For confirm order use the order.controller.ts (createOrder) logic

export default checkoutRoute;
