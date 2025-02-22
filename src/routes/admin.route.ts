// routes/admin.routes.ts
import { Router } from "express";
import {
    getAllOrders,
    getAllPayments,
    getAllReturns,
    getAllShippings,
    getOrderById,
    getPaymentById,
    updateOrderStatus,
    updatePaymentStatus,
    updateReturnStatus,
    updateShippingStatus,
} from "../controllers/adminOrder.controller";
import authMiddleware from "../middlewares/authMiddleware"; // Assuming admin-only access

const adminRouter = Router();

// Order Routes
adminRouter.get("/orders", authMiddleware,  getAllOrders);
adminRouter.get("/orders/:id", authMiddleware,  getOrderById);
adminRouter.patch(
  "/orders/:id/status",
  authMiddleware,
  
  updateOrderStatus
);

// Payment Routes
adminRouter.get("/payments", authMiddleware,  getAllPayments);
adminRouter.get(
  "/payments/:id",
  authMiddleware,
  
  getPaymentById
);
adminRouter.patch(
  "/payments/:id/status",
  authMiddleware,
  
  updatePaymentStatus
);

// Return/Exchange Routes
adminRouter.get("/returns", authMiddleware,  getAllReturns);
adminRouter.patch(
  "/returns/:id/status",
  authMiddleware,
  
  updateReturnStatus
);

// Shipping Routes
adminRouter.get("/shippings", authMiddleware,  getAllShippings);
adminRouter.patch(
  "/shippings/:id/status",
  authMiddleware,
  
  updateShippingStatus
);

export default adminRouter;
