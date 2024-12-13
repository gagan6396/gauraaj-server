import express, { Router } from "express";
import authMiddleware from "../middlewares/authMiddleware";
import {
  createOrder,
  verifyPayment,
  getPaymentDetailsById,
  initiateRefund,
  getPaymentHistory,
} from "../controllers/payment.controller";

const paymentRoute = Router();

// Define here payment api's

paymentRoute.post("/create", authMiddleware, createOrder);
paymentRoute.post("/verify", authMiddleware, verifyPayment);
paymentRoute.get("/:paymentId", authMiddleware, getPaymentDetailsById);
paymentRoute.post("/refund/:paymentId", authMiddleware, initiateRefund);
paymentRoute.get("/history/:userId", authMiddleware, getPaymentHistory);

export default paymentRoute;
