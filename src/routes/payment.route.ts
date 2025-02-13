import { Router } from "express";
import {
  createOrder,
  getPaymentDetailsById,
  getPaymentHistory,
  initiateRefund,
  verifyPayment,
} from "../controllers/payment.controller";
import authMiddleware from "../middlewares/authMiddleware";

const paymentRoute = Router();

// Define here payment api's

paymentRoute.post("/create", authMiddleware, createOrder);
paymentRoute.post("/verify", authMiddleware, verifyPayment);
paymentRoute.get("/:paymentId", authMiddleware, getPaymentDetailsById);
paymentRoute.post("/refund/:paymentId", authMiddleware, initiateRefund);
paymentRoute.get("/history/:userId", authMiddleware, getPaymentHistory);

export default paymentRoute;
