import dotenv from "dotenv";
import { Request, Response } from "express";
import mongoose from "mongoose";
import Razorpay from "razorpay";
import orderModel from "../models/Order.model";
import PaymentModel from "../models/Payment.model";
import productModel from "../models/Product.model";
import ShippingModel from "../models/Shipping.model";
import { createShipRocketOrder } from "../services/shipRocket.service";
import apiResponse from "../utils/ApiResponse";
import { sendEmail } from "../utils/EmailHelper";

dotenv.config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID as string,
  key_secret: process.env.RAZORPAY_KEY_SECRET as string,
});

// Email template for cancellation and order confirmation
const emailTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Update</title>
  <style>
    body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background: #fff; padding: 20px; border-radius: 8px; }
    .header { text-align: center; padding: 10px; background: #007bff; color: #fff; border-radius: 8px 8px 0 0; }
    .content { padding: 20px; }
    .content p { color: #333; }
    .order-details, .product-details { width: 100%; border-collapse: collapse; margin: 10px 0; }
    .order-details th, .order-details td, .product-details th, .product-details td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    .order-details th, .product-details th { background: #f8f8f8; }
    .footer { text-align: center; padding: 10px; color: #666; font-size: 12px; }
    .button { display: inline-block; padding: 10px 20px; background: #007bff; color: #fff; text-decoration: none; border-radius: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h2>Order Update</h2></div>
    <div class="content">
      <p>{{greeting}}</p>
      <p>{{mainMessage}}</p>
      <table class="order-details">
        <tr><th>Order ID</th><td>{{orderId}}</td></tr>
        <tr><th>Order Date</th><td>{{orderDate}}</td></tr>
        <tr><th>Total Amount</th><td>{{totalAmount}}</td></tr>
        <tr><th>Payment Method</th><td>{{paymentMethod}}</td></tr>
        <tr><th>Shipping Address</th><td>{{shippingAddress}}</td></tr>
        <tr><th>Estimated Delivery</th><td>{{estimatedDeliveryDate}}</td></tr>
        {{additionalDetails}}
      </table>
      {{productTable}}
      <p>{{closingMessage}}</p>
      <a href="{{actionUrl}}" class="button">{{actionText}}</a>
      <p>Contact us on WhatsApp: <a href="{{whatsAppUrl}}">{{whatsAppNumber}}</a></p>
    </div>
    <div class="footer">
      <p>Gauraaj | <a href="{{companyWebsite}}">Visit our website</a></p>
      <p>Contact us at <a href="mailto:ghccustomercare@gmail.com">ghccustomercare@gmail.com</a></p>
    </div>
  </div>
</body>
</html>
`;

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
const verifyPayment = async (req: any, res: Response) => {
  try {
    const {
      orderId,
      addressSnapshot,
      paymentMethod,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

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
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return apiResponse(
          res,
          400,
          false,
          "Missing Razorpay payment verification details"
        );
      }

      const generatedSignature = require("crypto")
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET as string)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      if (generatedSignature !== razorpay_signature) {
        return apiResponse(
          res,
          400,
          false,
          "Invalid Razorpay payment signature"
        );
      }

      // Validate Razorpay payment_id format
      if (!razorpay_payment_id.startsWith("pay_")) {
        return apiResponse(
          res,
          400,
          false,
          "Invalid Razorpay payment ID format"
        );
      }
    }

    // Update or create payment record
    const transactionId =
      paymentMethod === 0 ? razorpay_payment_id! : `COD_${orderId}`;
    let payment = await PaymentModel.findOne({ orderId, transactionId });

    if (!payment) {
      payment = new PaymentModel({
        userId: order.user_id,
        orderId,
        paymentMethod: paymentMethod === 0 ? "Razorpay" : "COD",
        transactionId,
        amount: order.totalAmount,
        status: "Completed",
      });
    } else {
      payment.status = "Completed";
      payment.updatedAt = new Date();
    }

    await payment.save();

    // Update order status
    const updatedOrder = await orderModel.findByIdAndUpdate(
      orderId,
      {
        orderStatus: "Confirmed",
        shippingStatus: "Pending",
        payment_id: payment._id,
      },
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
    let shipRocketOrderId: string | undefined;
    try {
      const shipRocketResponse = await createShipRocketOrder({
        orderId: orderId.toString(),
        products: order.products,
        addressSnapshot,
        totalAmount: order.totalAmount,
        paymentMethod: order.paymentMethod,
        courierName: order.courierService || "Default Courier",
      });
      shipRocketOrderId = shipRocketResponse.order_id;
      updatedOrder.shipRocketOrderId = shipRocketOrderId;
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

    // Prepare email data
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

    // Generate product rows for email
    const productRows = await Promise.all(
      order.products.map(async (orderProduct: any) => {
        const product = await productModel.findById(orderProduct.productId);
        let variant = null;
        let discountDisplay = "N/A";

        if (product) {
          variant = product.variants.find(
            (v: any) => v._id.toString() === orderProduct.variantId
          );
          if (variant && variant.discount?.active) {
            const discountValue = variant.discount.value;
            if (variant.discount.type === "percentage") {
              discountDisplay = `${discountValue}%`;
            } else if (variant.discount.type === "flat") {
              discountDisplay = `₹${discountValue.toFixed(2)}`;
            }
          }
        }

        const productName = orderProduct.name || "Unknown Product";
        const variantName = variant?.name || "Default Variant";
        const sku = variant?.sku || "N/A";
        const price = orderProduct.price || 0;
        const quantity = orderProduct.quantity || 1;
        const total = (price * quantity).toFixed(2);

        return `
          <tr>
            <td>${productName}</td>
            <td>${variantName}</td>
            <td>${sku}</td>
            <td>${quantity}</td>
            <td>₹${price.toFixed(2)}</td>
            <td>${discountDisplay}</td>
            <td>₹${total}</td>
          </tr>`;
      })
    ).then((rows) => rows.join(""));

    const productTable = `
      <h3>Products</h3>
      <table class="product-details">
        <tr>
          <th>Product</th>
          <th>Variant</th>
          <th>SKU</th>
          <th>Quantity</th>
          <th>Price</th>
          <th>Discount</th>
          <th>Total</th>
        </tr>
        ${productRows}
      </table>`;

    // Send email to customer
    try {
      const customerEmailBody = emailTemplate
        .replace("Order Update", "Order Confirmation")
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
        .replace("{{productTable}}", productTable)
        .replace(
          "{{closingMessage}}",
          "We'll notify you once your order ships. If you have any questions, feel free to contact us."
        )
        .replace(
          "{{actionUrl}}",
          `https://www.gauraaj.com/order-confirmation/${emailData.orderId}`
        )
        .replace("{{actionText}}", "View Your Order")
        .replace("{{companyName}}", emailData.companyName)
        .replace("{{companyWebsite}}", emailData.companyWebsite)
        .replace("ghccustomercare@gmail.com", emailData.supportEmail)
        .replace("{{whatsAppNumber}}", emailData.whatsAppNumber)
        .replace("{{whatsAppUrl}}", emailData.whatsAppUrl);

      await sendEmail(
        order.userDetails?.email || "",
        "Order Confirmed",
        customerEmailBody
      );
    } catch (emailError) {
      console.error("Failed to send customer confirmation email:", {
        error:
          emailError instanceof Error ? emailError.message : "Unknown error",
        stack: emailError instanceof Error ? emailError.stack : "Unknown stack",
        orderId,
      });
    }

    // Send email to shop owner
    try {
      const shopOwnerEmailBody = emailTemplate
        .replace("Order Update", "New Order Notification")
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
           <tr><th>Customer Phone</th><td><a href="https://wa.me/${
             order.userDetails?.phone || ""
           }">${order.userDetails?.phone || "N/A"}</a></td></tr>`
        )
        .replace("{{productTable}}", productTable)
        .replace(
          "{{closingMessage}}",
          "Please ensure the order is processed and shipped on time. Contact support if you encounter any issues."
        )
        .replace(
          "{{actionUrl}}",
          `https://gauraaj-admin.vercel.app/admin/orders/${emailData.orderId}`
        )
        .replace("{{actionText}}", "View Order in Dashboard")
        .replace("{{companyName}}", emailData.companyName)
        .replace("{{companyWebsite}}", emailData.companyWebsite)
        .replace("ghccustomercare@gmail.com", emailData.supportEmail)
        .replace("{{whatsAppNumber}}", emailData.whatsAppNumber)
        .replace("{{whatsAppUrl}}", emailData.whatsAppUrl);

      await sendEmail(
        "ghccustomercare@gmail.com",
        "New Order Received",
        shopOwnerEmailBody
      );
    } catch (emailError) {
      console.error("Failed to send shop owner notification email:", {
        error:
          emailError instanceof Error ? emailError.message : "Unknown error",
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

// Shiprocket Webhook for Status Updates
const shiprocketWebhook = async (req: Request, res: Response) => {
  try {
    const {
      awb,
      current_status,
      current_status_id,
      order_id,
      shipment_status,
      shipment_status_id,
      courier_name,
      current_timestamp,
      etd,
      channel,
      channel_order_id,
      scans,
      webhook_token,
    } = req.body;

    // Validate webhook token (Shiprocket provides a token for security)
    // if (webhook_token !== process.env.SHIPROCKET_WEBHOOK_TOKEN) {
    //   return apiResponse(res, 401, false, "Invalid webhook token");
    // }

    // Validate required fields
    if (!order_id || !shipment_status || !shipment_status_id) {
      return apiResponse(res, 400, false, "Missing required webhook fields");
    }

    // Map Shiprocket shipment status to internal status
    const statusMap: { [key: number]: string } = {
      7: "Shipped", // Shiprocket "In Transit"
      8: "Delivered", // Shiprocket "Delivered"
      9: "Cancelled", // Shiprocket "Cancelled"
      10: "Returned", // Shiprocket "RTO Delivered"
    };

    const newShippingStatus = statusMap[shipment_status_id] || current_status || "Unknown";

    // Find order by Shiprocket order ID
    const order = await orderModel.findOne({ shipRocketOrderId: order_id });
    if (!order) {
      return apiResponse(res, 404, false, "Order not found");
    }

    // Find shipping record
    const shipping = await ShippingModel.findOne({ orderId: order._id });
    if (!shipping) {
      return apiResponse(res, 404, false, "Shipping record not found");
    }

    // Update shipping and order status
    shipping.shippingStatus = newShippingStatus;
    shipping.courierService = courier_name || shipping.courierService;
    shipping.awbCode = awb || shipping.awbCode;
    shipping.channel = channel || shipping.channel || "N/A";
    shipping.channelOrderId = channel_order_id || shipping.channelOrderId || "N/A";
    shipping.estimatedDeliveryDate = etd ? new Date(etd) : shipping.estimatedDeliveryDate;
    shipping.scans = scans
      ? scans.map((scan: { date: string; activity: string; location: string }) => ({
          date: new Date(scan.date),
          activity: scan.activity,
          location: scan.location,
        }))
      : shipping.scans || [];
    shipping.updatedAt = new Date(current_timestamp || Date.now());
    await shipping.save();

    const updatedOrder = await orderModel.findByIdAndUpdate(
      order._id,
      {
        shippingStatus: newShippingStatus,
        orderStatus:
          newShippingStatus === "Cancelled" ? "Cancelled" : order.orderStatus,
      },
      { new: true }
    );

    // Prepare email data
    const emailData = {
      orderId: order._id.toString(),
      orderDate: order.createdAt.toLocaleDateString(),
      totalAmount: `₹${order.totalAmount.toFixed(2)}`,
      paymentMethod: order.paymentMethod === 0 ? "Razorpay" : "Cash on Delivery",
      shippingAddress: `${shipping.addressSnapshot.addressLine1}, ${shipping.addressSnapshot.city}, ${shipping.addressSnapshot.state}, ${shipping.addressSnapshot.postalCode}, ${shipping.addressSnapshot.country}`,
      estimatedDeliveryDate: shipping.estimatedDeliveryDate.toLocaleDateString(),
      companyName: "Gauraaj",
      companyWebsite: "https://www.gauraaj.com/",
      supportEmail: "ghccustomercare@gmail.com",
      whatsAppNumber: "+91-6397-90-4655",
      whatsAppUrl: "https://wa.me/+916397904655",
    };

    // Generate product rows for email
    const productRows = await Promise.all(
      order.products.map(async (orderProduct: any) => {
        const product = await productModel.findById(orderProduct.productId);
        let variant = null;
        let discountDisplay = "N/A";

        if (product) {
          variant = product.variants.find(
            (v: any) => v._id.toString() === orderProduct.variantId
          );
          if (variant && variant.discount?.active) {
            const discountValue = variant.discount.value;
            if (variant.discount.type === "percentage") {
              discountDisplay = `${discountValue}%`;
            } else if (variant.discount.type === "flat") {
              discountDisplay = `₹${discountValue.toFixed(2)}`;
            }
          }
        }

        const productName = orderProduct.name || "Unknown Product";
        const variantName = variant?.name || "Default Variant";
        const sku = variant?.sku || "N/A";
        const price = orderProduct.price || 0;
        const quantity = orderProduct.quantity || 1;
        const total = (price * quantity).toFixed(2);

        return `
          <tr>
            <td>${productName}</td>
            <td>${variantName}</td>
            <td>${sku}</td>
            <td>${quantity}</td>
            <td>₹${price.toFixed(2)}</td>
            <td>${discountDisplay}</td>
            <td>₹${total}</td>
          </tr>`;
      })
    ).then((rows) => rows.join(""));

    const productTable = `
      <h3>Products</h3>
      <table class="product-details">
        <tr>
          <th>Product</th>
          <th>Variant</th>
          <th>SKU</th>
          <th>Quantity</th>
          <th>Price</th>
          <th>Discount</th>
          <th>Total</th>
        </tr>
        ${productRows}
      </table>`;

    // Generate scan table for email (only for Shipped or Delivered statuses)
    let scanTable = "";
    if (["Shipped", "Delivered"].includes(newShippingStatus) && scans && scans.length > 0) {
      const scanRows = scans
        .map(
          (scan: { date: string; activity: string; location: string }) => `
          <tr>
            <td>${new Date(scan.date).toLocaleString()}</td>
            <td>${scan.activity}</td>
            <td>${scan.location}</td>
          </tr>`
        )
        .join("");
      scanTable = `
        <h3>Shipment Tracking</h3>
        <table class="scan-details">
          <tr>
            <th>Date</th>
            <th>Activity</th>
            <th>Location</th>
          </tr>
          ${scanRows}
        </table>`;
    }

    // Prepare email content based on status
    let emailSubject = "";
    let mainMessage = "";
    let actionText = "View Your Order";
    let actionUrl = `https://www.gauraaj.com/order-confirmation/${emailData.orderId}`;
    let shopOwnerActionUrl = `https://gauraaj-admin.vercel.app/admin/orders/${emailData.orderId}`;

    switch (newShippingStatus) {
      case "Shipped":
        emailSubject = "Your Order Has Been Shipped";
        mainMessage = `Great news! Your order has been shipped via ${courier_name || "our courier service"} with AWB ${awb || "N/A"}.`;
        break;
      case "Delivered":
        emailSubject = "Your Order Has Been Delivered";
        mainMessage = "Your order has been successfully delivered. We hope you enjoy your purchase!";
        break;
      case "Cancelled":
        emailSubject = "Your Order Has Been Cancelled";
        mainMessage = "We're sorry, but your order has been cancelled. Please contact us for more details.";
        break;
      case "Returned":
        emailSubject = "Your Order Has Been Returned";
        mainMessage = "Your order has been returned. Please contact us for assistance.";
        break;
      default:
        emailSubject = "Order Status Update";
        mainMessage = `Your order status has been updated to ${newShippingStatus}.`;
    }

    // Send email to customer
    try {
      const customerEmailBody = emailTemplate
        .replace("Order Update", emailSubject)
        .replace(
          "{{greeting}}",
          `Dear ${order.userDetails?.name || "Customer"}`
        )
        .replace("{{mainMessage}}", mainMessage)
        .replace("{{orderId}}", emailData.orderId)
        .replace("{{orderDate}}", emailData.orderDate)
        .replace("{{totalAmount}}", emailData.totalAmount)
        .replace("{{paymentMethod}}", emailData.paymentMethod)
        .replace("{{shippingAddress}}", emailData.shippingAddress)
        .replace("{{estimatedDeliveryDate}}", emailData.estimatedDeliveryDate)
        .replace("{{additionalDetails}}", "")
        .replace("{{productTable}}", productTable)
        .replace("{{scanTable}}", scanTable)
        .replace(
          "{{closingMessage}}",
          "Thank you for shopping with us! If you have any questions, feel free to contact us."
        )
        .replace("{{actionUrl}}", actionUrl)
        .replace("{{actionText}}", actionText)
        .replace("{{companyName}}", emailData.companyName)
        .replace("{{companyWebsite}}", emailData.companyWebsite)
        .replace("ghccustomercare@gmail.com", emailData.supportEmail)
        .replace("{{whatsAppNumber}}", emailData.whatsAppNumber)
        .replace("{{whatsAppUrl}}", emailData.whatsAppUrl);

      await sendEmail(
        order.userDetails?.email || "",
        emailSubject,
        customerEmailBody
      );
    } catch (emailError) {
      console.error("Failed to send customer webhook email:", {
        error:
          emailError instanceof Error ? emailError.message : "Unknown error",
        stack: emailError instanceof Error ? emailError.stack : "Unknown stack",
        orderId: order._id,
      });
    }

    // Send email to shop owner
    try {
      const shopOwnerEmailBody = emailTemplate
        .replace("Order Update", `Order Status Update: ${newShippingStatus}`)
        .replace("{{greeting}}", "Dear Shop Owner")
        .replace(
          "{{mainMessage}}",
          `Order ${order_id} has been updated to ${newShippingStatus} status via ${courier_name || "the courier service"}.`
        )
        .replace("{{orderId}}", emailData.orderId)
        .replace("{{orderDate}}", emailData.orderDate)
        .replace("{{totalAmount}}", emailData.totalAmount)
        .replace("{{paymentMethod}}", emailData.paymentMethod)
        .replace("{{shippingAddress}}", emailData.shippingAddress)
        .replace("{{estimatedDeliveryDate}}", emailData.estimatedDeliveryDate)
        .replace(
          "{{additionalDetails}}",
          `<tr><th>Customer Name</th><td>${order.userDetails?.name || "N/A"}</td></tr>
           <tr><th>Customer Phone</th><td><a href="https://wa.me/${order.userDetails?.phone || ""}">${order.userDetails?.phone || "N/A"}</a></td></tr>
           <tr><th>AWB Code</th><td>${awb || "N/A"}</td></tr>
           <tr><th>Channel</th><td>${channel || "N/A"}</td></tr>
           <tr><th>Channel Order ID</th><td>${channel_order_id || "N/A"}</td></tr>`
        )
        .replace("{{productTable}}", productTable)
        .replace("{{scanTable}}", scanTable)
        .replace(
          "{{closingMessage}}",
          "Please take appropriate actions based on the new status. Contact support if needed."
        )
        .replace("{{actionUrl}}", shopOwnerActionUrl)
        .replace("{{actionText}}", "View Order in Dashboard")
        .replace("{{companyName}}", emailData.companyName)
        .replace("{{companyWebsite}}", emailData.companyWebsite)
        .replace("ghccustomercare@gmail.com", emailData.supportEmail)
        .replace("{{whatsAppNumber}}", emailData.whatsAppNumber)
        .replace("{{whatsAppUrl}}", emailData.whatsAppUrl);

      await sendEmail(
        "ghccustomercare@gmail.com",
        `Order ${newShippingStatus} Notification`,
        shopOwnerEmailBody
      );
    } catch (emailError) {
      console.error("Failed to send shop owner webhook email:", {
        error:
          emailError instanceof Error ? emailError.message : "Unknown error",
        stack: emailError instanceof Error ? emailError.stack : "Unknown stack",
        orderId: order._id,
      });
    }

    return apiResponse(res, 200, true, "Webhook processed successfully");
  } catch (error: any) {
    console.error("Shiprocket webhook processing failed:", {
      error: error.message,
      stack: error.stack,
      orderId: req.body.order_id,
    });
    return apiResponse(
      res,
      500,
      false,
      error.message || "Webhook processing failed"
    );
  }
};

export {
  createOrder,
  getPaymentDetailsById,
  getPaymentHistory,
  initiateRefund,
  shiprocketWebhook,
  verifyPayment
};

