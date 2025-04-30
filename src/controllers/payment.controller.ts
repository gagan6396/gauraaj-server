import dotenv from "dotenv";
import { Request, Response } from "express";
import mongoose from "mongoose";
import Razorpay from "razorpay";
import orderModel from "../models/Order.model";
import PaymentModel from "../models/Payment.model";
import ShippingModel from "../models/Shipping.model";
import { createShipRocketOrder } from "../services/shipRocket.service";
import apiResponse from "../utils/ApiResponse";
import { sendEmail } from "../utils/EmailHelper";

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
    const { orderId, addressSnapshot, paymentMethod } = req.body;

    // Validate inputs
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return apiResponse(res, 400, false, "Invalid order ID");
    }
    if (
      !addressSnapshot ||
      !addressSnapshot.addressLine1 ||
      !addressSnapshot.postalCode ||
      !addressSnapshot.city ||
      !addressSnapshot.state ||
      !addressSnapshot.country
    ) {
      return apiResponse(
        res,
        400,
        false,
        "Invalid or incomplete address snapshot"
      );
    }
    if (!Number.isInteger(paymentMethod) || ![0, 1].includes(paymentMethod)) {
      return apiResponse(res, 400, false, "Invalid payment method");
    }

    // Fetch order
    const order = await orderModel.findById(orderId);
    if (!order) {
      return apiResponse(res, 404, false, "Order not found");
    }
    if (order.paymentMethod !== paymentMethod) {
      return apiResponse(
        res,
        400,
        false,
        "Payment method does not match order"
      );
    }

    // Verify payment signature for Razorpay
    if (paymentMethod === 0) {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
        req.body;
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return apiResponse(
          res,
          400,
          false,
          "Missing payment verification details"
        );
      }

      const generatedSignature = require("crypto")
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET as string)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      if (generatedSignature !== razorpay_signature) {
        return apiResponse(res, 400, false, "Invalid payment signature");
      }
    }

    // Update payment status
    const payment = await PaymentModel.findOneAndUpdate(
      {
        transactionId:
          paymentMethod === 0 ? req.body.razorpay_order_id : `COD_${orderId}`,
        orderId,
      },
      { status: "Completed", updatedAt: new Date() },
      { new: true }
    );
    if (!payment) {
      return apiResponse(res, 404, false, "Payment record not found");
    }

    // Update order status
    const updatedOrder = await orderModel.findByIdAndUpdate(
      orderId,
      { orderStatus: "Confirmed", shippingStatus: "Pending" },
      { new: true }
    );
    if (!updatedOrder) {
      await PaymentModel.findByIdAndUpdate(payment._id, { status: "Pending" });
      return apiResponse(res, 404, false, "Order not found during update");
    }

    // Create shipping record
    const estimatedDeliveryDays = order.estimatedDeliveryDays || 7;
    const shippingRecord = new ShippingModel({
      userId: order.user_id,
      orderId,
      profileId: order.shippingAddressId,
      addressSnapshot,
      shippingStatus: "Pending",
      estimatedDeliveryDate: new Date(
        Date.now() + estimatedDeliveryDays * 24 * 60 * 60 * 1000
      ),
      courierService: order.courierService || "Default Courier",
    });
    const savedShipping = await shippingRecord.save();

    // Update order with shipping ID
    updatedOrder.shippingAddressId = savedShipping._id;

    // Create ShipRocket order
    try {
      const shipRocketResponse = await createShipRocketOrder({
        orderId: orderId.toString(),
        products: order.products,
        addressSnapshot,
        totalAmount: order.totalAmount,
        paymentMethod: order.paymentMethod,
        courierName: order.courierService || "Default Courier",
      });
      updatedOrder.shipRocketOrderId = shipRocketResponse.order_id;
    } catch (shipRocketError: any) {
      console.error("ShipRocket integration failed:", {
        orderId,
        error: shipRocketError.message,
        details:
          shipRocketError instanceof Error ? shipRocketError : "Unknown error",
      });
      await ShippingModel.deleteOne({ _id: savedShipping._id });
      await orderModel.findByIdAndUpdate(orderId, {
        orderStatus: "Pending",
        shippingStatus: "Pending",
        shippingAddressId: new mongoose.Types.ObjectId(),
      });
      await PaymentModel.findByIdAndUpdate(payment._id, { status: "Pending" });
      return apiResponse(
        res,
        400,
        false,
        `Shipping integration failed: ${shipRocketError.message}`
      );
    }

    await updatedOrder.save();

    // Embedded email template
    const emailTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #f4f4f4;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background-color: #ffffff;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      padding: 20px 0;
      background-color: #007bff;
      color: #ffffff;
      border-radius: 8px 8px 0 0;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .content {
      padding: 20px;
    }
    .content h2 {
      color: #333333;
      font-size: 20px;
      margin-top: 0;
    }
    .content p {
      color: #666666;
      line-height: 1.6;
      margin: 10px 0;
    }
    .order-details {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    .order-details th,
    .order-details td {
      border: 1px solid #dddddd;
      padding: 10px;
      text-align: left;
    }
    .order-details th {
      background-color: #f8f8f8;
      color: #333333;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #999999;
      font-size: 12px;
    }
    .footer a {
      color: #007bff;
      text-decoration: none;
    }
    .button {
      display: inline-block;
      padding: 10px 20px;
      margin: 10px 0;
      background-color: #007bff;
      color: #ffffff;
      text-decoration: none;
      border-radius: 5px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{{emailTitle}}</h1>
    </div>
    <div class="content">
      <h2>{{greeting}}</h2>
      <p>{{mainMessage}}</p>
      <h3>Order Details</h3>
      <table class="order-details">
        <tr>
          <th>Order ID</th>
          <td>{{orderId}}</td>
        </tr>
        <tr>
          <th>Order Date</th>
          <td>{{orderDate}}</td>
        </tr>
        <tr>
          <th>Total Amount</th>
          <td>{{totalAmount}}</td>
        </tr>
        <tr>
          <th>Payment Method</th>
          <td>{{paymentMethod}}</td>
        </tr>
        <tr>
          <th>Shipping Address</th>
          <td>{{shippingAddress}}</td>
        </tr>
        <tr>
          <th>Estimated Delivery</th>
          <td>{{estimatedDeliveryDate}}</td>
        </tr>
        {{additionalDetails}}
      </table>
      <p>{{closingMessage}}</p>
      <a href="{{actionUrl}}" class="button">{{actionText}}</a>
      <p>Contact us on WhatsApp: <a href="{{whatsAppUrl}}">{{whatsAppNumber}}</a></p>
    </div>
    <div class="footer">
      <p>Thank you for choosing us!</p>
      <p>{{companyName}} | <a href="{{companyWebsite}}">Visit our website</a></p>
      <p>Contact us at <a href="mailto:{{supportEmail}}">{{supportEmail}}</a></p>
    </div>
  </div>
</body>
</html>
`;

    // Prepare common email data
    const emailData = {
      orderId: orderId.toString(),
      orderDate: new Date().toLocaleDateString(),
      totalAmount: `₹${order.totalAmount.toFixed(2)}`,
      paymentMethod: paymentMethod === 0 ? "Razorpay" : "Cash on Delivery",
      shippingAddress: `${addressSnapshot.addressLine1}, ${addressSnapshot.city}, ${addressSnapshot.state}, ${addressSnapshot.postalCode}, ${addressSnapshot.country}`,
      estimatedDeliveryDate: new Date(
        Date.now() + estimatedDeliveryDays * 24 * 60 * 60 * 1000
      ).toLocaleDateString(),
      companyName: "Gauraaj",
      companyWebsite: "https://www.gauraaj.com/",
      supportEmail: "ghccustomercare@gmail.com",
      whatsAppNumber: "+91-6397-90-4655",
      whatsAppUrl: "https://wa.me/+916397904655",
    };

    // Send email to customer
    try {
      const customerEmailBody = emailTemplate
        .replace("{{emailTitle}}", "Order Confirmation")
        .replace(
          "{{greeting}}",
          `Dear ${order.userDetails?.name || "Customer"}`
        )
        .replace(
          "{{mainMessage}}",
          "Thank you for your order! We're excited to let you know that your order has been confirmed and is being prepared for shipping."
        )
        .replace("{{orderId}}", emailData.orderId)
        .replace("{{orderDate}}", emailData.orderDate)
        .replace("{{totalAmount}}", emailData.totalAmount)
        .replace("{{paymentMethod}}", emailData.paymentMethod)
        .replace("{{shippingAddress}}", emailData.shippingAddress)
        .replace("{{estimatedDeliveryDate}}", emailData.estimatedDeliveryDate)
        .replace("{{additionalDetails}}", "")
        .replace(
          "{{closingMessage}}",
          "We'll notify you once your order ships. If you have any questions, feel free to contact us."
        )
        .replace("{{actionUrl}}", `https://www.gauraaj.com/order-confirmation/${emailData.orderId}`)
        .replace("{{actionText}}", "View Your Order")
        .replace("{{companyName}}", emailData.companyName)
        .replace("{{companyWebsite}}", emailData.companyWebsite)
        .replace("{{supportEmail}}", emailData.supportEmail)
        .replace("{{whatsAppNumber}}", emailData.whatsAppNumber)
        .replace("{{whatsAppUrl}}", emailData.whatsAppUrl);

      await sendEmail(
        order.userDetails?.email || "",
        "Order Confirmed",
        customerEmailBody
      );
    } catch (emailError) {
      console.error("Failed to send customer confirmation email:", {
        error: emailError instanceof Error ? emailError.message : "Unknown error",
        stack: emailError instanceof Error ? emailError.stack : "Unknown stack",
        orderId,
      });
    }

    // Send email to shop owner
    try {
      const shopOwnerEmailBody = emailTemplate
        .replace("{{emailTitle}}", "New Order Notification")
        .replace("{{greeting}}", "Dear Shop Owner")
        .replace(
          "{{mainMessage}}",
          "A new order has been placed and confirmed. Please review the details below and prepare for shipping."
        )
        .replace("{{orderId}}", emailData.orderId)
        .replace("{{orderDate}}", emailData.orderDate)
        .replace("{{totalAmount}}", emailData.totalAmount)
        .replace("{{paymentMethod}}", emailData.paymentMethod)
        .replace("{{shippingAddress}}", emailData.shippingAddress)
        .replace("{{estimatedDeliveryDate}}", emailData.estimatedDeliveryDate)
        .replace(
          "{{additionalDetails}}",
          `<tr><th>Customer Name</th><td>${
            order.userDetails?.name || "N/A"
          }</td></tr>
           <tr><th>Customer Phone</th><td><a href="https://wa.me/${order.userDetails?.phone || ""}">${order.userDetails?.phone || "N/A"}</a></td></tr>`
        )
        .replace(
          "{{closingMessage}}",
          "Please ensure the order is processed and shipped on time. Contact support if you encounter any issues."
        )
        .replace("{{actionUrl}}", `https://gauraaj-admin.vercel.app/admin/orders/${emailData.orderId}`)
        .replace("{{actionText}}", "View Order in Dashboard")
        .replace("{{companyName}}", emailData.companyName)
        .replace("{{companyWebsite}}", emailData.companyWebsite)
        .replace("{{supportEmail}}", emailData.supportEmail)
        .replace("{{whatsAppNumber}}", emailData.whatsAppNumber)
        .replace("{{whatsAppUrl}}", emailData.whatsAppUrl);

      await sendEmail(
        "ghccustomercare@gmail.com", // Replace with actual shop owner email
        "New Order Received",
        shopOwnerEmailBody
      );
    } catch (emailError) {
      console.error("Failed to send shop owner notification email:", {
        error: emailError instanceof Error ? emailError.message : "Unknown error",
        stack: emailError instanceof Error ? emailError.stack : "Unknown stack",
        orderId,
      });
    }

    return apiResponse(res, 200, true, "Order verified successfully", {
      orderId,
      paymentId: payment._id,
      shippingId: savedShipping._id,
      shipRocketOrderId: updatedOrder.shipRocketOrderId,
    });
  } catch (error: any) {
    console.error("Order verification failed:", {
      error: error.message,
      stack: error.stack,
      orderId: req.body.orderId,
    });
    return apiResponse(
      res,
      500,
      false,
      error.message || "Order verification failed"
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

