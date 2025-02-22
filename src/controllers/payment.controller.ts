import dotenv from "dotenv";
import { Request, Response } from "express";
import mongoose from "mongoose";
import Razorpay from "razorpay";
import orderModel from "../models/Order.model";
import PaymentModel from "../models/Payment.model";
import ShippingModel from "../models/Shipping.model";
import { createShipRocketOrder } from "../services/shipRocket.service";
import apiResponse from "../utils/ApiResponse";

dotenv.config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID as string,
  key_secret: process.env.RAZORPAY_KEY_SECRET as string,
});

const createOrder = async (req: Request, res: Response) => {
  try {
    const { userId, orderId, paymentMethod, amount } = req.body;

    if (!userId || !orderId || !paymentMethod || !amount) {
      return apiResponse(res, 400, false, "Missing required fields");
    }

    const options = {
      amount: parseFloat(amount) * 100, // Razorpay requires amount in paise
      currency: "INR",
      receipt: `receipt_${Math.random().toString(36).substring(7)}`,
    };

    const razorpayOrder = await razorpay.orders.create(options);

    const payment = new PaymentModel({
      userId,
      orderId,
      paymentMethod,
      transactionId: razorpayOrder.id,
      amount,
      status: "Pending",
    });

    await payment.save();

    return apiResponse(res, 200, true, "Order created successfully", {
      razorpayOrder,
      payment,
    });
  } catch (error: any) {
    console.error("Error creating order for Razorpay:", error);
    if (error.code === 11000) {
      return apiResponse(
        res,
        400,
        false,
        "Duplicate entry detected. Please ensure unique transactionId."
      );
    }
    return apiResponse(res, 500, false, "Internal Server Error");
  }
};

// Verify Razorpay Payment
const verifyPayment = async (req: Request, res: Response) => {
  try {
    const {
      orderId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      addressSnapshot,
    } = req.body;

    // Validate inputs
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return apiResponse(res, 400, false, "Invalid order ID");
    }
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return apiResponse(
        res,
        400,
        false,
        "Missing payment verification details"
      );
    }
    if (
      !addressSnapshot ||
      !addressSnapshot.addressLine1 ||
      !addressSnapshot.postalCode
    ) {
      return apiResponse(
        res,
        400,
        false,
        "Invalid or incomplete address snapshot"
      );
    }

    // Verify payment signature
    const generatedSignature = require("crypto")
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET as string)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return apiResponse(res, 400, false, "Invalid payment signature");
    }

    // Update payment status
    const payment = await PaymentModel.findOneAndUpdate(
      { transactionId: razorpay_order_id },
      { status: "Completed" },
      { new: true }
    );
    if (!payment) {
      return apiResponse(res, 404, false, "Payment not found");
    }

    // Update order status
    const order = await orderModel.findByIdAndUpdate(
      orderId,
      { orderStatus: "Confirmed", shippingStatus: "Pending" },
      { new: true }
    );
    if (!order) {
      // Rollback payment status if order not found
      await PaymentModel.findByIdAndUpdate(payment._id, { status: "Pending" });
      return apiResponse(res, 404, false, "Order not found");
    }

    // Create shipping record
    const shippingRecord = new ShippingModel({
      userId: order.user_id,
      orderId,
      profileId: order.shippingAddressId,
      addressSnapshot,
      shippingStatus: "Pending",
      estimatedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    const savedShipping = await shippingRecord.save();

    // Update order with shipping ID
    order.shippingAddressId = savedShipping._id;

    // Create ShipRocket order
    try {
      const shipRocketResponse = await createShipRocketOrder({
        orderId: orderId.toString(),
        products: order.products,
        addressSnapshot,
      });
      order.shipRocketOrderId = shipRocketResponse.order_id;
    } catch (shipRocketError: any) {
      console.error("ShipRocket integration failed:", shipRocketError);
      // Optionally rollback shipping record if critical
      await ShippingModel.deleteOne({ _id: savedShipping._id });
      order.shippingAddressId = new mongoose.Types.ObjectId(); // Reset to temporary ID
      await order.save();
      return apiResponse(
        res,
        400,
        false,
        `Payment verified but shipping failed: ${shipRocketError.message}`
      );
    }

    await order.save();

    return apiResponse(res, 200, true, "Payment verified successfully", {
      orderId,
      paymentId: payment._id,
      shippingId: savedShipping._id,
      shipRocketOrderId: order.shipRocketOrderId,
    });
  } catch (error: any) {
    console.error("Payment verification failed:", error);
    return apiResponse(
      res,
      500,
      false,
      error.message || "Payment verification failed"
    );
  }
};

// Fetch Payment Details by ID
const getPaymentDetailsById = async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;

    if (!paymentId) {
      return apiResponse(res, 400, false, "Payment ID is required");
    }

    const payment = await PaymentModel.findById(paymentId);

    if (!payment) {
      return apiResponse(res, 404, false, "Payment not found");
    }

    return apiResponse(res, 200, true, "Payment fetched successfully", payment);
  } catch (error) {
    console.error("Error fetching payment details", error);
    return apiResponse(res, 500, false, "Failed to fetch payment details");
  }
};

// Initiate Refund for a Payment
const initiateRefund = async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;
    const { amount, reason } = req.body;

    if (!paymentId || !amount || !reason) {
      return apiResponse(res, 400, false, "Invalid refund request");
    }

    const payment = await PaymentModel.findById(paymentId);

    if (!payment || payment.status !== "Completed") {
      return apiResponse(res, 400, false, "Invalid or incomplete payment");
    }

    const refund = await razorpay.payments.refund(payment.transactionId, {
      amount: parseFloat(amount) * 100,
    });

    payment.status = "Refunded";
    payment.refundDetails = {
      refundId: refund.id,
      amount,
      reason,
      refundedAt: new Date(),
    };

    await payment.save();

    return apiResponse(
      res,
      200,
      true,
      "Refund initiated successfully",
      payment
    );
  } catch (error) {
    console.error("Error initiating refund", error);
    return apiResponse(res, 500, false, "Failed to initiate refund");
  }
};

// Get Payment History for a User
const getPaymentHistory = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return apiResponse(res, 400, false, "User ID is required");
    }

    const payments = await PaymentModel.find({ userId }).sort({
      createdAt: -1,
    });

    if (!payments || payments.length === 0) {
      return apiResponse(res, 404, false, "No payment history found");
    }

    return apiResponse(
      res,
      200,
      true,
      "Payment history fetched successfully",
      payments
    );
  } catch (error) {
    console.error("Error fetching payment history", error);
    return apiResponse(res, 500, false, "Failed to fetch payment history");
  }
};

export {
  createOrder,
  getPaymentDetailsById,
  getPaymentHistory,
  initiateRefund,
  verifyPayment
};

