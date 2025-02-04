import { Router } from "express";
import {
  cancelOrder,
  createOrder,
  exchangeOrder,
  getOrderById,
  returnOrder,
  trackOrder,
} from "../controllers/order.controller";

const orderRoute = Router();

// Define here all Order Routes
orderRoute.post("/", createOrder);
orderRoute.get(
  "/:orderId",
  // validateRequest({ params: getOrderSchema, body: getOrderSchema }),
  getOrderById
);
orderRoute.post(
  "/:orderId/cancel",
  // validateRequest({ params: cancelOrderSchema, body: cancelOrderSchema }),
  cancelOrder
);
orderRoute.post(
  "/:orderId/return",
  // validateRequest({ params: returnOrderSchema, body: returnOrderSchema }),
  returnOrder
);
orderRoute.post(
  "/:orderId/exchange",
  // validateRequest({ params: exchangeOrderSchema, body: exchangeOrderSchema }),
  exchangeOrder
);

orderRoute.get("/track/:orderId", trackOrder);

export default orderRoute;
