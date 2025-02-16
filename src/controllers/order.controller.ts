import dotenv from "dotenv";
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
  createShipRocketOrder,
  getOrderDetailsFromShipRocket,
  shipRocketReturnOrder,
  shipRocketTrackOrder,
} from "../services/shipRocket.service";
import apiResponse from "../utils/ApiResponse";

dotenv.config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID as string,
  key_secret: process.env.RAZORPAY_KEY_SECRET as string,
});

// Helper function to validate order inputs
const validateOrderInputs = (
  userId: string,
  products: any[],
  shippingAddressId: string,
  paymentMethod: string
) => {
  if (!userId || !products || !shippingAddressId || !paymentMethod) {
    throw new Error("All fields are required");
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid User ID");
  }

  if (!mongoose.Types.ObjectId.isValid(shippingAddressId)) {
    throw new Error("Invalid Shipping Address ID");
  }

  if (!Array.isArray(products) || products.length === 0) {
    throw new Error("Products are empty");
  }
};

// Helper function to process products and calculate total amount
const processProducts = async (products: any[]) => {
  let totalAmount = 0;
  const updatedProducts = [];

  for (const item of products) {
    const { productId, quantity, skuParameters } = item;

    if (!productId || !quantity) {
      throw new Error("Invalid product or quantity.");
    }

    const productDetails = await productModel.findById(productId);
    if (!productDetails) {
      throw new Error(`Product not found: ${productId}`);
    }

    if (productDetails.stock < quantity) {
      throw new Error(
        `Insufficient stock for product "${productDetails.name}". Available stock: ${productDetails.stock}.`
      );
    }

    // Deduct stock after placing the order
    productDetails.stock -= quantity;
    await productDetails.save();

    // Calculate price with discount and tax
    const discountAmount = (productDetails.price * (item.discount || 0)) / 100;
    const priceAfterDiscount = productDetails.price - discountAmount;
    const taxAmount = (priceAfterDiscount * (item.tax || 0)) / 100;
    const finalPricePerProduct = priceAfterDiscount + taxAmount;

    // Add to total order amount
    totalAmount += finalPricePerProduct * quantity;

    // Prepare product data including SKU parameters
    updatedProducts.push({
      productId: productId.toString(),
      quantity,
      selling_price: productDetails.price,
      name: productDetails.name,
      sku: productDetails.sku,
      discount: item.discount || 0,
      tax: item.tax || 0,
      dimensions: productDetails.dimensions,
      skuParameters: skuParameters || {},
    });
  }

  return { totalAmount, updatedProducts };
};

// Helper function to create a shipping record
const createShippingRecord = async (
  userId: string,
  orderId: string,
  shippingAddressId: string,
  addressSnapshot: any
) => {
  const shippingRecord = new ShippingModel({
    userId: new mongoose.Types.ObjectId(userId),
    orderId: new mongoose.Types.ObjectId(orderId),
    profileId: new mongoose.Types.ObjectId(shippingAddressId),
    addressSnapshot,
    shippingStatus: "Pending",
    estimatedDeliveryDate: new Date(
      new Date().setDate(new Date().getDate() + 7)
    ), // 7 days from today
  });

  return await shippingRecord.save();
};

// Main controller for creating an order
const createOrder = async (req: any, res: Response) => {
  try {
    const userId = req?.user?.id;
    const { products, shippingAddressId, paymentMethod, addressSnapshot } =
      req.body;

    // Validate inputs
    validateOrderInputs(userId, products, shippingAddressId, paymentMethod);

    // Process products and calculate total amount
    const { totalAmount, updatedProducts } = await processProducts(products);

    // Create Razorpay order if payment method is Razorpay
    let razorpayOrder = null;
    if (paymentMethod === "Razorpay") {
      const options = {
        amount: totalAmount * 100, // Convert to paise
        currency: "INR",
        receipt: `receipt_${Math.random().toString(36).substring(7)}`,
      };
      razorpayOrder = await razorpay.orders.create(options);
    }

    // Create payment record
    const payment = new PaymentModel({
      userId,
      paymentMethod,
      transactionId: razorpayOrder?.id || "COD",
      amount: totalAmount,
      status: "Pending",
    });
    await payment.save();

    // Create the order
    const newOrder = new orderModel({
      user_id: new mongoose.Types.ObjectId(userId),
      orderDate: new Date(),
      totalAmount,
      orderStatus: "Pending",
      products: updatedProducts,
      shippingAddressId: new mongoose.Types.ObjectId(shippingAddressId),
      payment_id: payment._id,
    });
    const savedOrder = await newOrder.save();

    // Update payment with order ID
    payment.orderId = savedOrder._id;
    await payment.save();

    // Create ShipRocket order
    const shipRocketResponse = await createShipRocketOrder({
      orderId: savedOrder._id.toString(),
      products: updatedProducts,
      addressSnapshot,
    });
    savedOrder.shipRocketOrderId = shipRocketResponse.order_id;
    await savedOrder.save();

    // Create shipping record
    const savedShipping = await createShippingRecord(
      userId,
      savedOrder._id.toString(),
      shippingAddressId,
      addressSnapshot
    );

    profileModel.updateOne(
      { user_id: userId },
      { $push: { orderList: savedOrder._id } }
    );

    // Return success response
    return apiResponse(res, 200, true, "Order placed successfully", {
      order: savedOrder,
      shipping: savedShipping,
      shipRocket: shipRocketResponse,
      razorpayOrder,
    });
  } catch (error: any) {
    console.error("Error while placing order:", error);
    return apiResponse(
      res,
      500,
      false,
      error.message || "Error while placing order"
    );
  }
};

const getOrderById = async (req: any, res: Response) => {
  try {
    const { orderId } = req.params;
    const userId = req?.user?.id;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return apiResponse(res, 400, false, "Invalid order ID.");
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return apiResponse(res, 400, false, "Invalid user ID.");
    }

    // Fetch the order by id and userId
    const order = await orderModel
      .findById(orderId)
      .populate("products.productId", "name price stock images")
      .populate({
        path: "shippingAddressId",
        select: "shoppingAddress",
      });

    if (!order) {
      return apiResponse(res, 404, false, "Order not found.");
    }

    if (order.user_id.toString() !== userId) {
      return apiResponse(
        res,
        403,
        false,
        "Access Denied: Order does not belong to this user."
      );
    }

    return apiResponse(res, 200, true, "Order found successfully.", order);
  } catch (error) {
    console.error("Error while Fetching OrderBy Id", error);
    return apiResponse(res, 500, false, "Error while Fetching OrderBy Id");
  }
};

const cancelOrder = async (req: any, res: Response) => {
  try {
    const { orderId } = req.params;
    const userId = req?.user?.id;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return apiResponse(res, 400, false, "Invalid OrderId");
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return apiResponse(res, 400, false, "Invalid userId");
    }

    // Fetch the order to cancel
    const order = await orderModel.findById(orderId);
    if (!order) {
      return apiResponse(res, 404, false, "Order not found");
    }

    if (order.user_id.toString() !== userId) {
      return apiResponse(
        res,
        403,
        false,
        "You are not authorized to cancel this order"
      );
    }

    if (order.orderStatus === "Cancelled") {
      return apiResponse(res, 400, false, "Order Already Cancelled");
    }

    // Updating the order status
    order.orderStatus = "Cancelled";
    const cancelOrder = await order.save();

    // Check if shipping exists and cancel it
    const shipping = await ShippingModel.findOne({
      orderId: orderId,
    });

    if (!shipping) {
      return apiResponse(res, 400, false, "Shipping not found for this order");
    }

    shipping.shippingStatus = "Cancelled";
    await shipping.save();

    // Cancel the order on ShipRocket
    const shipRocketResponse = await cancelShipRocketOrder(
      orderId,
      cancelOrder.shipRocketOrderId
    );

    // Send success response
    return apiResponse(res, 200, true, "Order Cancelled Successfully");
  } catch (error) {
    console.error("Error while canceling the order", error);
    return apiResponse(res, 500, false, "Error while canceling the order");
  }
};

const exchangeOrder = async (req: any, res: Response) => {
  try {
    const { orderId } = req.params;
    const userId = req?.user?.id;
    const {
      reason,
      products,
    }: {
      userId: string;
      reason: string;
      products: { productId: string; quantity: number }[];
    } = req.body;

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return apiResponse(res, 400, false, "Invalid order ID.");
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return apiResponse(res, 400, false, "Invalid user ID.");
    }

    if (!reason || !products || products.length === 0) {
      return apiResponse(
        res,
        400,
        false,
        "Please provide a reason and products for exchange."
      );
    }

    // Fetch the order
    const order = await orderModel.findById(orderId);
    if (!order) {
      return apiResponse(res, 404, false, "Order not found.");
    }

    if (order.user_id.toString() !== userId) {
      return apiResponse(
        res,
        403,
        false,
        "Access denied: Order does not belong to this user."
      );
    }

    if (order.orderStatus !== "Delivered") {
      return apiResponse(
        res,
        403,
        false,
        "Only delivered orders can be exchanged."
      );
    }

    // Product Validation
    const invalidProducts: string[] = [];
    for (const item of products) {
      const { productId, quantity } = item;
      const orderProduct = order.products.find(
        (p: { productId: mongoose.Types.ObjectId; quantity: number }) =>
          p.productId.toString() === productId && p.quantity >= quantity
      );

      if (!orderProduct) {
        invalidProducts.push(productId);
      }
    }

    if (invalidProducts.length > 0) {
      return apiResponse(
        res,
        400,
        false,
        `Invalid products or quantities in the request: ${invalidProducts.join(
          ", "
        )}`
      );
    }

    // Update stock for exchanged products
    for (const { productId, quantity } of products) {
      const productDetails = await productModel.findById(productId);
      if (!productDetails) {
        continue;
      }

      // Increase stock for returned products (since the user is returning them)
      productDetails.stock += quantity;
      await productDetails.save();
    }

    // Update order status and products
    order.orderStatus = "Exchange Requested";
    order.products = order.products.map((p: any) => {
      const matchingProduct = products.find(
        (prod) => prod.productId === p.productId.toString()
      );
      if (matchingProduct) {
        return {
          ...p,
          exchangeRequested: true,
          reason,
        };
      }
      return p;
    });

    const updatedOrder = await order.save();

    // Update the shipping status to "Exchanged"
    const shipping = await ShippingModel.findOne({ orderId: orderId });

    if (shipping) {
      shipping.shippingStatus = "Exchanged";
      await shipping.save();
    } else {
      console.log("No shipping record found for this order.");
    }

    return apiResponse(
      res,
      200,
      true,
      "Exchange request submitted successfully, and shipping status updated.",
      updatedOrder
    );
  } catch (error) {
    console.error("Error in Exchange product Request", error);
    return apiResponse(res, 500, false, "Error fulfilling exchange request.");
  }
};

const trackOrder = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return apiResponse(res, 400, false, "Order ID is required.");
    }

    const order = await orderModel.findById(orderId);
    if (!order) {
      return apiResponse(res, 404, false, "Order not found.");
    }

    const shipRocketOrderId = order.shipRocketOrderId;
    if (!shipRocketOrderId) {
      return apiResponse(
        res,
        404,
        false,
        "ShipRocket Order ID not found for this order."
      );
    }

    const orderDetails = await getOrderDetailsFromShipRocket(shipRocketOrderId);

    if (!orderDetails) {
      return apiResponse(
        res,
        404,
        false,
        "Unable to fetch order details from ShipRocket."
      );
    }

    const shipmentId = orderDetails?.data?.shipments?.id;

    if (!shipmentId) {
      return apiResponse(
        res,
        404,
        false,
        "Shipment ID not found in ShipRocket order details."
      );
    }

    const trackingDetails = await shipRocketTrackOrder(shipmentId);
    if (trackingDetails) {
      return apiResponse(
        res,
        200,
        true,
        "Order tracking details retrieved successfully.",
        trackingDetails
      );
    }

    return apiResponse(res, 404, false, "Order tracking details not found.");
  } catch (error) {
    console.error("Error tracking order:", error);
    return apiResponse(res, 500, false, "Error tracking order.");
  }
};

// TODO: Complete this Return Order Request
const returnOrder = async (req: any, res: Response) => {
  try {
    const { orderId } = req.params;
    const userId = req?.user?.id;
    const {
      reason,
      products,
    }: {
      reason: string;
      products: { productId: string; quantity: number }[];
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return apiResponse(res, 400, false, "Invalid order ID.");
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return apiResponse(res, 400, false, "Invalid user ID.");
    }

    if (!reason || !products || products.length === 0) {
      return apiResponse(
        res,
        400,
        false,
        "Please provide a reason and products."
      );
    }

    // Fetch the order
    const order = await orderModel.findById(orderId);
    if (!order) {
      return apiResponse(res, 404, false, "Order not found.");
    }

    if (order.user_id.toString() !== userId) {
      return apiResponse(
        res,
        403,
        false,
        "Access Denied: Order does not belong to user."
      );
    }

    if (order.orderStatus === "Cancelled") {
      return apiResponse(res, 403, false, "Order is already cancelled.");
    }

    if (order.orderStatus !== "Delivered") {
      return apiResponse(
        res,
        403,
        false,
        "Only delivered orders can be returned."
      );
    }

    const invalidProducts: string[] = [];
    for (const item of products) {
      const { productId, quantity } = item;
      const orderProduct = order.products.find(
        (p: any) =>
          p.productId.toString() === productId && p.quantity >= quantity
      );

      if (!orderProduct) {
        invalidProducts.push(productId);
      }
    }

    if (invalidProducts.length > 0) {
      return apiResponse(
        res,
        400,
        false,
        `Invalid products or quantities in the request: ${invalidProducts.join(
          ", "
        )}`
      );
    }

    for (const { productId, quantity } of products) {
      const productDetails = await productModel.findById(productId);
      if (productDetails) {
        productDetails.stock += quantity;
        await productDetails.save();
      }
    }

    order.orderStatus = "Return Requested";
    order.shippingStatus = "Returned";
    order.products = order.products.map((p: any) => {
      const matchingProduct = products.find(
        (prod) => prod.productId === p.productId.toString()
      );
      if (matchingProduct) {
        return {
          ...p,
          returnRequested: true,
          reason,
        };
      }
      return p;
    });

    const updatedOrder = await order.save();

    // Update shipping status if applicable
    const shipping = await ShippingModel.findOne({ orderId });
    if (shipping) {
      shipping.shippingStatus = "Returned";
      await shipping.save();
    }

    // Fetch order details from ShipRocket
    const shipRocketOrderId = order.shipRocketOrderId;
    const details = await getOrderDetailsFromShipRocket(shipRocketOrderId);

    if (!details) {
      return apiResponse(
        res,
        400,
        false,
        "Error fetching details from ShipRocket."
      );
    }

    const { data } = details;
    const shipRocketPayload = {
      order_id: order._id,
      order_date: order.orderDate,
      channel_id: data.channel_id,
      pickup_customer_name: data.customer_name,
      pickup_email: data.customer_email,
      pickup_phone: data.customer_phone,
      pickup_address: data.customer_address,
      pickup_city: data.customer_city,
      pickup_state: data.customer_state,
      pickup_pincode: data.customer_pincode,
      pickup_country: data.customer_country,
      shipping_customer_name: data.customer_name,
      shipping_email: data.customer_email,
      shipping_phone: data.customer_phone,
      shipping_address: data.customer_address,
      shipping_city: data.customer_city,
      shipping_state: data.customer_state,
      shipping_pincode: data.customer_pincode,
      shipping_country: data.customer_country,
      order_items: products.map((p) => ({
        name: p.productId,
        sku: p.productId,
        units: p.quantity,
        selling_price: "1200",
      })),
      payment_method: data.payment_method,
      sub_total: data.total,
      length: data.shipments.length,
      breadth: data.shipments.breadth,
      height: data.shipments.height,
      weight: data.shipments.weight,
    };

    const shipRocketResponse = await shipRocketReturnOrder(shipRocketPayload);
    if (!shipRocketResponse) {
      return apiResponse(res, 400, false, "ShipRocket API response error.");
    }

    return apiResponse(res, 200, true, "Return Order Successfully", {
      updatedOrder,
      shipRocketResponse,
    });
  } catch (error) {
    console.error("Error while Return Order", error);
    return apiResponse(res, 500, false, "Error while Return Order");
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

