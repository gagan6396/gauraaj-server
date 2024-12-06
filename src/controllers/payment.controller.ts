import PaymentModel from "../models/Payment.model";
import Razorpay from "razorpay";
import apiResponse from "../utils/ApiResponse";
import { Request, Response } from "express";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID as string,
  key_secret: process.env.RAZORPAY_KEY_SECRET as string,
});

// Create a Razorpay Order and store Payment details
// const createOrder = async (req: Request, res: Response) => {
//   try {
//     const { userId, orderId, paymentMethod, amount } = req.body;

//     if (!userId || !orderId || !paymentMethod || !amount) {
//       return apiResponse(res, 400, false, "Missing required fields");
//     }

//     const options = {
//       amount: parseFloat(amount) * 100, // Razorpay requires amount in paise
//       currency: "INR",
//       receipt: `receipt_${Math.random().toString(36).substring(7)}`,
//     };

//     const razorpayOrder = await razorpay.orders.create(options);

//     const payment = new PaymentModel({
//       userId,
//       orderId,
//       paymentMethod,
//       transactionId: razorpayOrder.id,
//       amount,
//       status: "Pending",
//     });

//     await payment.save();

//     return apiResponse(res, 200, true, "Order created successfully", {
//       razorpayOrder,
//       payment,
//     });
//   } catch (error) {
//     console.error("Error creating order for Razorpay", error);
//     return apiResponse(res, 500, false, "Internal Server Error");
//   }
// };

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
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return apiResponse(res, 400, false, "Invalid payment verification data");
    }

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET as string)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return apiResponse(res, 400, false, "Invalid payment signature");
    }

    const payment = await PaymentModel.findOneAndUpdate(
      { transactionId: razorpay_order_id },
      { status: "Completed" },
      { new: true }
    );

    if (!payment) {
      return apiResponse(res, 404, false, "Payment not found");
    }

    return apiResponse(
      res,
      200,
      true,
      "Payment verified successfully",
      payment
    );
  } catch (error) {
    console.error("Error verifying payment", error);
    return apiResponse(res, 500, false, "Internal Server Error");
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
  verifyPayment,
  getPaymentDetailsById,
  initiateRefund,
  getPaymentHistory,
};


