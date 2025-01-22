import express, { Router } from "express";
import {
  createOrder,
  getOrderById,
  cancelOrder,
  returnOrder,
  exchangeOrder,
<<<<<<< HEAD
=======
  trackOrder,
>>>>>>> ravichandra/main
} from "../controllers/order.controller";
import validateRequest from "../middlewares/validateSchema";
import {
  createOrderSchema,
  getOrderSchema,
  cancelOrderSchema,
  returnOrderSchema,
  exchangeOrderSchema,
} from "../Schema/order.schema";

const orderRoute = Router();

// Define here all Order Routes
orderRoute.post("/", createOrder);
orderRoute.get(
  "/:orderId",
  // validateRequest({ params: getOrderSchema, body: getOrderSchema }),
  getOrderById
);
<<<<<<< HEAD
orderRoute.put(
=======
orderRoute.post(
>>>>>>> ravichandra/main
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

<<<<<<< HEAD
=======
orderRoute.get("/track/:orderId", trackOrder);

>>>>>>> ravichandra/main
export default orderRoute;
