import { Router } from "express";
import {
  cancelOrder,
  createOrder,
  exchangeOrder,
  getOrderById,
  returnOrder,
  trackOrder,
} from "../controllers/order.controller";
import authMiddleware from "../middlewares/authMiddleware";

const orderRoute = Router();

// Define here all Order Routes
orderRoute.post("/", authMiddleware, createOrder);
orderRoute.get("/:orderId", authMiddleware, getOrderById);
orderRoute.post("/:orderId/cancel", authMiddleware, cancelOrder);
orderRoute.post("/:orderId/return", authMiddleware, returnOrder);
orderRoute.post("/:orderId/exchange", authMiddleware, exchangeOrder);
orderRoute.get("/track/:orderId", authMiddleware, trackOrder);

export default orderRoute;
