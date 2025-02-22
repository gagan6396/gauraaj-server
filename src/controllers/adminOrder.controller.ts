// controllers/adminOrder.controller.ts
import { Request, Response } from "express";
import OrderModel from "../models/Order.model";
import PaymentModel from "../models/Payment.model";
import ReturnExchangeModel from "../models/ReturnExchange.model";
import ShippingModel from "../models/Shipping.model";
import apiResponse from "../utils/ApiResponse";

export const getAllOrders = async (req: Request, res: Response) => {
  try {
    const orders = await OrderModel.find()
      .populate("user_id", "first_name last_name email")
      .populate("products.productId", "name price")
      .populate("shippingAddressId", "addressLine1 city state postalCode")
      .populate("payment_id", "status amount")
      .sort({ orderDate: -1 });
    return apiResponse(res, 200, true, "Orders fetched successfully", orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    return apiResponse(res, 500, false, "Error fetching orders");
  }
};

export const getOrderById = async (req: Request, res: Response) => {
  try {
    const order = await OrderModel.findById(req.params.id)
      .populate("user_id", "first_name last_name email")
      .populate("products.productId", "name price images")
      .populate("shippingAddressId", "addressLine1 city state postalCode")
      .populate("payment_id", "status amount paymentMethod transactionId");
    if (!order) {
      return apiResponse(res, 404, false, "Order not found");
    }
    return apiResponse(res, 200, true, "Order fetched successfully", order);
  } catch (error) {
    console.error("Error fetching order:", error);
    return apiResponse(res, 500, false, "Error fetching order");
  }
};

export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const { orderStatus } = req.body;
    const order = await OrderModel.findByIdAndUpdate(
      req.params.id,
      { orderStatus },
      { new: true }
    );
    if (!order) {
      return apiResponse(res, 404, false, "Order not found");
    }
    return apiResponse(
      res,
      200,
      true,
      "Order status updated successfully",
      order
    );
  } catch (error) {
    console.error("Error updating order status:", error);
    return apiResponse(res, 500, false, "Error updating order status");
  }
};

// controllers/adminPayment.controller.ts
export const getAllPayments = async (req: Request, res: Response) => {
  try {
    const payments = await PaymentModel.find()
      .populate("userId", "first_name last_name email")
      .populate("orderId", "orderDate totalAmount")
      .sort({ createdAt: -1 });
    return apiResponse(
      res,
      200,
      true,
      "Payments fetched successfully",
      payments
    );
  } catch (error) {
    console.error("Error fetching payments:", error);
    return apiResponse(res, 500, false, "Error fetching payments");
  }
};

export const getPaymentById = async (req: Request, res: Response) => {
  try {
    const payment = await PaymentModel.findById(req.params.id)
      .populate("userId", "first_name last_name email")
      .populate("orderId", "orderDate totalAmount orderStatus");
    if (!payment) {
      return apiResponse(res, 404, false, "Payment not found");
    }
    return apiResponse(res, 200, true, "Payment fetched successfully", payment);
  } catch (error) {
    console.error("Error fetching payment:", error);
    return apiResponse(res, 500, false, "Error fetching payment");
  }
};

export const updatePaymentStatus = async (req: Request, res: Response) => {
  try {
    const { status, refundDetails } = req.body;
    const payment = await PaymentModel.findByIdAndUpdate(
      req.params.id,
      { status, refundDetails },
      { new: true }
    );
    if (!payment) {
      return apiResponse(res, 404, false, "Payment not found");
    }
    return apiResponse(
      res,
      200,
      true,
      "Payment status updated successfully",
      payment
    );
  } catch (error) {
    console.error("Error updating payment status:", error);
    return apiResponse(res, 500, false, "Error updating payment status");
  }
};

// controllers/adminReturnExchange.controller.ts
export const getAllReturns = async (req: Request, res: Response) => {
  try {
    const returns = await ReturnExchangeModel.find()
      .populate("userId", "first_name last_name email")
      .populate("productId", "name price")
      .populate("orderId", "orderDate totalAmount")
      .sort({ createdAt: -1 });
    return apiResponse(res, 200, true, "Returns fetched successfully", returns);
  } catch (error) {
    console.error("Error fetching returns:", error);
    return apiResponse(res, 500, false, "Error fetching returns");
  }
};

export const updateReturnStatus = async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const returnRequest = await ReturnExchangeModel.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!returnRequest) {
      return apiResponse(res, 404, false, "Return request not found");
    }
    return apiResponse(
      res,
      200,
      true,
      "Return status updated successfully",
      returnRequest
    );
  } catch (error) {
    console.error("Error updating return status:", error);
    return apiResponse(res, 500, false, "Error updating return status");
  }
};

// controllers/adminShipping.controller.ts
export const getAllShippings = async (req: Request, res: Response) => {
  try {
    const shippings = await ShippingModel.find()
      .populate("userId", "first_name last_name email")
      .populate("orderId", "orderDate totalAmount")
      .populate("profileId", "addressLine1 city state postalCode")
      .sort({ createdAt: -1 });
    return apiResponse(
      res,
      200,
      true,
      "Shippings fetched successfully",
      shippings
    );
  } catch (error) {
    console.error("Error fetching shippings:", error);
    return apiResponse(res, 500, false, "Error fetching shippings");
  }
};

export const updateShippingStatus = async (req: Request, res: Response) => {
  try {
    const {
      shippingStatus,
      trackingNumber,
      courierService,
      shippedAt,
      deliveredAt,
    } = req.body;
    const shipping = await ShippingModel.findByIdAndUpdate(
      req.params.id,
      {
        shippingStatus,
        trackingNumber,
        courierService,
        shippedAt,
        deliveredAt,
      },
      { new: true }
    );
    if (!shipping) {
      return apiResponse(res, 404, false, "Shipping record not found");
    }
    return apiResponse(
      res,
      200,
      true,
      "Shipping status updated successfully",
      shipping
    );
  } catch (error) {
    console.error("Error updating shipping status:", error);
    return apiResponse(res, 500, false, "Error updating shipping status");
  }
};
