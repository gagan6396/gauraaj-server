import { Request, Response } from "express";
import mongoose from "mongoose";
import Razorpay from "razorpay";
import orderModel from "../models/Order.model";
import PaymentModel from "../models/Payment.model";
import productModel from "../models/Product.model";
import profileModel from "../models/Profile.model";
import ShippingModel from "../models/Shipping.model";
import {
  cancelShipRocketOrder,
  getOrderDetailsFromShipRocket,
  shipRocketReturnOrder,
  shipRocketTrackOrder,
} from "../services/shipRocket.service";
import apiResponse from "../utils/ApiResponse";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID as string,
  key_secret: process.env.RAZORPAY_KEY_SECRET as string,
});

const createOrder = async (req: any, res: Response) => {
  try {
    const userId = req?.user?.id;
    const { products, shippingAddress, paymentMethod, userDetails } = req.body;

    if (
      !userId ||
      !products?.length ||
      !shippingAddress ||
      !paymentMethod ||
      !userDetails
    ) {
      throw new Error("Missing required fields");
    }

    const { totalAmount, updatedProducts } = await processProducts(products);

    const newOrder = new orderModel({
      user_id: userId,
      orderDate: new Date(),
      totalAmount,
      orderStatus: "Pending",
      shippingStatus: "Pending",
      products: updatedProducts,
      shippingAddressId: new mongoose.Types.ObjectId(), // Temporary ID
    });

    const savedOrder = await newOrder.save();

    let paymentData;
    if (paymentMethod === "Razorpay") {
      const razorpayOrder = await razorpay.orders.create({
        amount: totalAmount * 100,
        currency: "INR",
        receipt: `order_${savedOrder._id}`,
      });

      paymentData = new PaymentModel({
        userId,
        orderId: savedOrder._id,
        paymentMethod,
        transactionId: razorpayOrder.id,
        amount: totalAmount,
        status: "Pending",
      });
    } else if (paymentMethod === "COD") {
      paymentData = new PaymentModel({
        userId,
        orderId: savedOrder._id,
        paymentMethod,
        transactionId: `COD_${savedOrder._id}`,
        amount: totalAmount,
        status: "Pending",
      });
    } else {
      throw new Error("Invalid payment method");
    }

    const savedPayment = await paymentData.save();
    savedOrder.payment_id = savedPayment._id;
    await savedOrder.save();

    await profileModel.updateOne(
      { user_id: userId },
      {
        $set: {
          first_name: userDetails.name.split(" ")[0],
          last_name: userDetails.name.split(" ").slice(1).join(" ") || "",
          phone: userDetails.phone,
          shippingAddress,
        },
        $push: { orderList: savedOrder._id },
      }
    );

    return apiResponse(res, 200, true, "Order created successfully", {
      orderId: savedOrder._id,
      totalAmount,
      razorpayOrderId:
        paymentMethod === "Razorpay" ? paymentData.transactionId : null,
    });
  } catch (error: any) {
    console.error("Order creation failed:", error);
    // Manual rollback (optional)
    if (error.orderId) {
      await orderModel.deleteOne({ _id: error.orderId });
      await PaymentModel.deleteOne({ orderId: error.orderId });
    }
    return apiResponse(
      res,
      400,
      false,
      error.message || "Failed to create order"
    );
  }
};

const processProducts = async (products: any[]) => {
  let totalAmount = 0;
  const updatedProducts = [];

  for (const item of products) {
    const { productId, quantity } = item;

    if (!mongoose.Types.ObjectId.isValid(productId) || quantity < 1) {
      throw new Error("Invalid product ID or quantity");
    }

    const product = await productModel.findById(productId);
    if (!product) {
      throw new Error(`Product not found: ${productId}`);
    }
    if (product.stock < quantity) {
      throw new Error(`Insufficient stock for "${product.name}"`);
    }

    const discount = item.discount || 0;
    const tax = item.tax || 0;
    const priceAfterDiscount = product.price - (product.price * discount) / 100;
    const finalPrice = priceAfterDiscount + (priceAfterDiscount * tax) / 100;

    totalAmount += finalPrice * quantity;

    updatedProducts.push({
      productId: productId,
      quantity,
      selling_price: product.price,
      name: product.name,
      sku: product.sku,
      discount,
      tax,
      dimensions: product.dimensions,
    });

    product.stock -= quantity;
    await product.save();
  }

  return { totalAmount, updatedProducts };
};
// Fetch Order by ID
const getOrderById = async (req: any, res: Response) => {
  try {
    const { orderId } = req.params;
    const userId = req?.user?.id;

    if (
      !mongoose.Types.ObjectId.isValid(orderId) ||
      !mongoose.Types.ObjectId.isValid(userId)
    ) {
      return apiResponse(res, 400, false, "Invalid order or user ID.");
    }

    const order = await orderModel
      .findOne({ _id: orderId, user_id: userId })
      .populate("products.productId", "name price stock images")
      .populate("shippingAddressId", "shoppingAddress");

    if (!order) {
      return apiResponse(res, 404, false, "Order not found or access denied.");
    }

    return apiResponse(res, 200, true, "Order retrieved successfully.", order);
  } catch (error) {
    console.error("Error fetching order:", error);
    return apiResponse(res, 500, false, "Failed to fetch order.");
  }
};

// Cancel Order
const cancelOrder = async (req: any, res: Response) => {
  try {
    const { orderId } = req.params;
    const userId = req?.user?.id;

    if (
      !mongoose.Types.ObjectId.isValid(orderId) ||
      !mongoose.Types.ObjectId.isValid(userId)
    ) {
      return apiResponse(res, 400, false, "Invalid order or user ID.");
    }

    const order = await orderModel.findOne({ _id: orderId, user_id: userId });
    if (!order) {
      return apiResponse(res, 404, false, "Order not found or access denied.");
    }

    if (order.orderStatus === "Cancelled") {
      return apiResponse(res, 400, false, "Order is already cancelled.");
    }

    if (["Shipped", "Delivered"].includes(order.orderStatus)) {
      return apiResponse(
        res,
        400,
        false,
        "Cannot cancel shipped or delivered order."
      );
    }

    order.orderStatus = "Cancelled";
    await order.save();

    const shipping = await ShippingModel.findOneAndUpdate(
      { orderId },
      { shippingStatus: "Cancelled" },
      { new: true }
    );

    if (order.shipRocketOrderId) {
      await cancelShipRocketOrder(orderId, order.shipRocketOrderId);
    }

    return apiResponse(res, 200, true, "Order cancelled successfully.", {
      order,
      shipping,
    });
  } catch (error) {
    console.error("Error cancelling order:", error);
    return apiResponse(res, 500, false, "Failed to cancel order.");
  }
};

// Exchange Order
const exchangeOrder = async (req: any, res: Response) => {
  try {
    const { orderId } = req.params;
    const userId = req?.user?.id;
    const { reason, products } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(orderId) ||
      !mongoose.Types.ObjectId.isValid(userId)
    ) {
      return apiResponse(res, 400, false, "Invalid order or user ID.");
    }

    if (!reason || !products?.length) {
      return apiResponse(res, 400, false, "Reason and products are required.");
    }

    const order = await orderModel.findOne({ _id: orderId, user_id: userId });
    if (!order) {
      return apiResponse(res, 404, false, "Order not found or access denied.");
    }

    if (order.orderStatus !== "Delivered") {
      return apiResponse(
        res,
        400,
        false,
        "Only delivered orders can be exchanged."
      );
    }

    const invalidProducts = products.filter((item: any) => {
      const orderProduct = order.products.find(
        (p: any) =>
          p.productId.toString() === item.productId &&
          p.quantity >= item.quantity
      );
      return !orderProduct;
    });

    if (invalidProducts.length) {
      return apiResponse(
        res,
        400,
        false,
        "Invalid products or quantities specified."
      );
    }

    for (const { productId, quantity } of products) {
      const product = await productModel.findById(productId);
      if (product) {
        product.stock += quantity;
        await product.save();
      }
    }

    order.orderStatus = "Exchange Requested";
    order.products = order.products.map((p: any) => {
      const match = products.find(
        (prod: any) => prod.productId === p.productId.toString()
      );
      return match ? { ...p, exchangeRequested: true, reason } : p;
    });
    await order.save();

    await ShippingModel.findOneAndUpdate(
      { orderId },
      { shippingStatus: "Exchange Requested" }
    );

    return apiResponse(res, 200, true, "Exchange request submitted.", order);
  } catch (error) {
    console.error("Error in exchange request:", error);
    return apiResponse(res, 500, false, "Failed to process exchange request.");
  }
};

// Track Order
const trackOrder = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return apiResponse(res, 400, false, "Invalid order ID.");
    }

    const order = await orderModel.findById(orderId);
    if (!order || !order.shipRocketOrderId) {
      return apiResponse(
        res,
        404,
        false,
        "Order or ShipRocket details not found."
      );
    }

    const orderDetails = await getOrderDetailsFromShipRocket(
      order.shipRocketOrderId
    );
    const shipmentId = orderDetails?.data?.shipments?.id;

    if (!shipmentId) {
      return apiResponse(res, 404, false, "Shipment ID not available.");
    }

    const trackingDetails = await shipRocketTrackOrder(shipmentId);
    return apiResponse(
      res,
      200,
      true,
      "Tracking details retrieved.",
      trackingDetails
    );
  } catch (error) {
    console.error("Error tracking order:", error);
    return apiResponse(res, 500, false, "Failed to track order.");
  }
};

// Return Order
const returnOrder = async (req: any, res: Response) => {
  try {
    const { orderId } = req.params;
    const userId = req?.user?.id;
    const { reason, products } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(orderId) ||
      !mongoose.Types.ObjectId.isValid(userId)
    ) {
      return apiResponse(res, 400, false, "Invalid order or user ID.");
    }

    if (!reason || !products?.length) {
      return apiResponse(res, 400, false, "Reason and products are required.");
    }

    const order = await orderModel.findOne({ _id: orderId, user_id: userId });
    if (!order) {
      return apiResponse(res, 404, false, "Order not found or access denied.");
    }

    if (order.orderStatus !== "Delivered") {
      return apiResponse(
        res,
        400,
        false,
        "Only delivered orders can be returned."
      );
    }

    const invalidProducts = products.filter((item: any) => {
      const orderProduct = order.products.find(
        (p: any) =>
          p.productId.toString() === item.productId &&
          p.quantity >= item.quantity
      );
      return !orderProduct;
    });

    if (invalidProducts.length) {
      return apiResponse(
        res,
        400,
        false,
        "Invalid products or quantities specified."
      );
    }

    for (const { productId, quantity } of products) {
      const product = await productModel.findById(productId);
      if (product) {
        product.stock += quantity;
        await product.save();
      }
    }

    order.orderStatus = "Return Requested";
    order.products = order.products.map((p: any) => {
      const match = products.find(
        (prod: any) => prod.productId === p.productId.toString()
      );
      return match ? { ...p, returnRequested: true, reason } : p;
    });
    await order.save();

    const shipping = await ShippingModel.findOneAndUpdate(
      { orderId },
      { shippingStatus: "Returned" },
      { new: true }
    );

    if (order.shipRocketOrderId) {
      const details = await getOrderDetailsFromShipRocket(
        order.shipRocketOrderId
      );
      const payload = {
        order_id: order._id.toString(),
        order_date: order.orderDate,
        channel_id: details?.data?.channel_id,
        pickup_customer_name: details?.data?.customer_name,
        pickup_email: details?.data?.customer_email,
        pickup_phone: details?.data?.customer_phone,
        pickup_address: details?.data?.customer_address,
        pickup_city: details?.data?.customer_city,
        pickup_state: details?.data?.customer_state,
        pickup_pincode: details?.data?.customer_pincode,
        pickup_country: details?.data?.customer_country,
        shipping_customer_name: details?.data?.customer_name,
        shipping_email: details?.data?.customer_email,
        shipping_phone: details?.data?.customer_phone,
        shipping_address: details?.data?.customer_address,
        shipping_city: details?.data?.customer_city,
        shipping_state: details?.data?.customer_state,
        shipping_pincode: details?.data?.customer_pincode,
        shipping_country: details?.data?.customer_country,
        order_items: products.map((p: any) => ({
          name: p.productId,
          sku: p.productId,
          units: p.quantity,
          selling_price: "1200", // Replace with actual price logic if available
        })),
        payment_method: details?.data?.payment_method,
        sub_total: details?.data?.total,
        length: details?.data?.shipments?.length || 10,
        breadth: details?.data?.shipments?.breadth || 5,
        height: details?.data?.shipments?.height || 8,
        weight: details?.data?.shipments?.weight || 0.5,
      };
      const shipRocketResponse = await shipRocketReturnOrder(payload);
      return apiResponse(res, 200, true, "Return requested successfully.", {
        order,
        shipRocketResponse,
      });
    }

    return apiResponse(res, 200, true, "Return requested successfully.", order);
  } catch (error) {
    console.error("Error processing return:", error);
    return apiResponse(res, 500, false, "Failed to process return request.");
  }
};

export {
  cancelOrder,
  createOrder,
  exchangeOrder,
  getOrderById,
  returnOrder,
  trackOrder
};

