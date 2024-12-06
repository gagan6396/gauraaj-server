import { Router } from "express";
import {
  validateCart,
  applyCoupon,
  reviewOrder,
} from "../controllers/checkout.controller";
import validateRequest from "../middlewares/validateSchema";
import {
  validateCartSchema,
  applyCouponSchema,
  reviewOrderSchema,
  confirmOrderSchema,
} from "../Schema/checkout.schema";

const checkoutRoute = Router();

// Routes for the checkout process
checkoutRoute.post(
  "/validate-cart/:userId",
  // validateRequest({ params: validateCartSchema }),
  validateCart
);

checkoutRoute.post(
  "/apply-coupon/:userId",
  // validateRequest({ body: applyCouponSchema }),
  applyCoupon
);

checkoutRoute.get(
  "/review-order/:userId",
  // validateRequest({ params: reviewOrderSchema }),
  reviewOrder
);

// TODO: For confirm order use the order.controller.ts (createOrder) logic

export default checkoutRoute;
