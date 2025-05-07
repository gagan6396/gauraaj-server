import { Router } from "express";
import {
  addProductToCart,
  calculateShippingCharges,
  cancelOrder,
  createOrder,
  exchangeOrder,
  getOrderById,
  getShippingAnalytics,
  postOrderActions,
  returnOrder,
  shipOrder,
  trackOrder,
} from "../controllers/order.controller";
import authMiddleware from "../middlewares/authMiddleware";

const orderRoute = Router();

// Order Routes
orderRoute.post("/", authMiddleware, createOrder); // Create a new order
orderRoute.get("/:orderId", authMiddleware, getOrderById); // Get order details by ID
orderRoute.post("/:orderId/cancel", authMiddleware, cancelOrder); // Cancel an order
orderRoute.post("/:orderId/return", authMiddleware, returnOrder); // Request a return
orderRoute.post("/:orderId/exchange", authMiddleware, exchangeOrder); // Request an exchange unaware of any additional routes for notifications
orderRoute.get("/track/:orderId", authMiddleware, trackOrder); // Track an order
orderRoute.post("/cart/add/:productId/:variantId", authMiddleware, addProductToCart); // Add product to cart
orderRoute.post("/calculate-shipping", authMiddleware, calculateShippingCharges); // Calculate shipping charges
orderRoute.post("/:orderId/ship", authMiddleware, shipOrder); // Ship an order
orderRoute.post("/:orderId/post-actions", authMiddleware, postOrderActions); // Post-order actions (confirmation, review, suggestions)
orderRoute.get("/analytics/shipping", authMiddleware, getShippingAnalytics); // Shipping performance analytics for admin

export default orderRoute;