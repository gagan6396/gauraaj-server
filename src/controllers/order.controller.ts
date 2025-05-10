import axios, { AxiosError } from "axios";
import { Request, Response } from "express";
import mongoose from "mongoose";
import Razorpay from "razorpay";
import shipRocketConfig from "../config/shipRocketConfig";
import CartModel from "../models/Cart.model";
import orderModel, { Order } from "../models/Order.model";
import PaymentModel, { Payment } from "../models/Payment.model";
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
import { sendEmail } from "../utils/EmailHelper";
const emailTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background: #fff; padding: 20px; border-radius: 8px; }
    .header { background: #007bff; color: #fff; padding: 15px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { padding: 20px; }
    .footer { text-align: center; padding: 10px; color: #666; font-size: 12px; }
    .button { display: inline-block; padding: 10px 20px; background: #007bff; color: #fff; text-decoration: none; border-radius: 5px; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #f8f8f8; }
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
      <table>
        <tr><th>Order ID</th><td>{{orderId}}</td></tr>
        <tr><th>Order Date</th><td>{{orderDate}}</td></tr>
        <tr><th>Status</th><td>{{status}}</td></tr>
        {{additionalDetails}}
      </table>
      <p>{{closingMessage}}</p>
      <a href="{{actionUrl}}" class="button">{{actionText}}</a>
    </div>
    <div class="footer">
      <p>Gauraaj | <a href="https://www.gauraaj.com">Visit our website</a></p>
      <p>Contact: <a href="mailto:ghccustomercare@gmail.com">ghccustomercare@gmail.com</a></p>
    </div>
  </div>
</body>
</html>
`;

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID as string,
  key_secret: process.env.RAZORPAY_KEY_SECRET as string,
});

// 1. Product Added to Cart
const addProductToCart = async (req: any, res: Response) => {
  try {
    const userId = req?.user?.id;
    const { productId, variantId } = req?.params;
    const { quantity, postalCode } = req?.body; // Added postalCode for delivery check

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return apiResponse(res, 400, false, "Invalid product ID.");
    }
    if (!mongoose.Types.ObjectId.isValid(variantId)) {
      return apiResponse(res, 400, false, "Invalid variant ID.");
    }
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return apiResponse(res, 400, false, "Invalid user ID.");
    }
    if (!postalCode) {
      return apiResponse(res, 400, false, "Postal code is required.");
    }

    const parsedQuantity = Number(quantity);
    if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
      return apiResponse(res, 400, false, "Quantity must be greater than 0.");
    }

    const product = await productModel.findById(productId);
    if (!product) {
      return apiResponse(res, 404, false, "Product not found.");
    }

    const variant = product.variants.find((v: any) => v._id.equals(variantId));
    if (!variant) {
      return apiResponse(res, 404, false, "Variant not found.");
    }
    if (variant.stock < parsedQuantity) {
      return apiResponse(
        res,
        400,
        false,
        `Insufficient stock: ${variant.stock}`
      );
    }

    // Check delivery availability
    const deliveryAvailable = await checkDeliveryAvailability(
      postalCode,
      product
    );
    if (!deliveryAvailable.isAvailable) {
      return apiResponse(res, 400, false, deliveryAvailable.message);
    }

    let cart = await CartModel.findOne({ userId });
    if (!cart) {
      cart = await CartModel.create({
        userId: new mongoose.Types.ObjectId(userId),
        products: [],
      });
    }

    const productInCart = cart.products.find(
      (item: any) =>
        item.productId.toString() === productId &&
        item.variantId.toString() === variantId
    );

    if (productInCart) {
      productInCart.quantity += parsedQuantity;
      if (productInCart.quantity > variant.stock) {
        return apiResponse(
          res,
          400,
          false,
          `Insufficient stock: ${variant.stock}`
        );
      }
    } else {
      cart.products.push({
        productId: new mongoose.Types.ObjectId(productId),
        variantId: new mongoose.Types.ObjectId(variantId),
        quantity: parsedQuantity,
      });
    }

    await cart.save();
    const updatedCart = await CartModel.findById(cart._id).populate({
      path: "products.productId",
      select: "name images variants rating brand",
    });

    return apiResponse(res, 200, true, "Product added to cart.", updatedCart);
  } catch (error) {
    console.error("Error adding product to cart:", error);
    return apiResponse(res, 500, false, "Internal Server Error");
  }
};

// Helper function to check delivery availability
const checkDeliveryAvailability = async (postalCode: string, product: any) => {
  try {
    const token = await getShipRocketToken();
    const response = await axios.get(
      `${shipRocketConfig.baseUrl}/v1/external/courier/serviceability/`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        params: {
          pickup_postcode: product.supplier_id.postalCode || "110001",
          delivery_postcode: postalCode,
          weight: product.variants[0].weight,
          length: product.variants[0].dimensions.length,
          breadth: product.variants[0].dimensions.width,
          height: product.variants[0].dimensions.height,
          cod: false,
          declared_value: parseFloat(product.variants[0].price.toString()),
        },
      }
    );

    const availableCouriers = response.data.data.available_courier_companies;
    if (!availableCouriers.length) {
      return {
        isAvailable: false,
        message: "Delivery not available to this location.",
      };
    }

    return {
      isAvailable: true,
      message: "Delivery available.",
      couriers: availableCouriers,
    };
  } catch (error) {
    console.error("Error checking delivery availability:", error);
    return {
      isAvailable: false,
      message: "Unable to check delivery availability.",
    };
  }
};

// 2. Calculating Shipping Charges
const calculateShippingCharges = async (req: any, res: Response) => {
  try {
    const userId = req?.user?.id;
    const { postalCode, products, isCOD } = req.body;

    // Validate inputs
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return apiResponse(res, 400, false, "Invalid user ID.");
    }
    if (!postalCode || !products?.length) {
      return apiResponse(
        res,
        400,
        false,
        "Postal code and products are required."
      );
    }

    let totalWeight = 0;
    let totalDimensions = { length: 0, width: 0, height: 0 };
    let subTotal = 0;

    // Calculate total weight, dimensions, and subtotal
    for (const item of products) {
      const product = await productModel.findById(item.productId);
      if (!product) {
        return apiResponse(
          res,
          404,
          false,
          `Product not found: ${item.productId}`
        );
      }
      const variant = product.variants.find((v: any) =>
        v._id.equals(item.variantId)
      );
      if (!variant) {
        return apiResponse(
          res,
          404,
          false,
          `Variant not found: ${item.variantId}`
        );
      }

      totalWeight += variant.weight * item.quantity;
      totalDimensions.length += variant.dimensions.length * item.quantity;
      totalDimensions.width += variant.dimensions.width * item.quantity;
      totalDimensions.height += variant.dimensions.height * item.quantity;
      subTotal += parseFloat(variant.price.toString()) * item.quantity;
    }

    // Validate calculated values
    if (totalWeight <= 0) {
      return apiResponse(
        res,
        400,
        false,
        "Total weight must be greater than zero."
      );
    }
    if (
      totalDimensions.length <= 0 ||
      totalDimensions.width <= 0 ||
      totalDimensions.height <= 0
    ) {
      return apiResponse(
        res,
        400,
        false,
        "Dimensions must be greater than zero."
      );
    }

    // Get Shiprocket token
    const token = await getShipRocketToken();

    // Configurable pickup postcode (from environment or default)
    const pickupPostcode = process.env.SHIPROCKET_PICKUP_POSTCODE || "248001";

    // Make API request to Shiprocket
    const response = await axios.get(
      `${shipRocketConfig.baseUrl}/v1/external/courier/serviceability/`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        params: {
          pickup_postcode: pickupPostcode,
          delivery_postcode: postalCode,
          weight: totalWeight,
          length: totalDimensions.length,
          breadth: totalDimensions.width,
          height: totalDimensions.height,
          cod: isCOD,
          declared_value: subTotal, // Required field
        },
      }
    );

    console.log("ShipRocket response:", response.data);

    const couriers = response.data.data.available_courier_companies;
    if (!couriers.length) {
      return apiResponse(
        res,
        400,
        false,
        "No couriers available for this location."
      );
    }

    // Map courier options
    const shippingOptions = couriers.map((courier: any) => ({
      courierName: courier.courier_name,
      rate: courier.rate,
      estimatedDeliveryDays: courier.estimated_delivery_days,
      type: courier.is_express ? "Express" : "Standard",
    }));

    return apiResponse(res, 200, true, "Shipping charges calculated.", {
      shippingOptions,
      subTotal,
      totalWeight,
    });
  } catch (error: any) {
    // Enhanced error handling for Axios errors
    if (error instanceof AxiosError) {
      const errorMessage =
        error.response?.data?.message || "Failed to fetch shipping charges";
      console.error("Shiprocket API error:", {
        status: error.response?.status,
        message: errorMessage,
        errors: error.response?.data?.errors,
      });
      return apiResponse(
        res,
        error.response?.status || 500,
        false,
        errorMessage
      );
    }

    console.error("Error calculating shipping charges:", error);
    return apiResponse(res, 500, false, "Error calculating shipping charges");
  }
};

// 3. Create Order
const createOrder = async (req: any, res: Response) => {
  try {
    const userId = req?.user?.id;
    const {
      products,
      shippingAddress,
      paymentMethod,
      userDetails,
      courierName,
    } = req.body;

    console.log(
      "Creating order with products:",
      products,
      "Shipping address:",
      shippingAddress,
      "Payment method:",
      paymentMethod,
      "User details:",
      userDetails,
      "Shipping method:",
      courierName,
      "User ID:",
      userId
    );

    if (
      !userId ||
      !products?.length ||
      !shippingAddress ||
      !userDetails ||
      !courierName ||
      !Number.isInteger(paymentMethod) ||
      ![0, 1].includes(paymentMethod)
    ) {
      throw new Error("Missing or invalid required fields");
    }

    const { totalAmount, updatedProducts } = await processProducts(products);
    const isCOD = paymentMethod === 1 ? 1 : 0;
    const shippingCharges = await calculateShippingChargesForOrder(
      products,
      shippingAddress.postalCode,
      courierName,
      isCOD
    );

    const newOrder = new orderModel({
      user_id: userId,
      orderDate: new Date(),
      totalAmount: totalAmount + shippingCharges.rate,
      orderStatus: "Pending",
      shippingStatus: "Pending",
      products: updatedProducts,
      shippingAddressId: new mongoose.Types.ObjectId(), // Temporary ID
      paymentMethod,
      userDetails: {
        name: userDetails.name,
        phone: userDetails.phone,
        email: userDetails.email,
      },
      estimatedDeliveryDays: shippingCharges.estimatedDeliveryDays,
      courierService: shippingCharges.courierName, // Store courier name
    });

    const savedOrder = await newOrder.save();

    let paymentData;
    if (paymentMethod === 0) {
      // Razorpay
      const razorpayOrder = await razorpay.orders.create({
        amount: (totalAmount + shippingCharges.rate) * 100,
        currency: "INR",
        receipt: `order_${savedOrder._id}`,
      });

      paymentData = new PaymentModel({
        userId,
        orderId: savedOrder._id,
        paymentMethod: "Razorpay",
        transactionId: razorpayOrder.id,
        amount: totalAmount + shippingCharges.rate,
        status: "Pending",
      });
    } else if (paymentMethod === 1) {
      // COD
      paymentData = new PaymentModel({
        userId,
        orderId: savedOrder._id,
        paymentMethod: "COD",
        transactionId: `COD_${savedOrder._id}`,
        amount: totalAmount + shippingCharges.rate,
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
          shoppingAddress: shippingAddress,
        },
        $push: { orderList: savedOrder._id },
      }
    );

    await CartModel.updateOne(
      { user_id: userId },
      {
        $pull: {
          items: {
            productId: { $in: updatedProducts.map((p) => p.productId) },
            variantId: { $in: updatedProducts.map((p) => p.variantId) },
          },
        },
      }
    );

    return apiResponse(res, 200, true, "Order created successfully", {
      orderId: savedOrder._id,
      totalAmount: totalAmount + shippingCharges.rate,
      shippingCharges: shippingCharges.rate,
      estimatedDeliveryDays: shippingCharges.estimatedDeliveryDays,
      courierName: shippingCharges.courierName,
      razorpayOrderId: paymentMethod === 0 ? paymentData.transactionId : null,
    });
  } catch (error: any) {
    console.log("Error creating order:", error);

    console.error("Order creation failed:", {
      message: error.message,
      stack: error.stack,
      input: req.body,
    });
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
    const { productId, variantId, quantity } = item;

    if (
      !mongoose.Types.ObjectId.isValid(productId) ||
      !variantId ||
      quantity < 1
    ) {
      throw new Error("Invalid product ID, variant ID, or quantity");
    }

    const product = await productModel.findById(productId);
    if (!product) {
      throw new Error(`Product not found: ${productId}`);
    }

    const variant = product.variants.find((v: any) => v._id.equals(variantId));
    if (!variant) {
      throw new Error(
        `Variant not found: ${variantId} for product ${productId}`
      );
    }
    if (variant.stock < quantity) {
      throw new Error(
        `Insufficient stock for "${product.name} - ${variant.name}"`
      );
    }

    const price = parseFloat(variant.price.toString());
    totalAmount += price * quantity;

    updatedProducts.push({
      productId: productId,
      variantId: variant._id,
      quantity,
      price,
      name: `${product.name} - ${variant.name}`,
      skuParameters: {
        weight: variant.weight.toString(), // Already included
        sku: variant.sku, // Add SKU from variant
        length: variant.dimensions.length.toString(), // Optional
        breadth: variant.dimensions.width.toString(), // Optional
        height: variant.dimensions.height.toString(), // Optional
      },
    });

    variant.stock -= quantity;
    await product.save();
  }

  return { totalAmount, updatedProducts };
};

const calculateShippingChargesForOrder = async (
  products: any[],
  postalCode: string,
  courierName: string, // Changed from shippingMethod to courierName
  isCOD: number
) => {
  try {
    let totalWeight = 0;
    let totalDimensions = { length: 0, width: 0, height: 0 };
    let subTotal = 0;

    // Calculate total weight, dimensions, and subtotal
    for (const item of products) {
      const product = await productModel.findById(item.productId);
      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }
      const variant = product.variants.find((v: any) =>
        v._id.equals(item.variantId)
      );
      if (!variant) {
        throw new Error(`Variant not found: ${item.variantId}`);
      }
      totalWeight += variant.weight * item.quantity;
      totalDimensions.length += variant.dimensions.length * item.quantity;
      totalDimensions.width += variant.dimensions.width * item.quantity;
      totalDimensions.height += variant.dimensions.height * item.quantity;
      subTotal += parseFloat(variant.price.toString()) * item.quantity;
    }

    // Validate calculated values
    if (totalWeight <= 0) {
      throw new Error("Total weight must be greater than zero.");
    }
    if (
      totalDimensions.length <= 0 ||
      totalDimensions.width <= 0 ||
      totalDimensions.height <= 0
    ) {
      throw new Error("Dimensions must be greater than zero.");
    }

    // Get Shiprocket token
    const token = await getShipRocketToken();

    // Configurable pickup postcode
    const pickupPostcode = process.env.SHIPROCKET_PICKUP_POSTCODE || "248001";

    // Make API request to Shiprocket
    const response = await axios.get(
      `${shipRocketConfig.baseUrl}/v1/external/courier/serviceability/`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        params: {
          pickup_postcode: pickupPostcode,
          delivery_postcode: postalCode,
          weight: totalWeight,
          length: totalDimensions.length,
          breadth: totalDimensions.width,
          height: totalDimensions.height,
          cod: isCOD,
          declared_value: subTotal,
        },
      }
    );

    const couriers = response.data.data.available_courier_companies;
    if (!couriers || couriers.length === 0) {
      throw new Error("No couriers available for this location.");
    }

    // Find the courier matching the provided courier_name
    const selectedCourier = couriers.find(
      (c: any) => c.courier_name.toLowerCase() === courierName.toLowerCase()
    );

    if (!selectedCourier) {
      console.error("Available couriers:", couriers);
      throw new Error(`Courier '${courierName}' not available.`);
    }

    return {
      rate: selectedCourier.rate,
      estimatedDeliveryDays: parseInt(
        selectedCourier.estimated_delivery_days,
        10
      ),
      courierName: selectedCourier.courier_name,
    };
  } catch (error: any) {
    if (error instanceof AxiosError) {
      const errorMessage =
        error.response?.data?.message || "Failed to fetch shipping charges";
      console.error("Shiprocket API error:", {
        status: error.response?.status,
        message: errorMessage,
        errors: error.response?.data?.errors,
        requestParams: {
          postalCode,
          isCOD,
        },
      });
      throw new Error(errorMessage);
    }
    console.error("Error calculating shipping charges for order:", error);
    throw new Error(error.message || "Failed to calculate shipping charges");
  }
};

// 4. Ship Order
const shipOrder = async (req: any, res: Response) => {
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
      .findById(orderId)
      .populate("user_id payment_id");
    if (!order) {
      return apiResponse(res, 404, false, "Order not found.");
    }
    if (order.user_id._id.toString() !== userId) {
      return apiResponse(res, 403, false, "Unauthorized access to order.");
    }
    if (order.orderStatus !== "Confirmed") {
      return apiResponse(res, 400, false, "Order must be confirmed to ship.");
    }

    const shipping = await ShippingModel.findOne({ orderId });
    if (!shipping) {
      return apiResponse(res, 400, false, "Shipping record not found.");
    }

    const token = await getShipRocketToken();
    const shippingLabelResponse = await axios.post(
      `${shipRocketConfig.baseUrl}/v1/external/courier/generate/label`,
      { shipment_id: order.shipRocketOrderId },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const trackingNumber = `TRK${order._id}${Date.now()}`;

    const courierResponse = await axios.post(
      `${shipRocketConfig.baseUrl}/v1/external/courier/assign/awb`,
      { shipment_id: order.shipRocketOrderId },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const courierDetails = courierResponse.data.courier;

    shipping.trackingNumber = trackingNumber;
    shipping.courierService = courierDetails.courier_name;
    shipping.shippingStatus = "Shipped";
    shipping.shippedAt = new Date();
    await shipping.save();

    order.orderStatus = "Shipped";
    order.shippingStatus = "Shipped";
    await order.save();

    // Send shipped notification
    await sendOrderNotification(order, "shipped", {
      courier: courierDetails.courier_name,
      trackingNumber,
      trackUrl: `https://www.gauraaj.com/track/${order._id}`,
    });

    return apiResponse(res, 200, true, "Order shipped successfully.", {
      orderId,
      trackingNumber,
      courier: courierDetails.courier_name,
    });
  } catch (error) {
    console.error("Error shipping order:", error);
    return apiResponse(res, 500, false, "Error shipping order.");
  }
};

// 5. Track Order
const trackOrder = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return apiResponse(res, 400, false, "Invalid order ID.");
    }

    const order = await orderModel.findById(orderId);
    if (!order) {
      return apiResponse(res, 404, false, "Order not found.");
    }

    const shipRocketOrderId = order.shipRocketOrderId;
    if (!shipRocketOrderId) {
      return apiResponse(res, 404, false, "ShipRocket Order ID not found.");
    }

    const orderDetails = await getOrderDetailsFromShipRocket(shipRocketOrderId);
    if (!orderDetails) {
      return apiResponse(
        res,
        404,
        false,
        "Unable to fetch ShipRocket order details."
      );
    }

    const shipmentId = orderDetails?.data?.shipments?.id;
    if (!shipmentId) {
      return apiResponse(res, 404, false, "Shipment ID not found.");
    }

    const trackingDetails = await shipRocketTrackOrder(shipmentId);
    console.log("Tracking details retrieved:", trackingDetails);
    if (!trackingDetails) {
      return apiResponse(res, 404, false, "Tracking details not found.");
    }

    // Format tracking response
    const formattedTracking = {
      orderId,
      status: order.orderStatus,
      shippingStatus: order.shippingStatus,
      trackingDetails: {
        awbCode: trackingDetails.tracking_data?.shipment_track[0].awb_code,
        courierName:
          trackingDetails.tracking_data?.shipment_track[0].courier_name,
        currentStatus:
          trackingDetails.tracking_data?.shipment_track[0].current_status,
        estimatedDelivery: trackingDetails?.tracking_data.shipment_track[0].edd,
        trackUrl: trackingDetails?.tracking_data.track_url,
        activities:
          trackingDetails.tracking_data.shipment_track_activities || [],
      },
    };

    // Send tracking update email if status changed
    if (
      trackingDetails.tracking_data.shipment_track[0].current_status !==
      order.shippingStatus
    ) {
      const emailBody = emailTemplate
        .replace("{{emailTitle}}", "Order Tracking Update")
        .replace("{{greeting}}", `Dear ${order.userDetails.name}`)
        .replace(
          "{{mainMessage}}",
          `Your order status has been updated to: ${formattedTracking.trackingDetails.currentStatus}`
        )
        .replace("{{orderId}}", orderId)
        .replace("{{orderDate}}", order.orderDate.toLocaleDateString())
        .replace("{{status}}", formattedTracking.trackingDetails.currentStatus)
        .replace(
          "{{additionalDetails}}",
          `<tr><th>Tracking Number</th><td>${formattedTracking.trackingDetails.awbCode}</td></tr><tr><th>Courier</th><td>${formattedTracking.trackingDetails.courierName}</td></tr>`
        )
        .replace(
          "{{closingMessage}}",
          "Track your order for the latest updates."
        )
        .replace("{{actionUrl}}", formattedTracking.trackingDetails.trackUrl)
        .replace("{{actionText}}", "Track Order");

      await sendEmail(
        order.userDetails.email,
        "Order Status Updated",
        emailBody
      );

      // Update order status based on tracking
      order.shippingStatus = formattedTracking.trackingDetails.currentStatus;
      if (formattedTracking.trackingDetails.currentStatus === "Delivered") {
        order.orderStatus = "Delivered";
      }
      await order.save();
    }

    return apiResponse(
      res,
      200,
      true,
      "Tracking details retrieved.",
      formattedTracking
    );
  } catch (error) {
    console.error("Error tracking order:", error);
    return apiResponse(res, 500, false, "Error tracking order.");
  }
};

const sendOrderNotification = async (
  order: any,
  type: string,
  additionalData: any = {}
) => {
  let emailBody: string;
  const baseDetails = `
    <tr><th>Order ID</th><td>${order._id}</td></tr>
    <tr><th>Order Date</th><td>${order.orderDate.toLocaleDateString()}</td></tr>
    <tr><th>Total Amount</th><td>₹${order.totalAmount.toFixed(2)}</td></tr>
  `;

  switch (type) {
    case "confirmation":
      emailBody = emailTemplate
        .replace("{{emailTitle}}", "Order Confirmation")
        .replace("{{greeting}}", `Dear ${order.userDetails.name}`)
        .replace(
          "{{mainMessage}}",
          "Thank you for your order! Your order has been confirmed."
        )
        .replace("{{orderId}}", order._id)
        .replace("{{orderDate}}", order.orderDate.toLocaleDateString())
        .replace("{{status}}", order.orderStatus)
        .replace("{{additionalDetails}}", baseDetails)
        .replace(
          "{{closingMessage}}",
          "We’ll notify you when your order ships."
        )
        .replace("{{actionUrl}}", `https://www.gauraaj.com/orders/${order._id}`)
        .replace("{{actionText}}", "View Order");
      break;

    case "shipped":
      emailBody = emailTemplate
        .replace("{{emailTitle}}", "Order Shipped")
        .replace("{{greeting}}", `Dear ${order.userDetails.name}`)
        .replace(
          "{{mainMessage}}",
          `Your order has been shipped via ${additionalData.courier}.`
        )
        .replace("{{orderId}}", order._id)
        .replace("{{orderDate}}", order.orderDate.toLocaleDateString())
        .replace("{{status}}", "Shipped")
        .replace(
          "{{additionalDetails}}",
          `${baseDetails}<tr><th>Tracking Number</th><td>${additionalData.trackingNumber}</td></tr>`
        )
        .replace("{{closingMessage}}", "Track your order for updates.")
        .replace(
          "{{actionUrl}}",
          additionalData.trackUrl ||
            `https://www.gauraaj.com/orders/${order._id}`
        )
        .replace("{{actionText}}", "Track Order");
      break;

    case "delivered":
      emailBody = emailTemplate
        .replace("{{emailTitle}}", "Order Delivered")
        .replace("{{greeting}}", `Dear ${order.userDetails.name}`)
        .replace(
          "{{mainMessage}}",
          "Your order has been successfully delivered!"
        )
        .replace("{{orderId}}", order._id)
        .replace("{{orderDate}}", order.orderDate.toLocaleDateString())
        .replace("{{status}}", "Delivered")
        .replace("{{additionalDetails}}", baseDetails)
        .replace(
          "{{closingMessage}}",
          "We hope you love your purchase! Please share your feedback."
        )
        .replace("{{actionUrl}}", `https://www.gauraaj.com/review/${order._id}`)
        .replace("{{actionText}}", "Write a Review");
      break;

    default:
      return;
  }

  await sendEmail(
    order.userDetails.email,
    emailTemplate.match(/<h1>(.*?)<\/h1>/)?.[1] || "Order Update",
    emailBody
  );
};

// 6. Return Order
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
      return apiResponse(res, 400, false, "Reason and products required.");
    }

    const order = await orderModel.findById(orderId);
    if (!order) {
      return apiResponse(res, 404, false, "Order not found.");
    }
    if (order.user_id.toString() !== userId) {
      return apiResponse(res, 403, false, "Unauthorized access.");
    }
    if (order.orderStatus !== "Delivered") {
      return apiResponse(
        res,
        403,
        false,
        "Only delivered orders can be returned."
      );
    }

    // Validate products
    const invalidProducts: string[] = [];
    for (const item of products) {
      const orderProduct = order.products.find(
        (p: any) =>
          p.productId.toString() === item.productId &&
          p.quantity >= item.quantity
      );
      if (!orderProduct) {
        invalidProducts.push(item.productId);
      }
    }
    if (invalidProducts.length) {
      return apiResponse(
        res,
        400,
        false,
        `Invalid products: ${invalidProducts.join(", ")}`
      );
    }

    // Update stock
    for (const { productId, quantity } of products) {
      const productDetails = await productModel.findById(productId);
      if (productDetails) {
        const variant = productDetails.variants.find((v: any) =>
          v._id.equals(productId)
        );
        if (variant) {
          variant.stock += quantity;
          await productDetails.save();
        }
      }
    }

    // Update order
    order.orderStatus = "Return Requested";
    order.shippingStatus = "Returned";
    order.products = order.products.map((p: any) => {
      const matchingProduct = products.find(
        (prod: any) => prod.productId === p.productId.toString()
      );
      if (matchingProduct) {
        return { ...p, returnRequested: true, reason };
      }
      return p;
    });
    const updatedOrder = await order.save();

    // Update shipping
    const shipping = await ShippingModel.findOne({ orderId });
    if (shipping) {
      shipping.shippingStatus = "Returned";
      await shipping.save();
    }

    // ShipRocket return
    const shipRocketOrderId = order.shipRocketOrderId;
    const details = await getOrderDetailsFromShipRocket(shipRocketOrderId);
    if (!details) {
      return apiResponse(res, 400, false, "Error fetching ShipRocket details.");
    }

    const shipRocketPayload = {
      order_id: order._id,
      order_date: order.orderDate,
      channel_id: details.data.channel_id,
      pickup_customer_name: details.data.customer_name,
      pickup_email: details.data.customer_email,
      pickup_phone: details.data.customer_phone,
      pickup_address: details.data.customer_address,
      pickup_city: details.data.customer_city,
      pickup_state: details.data.customer_state,
      pickup_pincode: details.data.customer_pincode,
      pickup_country: details.data.customer_country,
      shipping_customer_name: details.data.customer_name,
      shipping_email: details.data.customer_email,
      shipping_phone: details.data.customer_phone,
      shipping_address: details.data.customer_address,
      shipping_city: details.data.customer_city,
      shipping_state: details.data.customer_state,
      shipping_pincode: details.data.customer_pincode,
      shipping_country: details.data.customer_country,
      order_items: products.map((p: any) => ({
        name: p.productId,
        sku: p.productId,
        units: p.quantity,
        selling_price: "1200",
      })),
      payment_method: details.data.payment_method,
      sub_total: details.data.total,
      length: details.data.shipments.length,
      breadth: details.data.shipments.breadth,
      height: details.data.shipments.height,
      weight: details.data.shipments.weight,
    };

    const shipRocketResponse = await shipRocketReturnOrder(shipRocketPayload);
    if (!shipRocketResponse) {
      return apiResponse(res, 400, false, "ShipRocket API response error.");
    }

    // Generate return label and schedule pickup
    const token = await getShipRocketToken();
    const returnLabelResponse = await axios.post(
      `${shipRocketConfig.baseUrl}/v1/external/courier/generate/return-label`,
      { order_id: order.shipRocketOrderId },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const returnLabel = returnLabelResponse.data.label_url;

    await axios.post(
      `${shipRocketConfig.baseUrl}/v1/external/courier/schedule-pickup`,
      {
        order_id: order.shipRocketOrderId,
        pickup_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    // Send return confirmation email
    const emailBody = emailTemplate
      .replace("{{emailTitle}}", "Return Request Confirmation")
      .replace("{{greeting}}", `Dear ${order.userDetails.name}`)
      .replace(
        "{{mainMessage}}",
        `Your return request for order ${orderId} has been received. Reason: ${reason}`
      )
      .replace("{{orderId}}", orderId)
      .replace("{{orderDate}}", order.orderDate.toLocaleDateString())
      .replace("{{status}}", "Return Requested")
      .replace(
        "{{additionalDetails}}",
        `<tr><th>Reason</th><td>${reason}</td></tr><tr><th>Return Label</th><td><a href="${returnLabel}">Download</a></td></tr>`
      )
      .replace(
        "{{closingMessage}}",
        "We’ll process your return soon. Track the status in your account."
      )
      .replace("{{actionUrl}}", `https://www.gauraaj.com/orders/${orderId}`)
      .replace("{{actionText}}", "Track Return");

    await sendEmail(order.userDetails.email, "Return Requested", emailBody);

    return apiResponse(res, 200, true, "Return requested successfully.", {
      updatedOrder,
      shipRocketResponse,
      returnLabel,
    });
  } catch (error) {
    console.error("Error processing return:", error);
    return apiResponse(res, 500, false, "Error processing return.");
  }
};

// Updated cancelOrder function
const cancelOrder = async (req: any, res: Response) => {
  try {
    const { orderId } = req.params;
    const userId = req?.user?.id;
    const { reason = "Not specified" } = req.body; // Default reason if undefined

    console.log("Cancelling order:", orderId, "for user:", userId);
    console.log("Cancellation reason:", reason);

    // Validate IDs
    if (
      !mongoose.Types.ObjectId.isValid(orderId) ||
      !mongoose.Types.ObjectId.isValid(userId)
    ) {
      return apiResponse(res, 400, false, "Invalid order or user ID.");
    }

    // Fetch order with populated payment_id
    const order = await orderModel
      .findById(orderId)
      .populate<{ payment_id: Payment }>("payment_id");
    if (!order) {
      return apiResponse(res, 404, false, "Order not found.");
    }

    // Authorization check
    if (order.user_id.toString() !== userId) {
      return apiResponse(res, 403, false, "Unauthorized access.");
    }

    // Check order status
    if (order.orderStatus === "Cancelled") {
      return apiResponse(res, 400, false, "Order already cancelled.");
    }
    if (["Shipped", "Delivered"].includes(order.orderStatus)) {
      return apiResponse(
        res,
        400,
        false,
        "Order shipped. Please request a return."
      );
    }

    // Update order status
    order.orderStatus = "Cancelled";
    order.shippingStatus = "Cancelled";
    await order.save();

    // Update shipping record
    const shipping = await ShippingModel.findOne({ orderId });
    if (shipping) {
      shipping.shippingStatus = "Cancelled";
      await shipping.save();
    }

    // Process refund if payment completed
    if (order.payment_id && order.payment_id.status === "Completed") {
      await initiateRefund(order, reason);
    }

    // Cancel ShipRocket order
    if (order.shipRocketOrderId) {
      await cancelShipRocketOrder(orderId, parseInt(order.shipRocketOrderId));
    }

    // Restore stock
    for (const product of order.products) {
      const productDetails = await productModel.findById(product.productId);
      if (productDetails) {
        const variant = productDetails.variants.find((v: any) =>
          v._id.equals(product.variantId)
        );
        if (variant) {
          variant.stock += product.quantity;
          await productDetails.save();
        }
      }
    }

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
      <tr><th colspan="2">Products</th></tr>
      <tr>
        <td colspan="2">
          <table style="width: 100%; border-collapse: collapse;">
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
          </table>
        </td>
      </tr>`;

    // Send cancellation email to customer
    const customerEmailBody = emailTemplate
      .replace("{{emailTitle}}", "Order Cancellation")
      .replace("{{greeting}}", `Dear ${order.userDetails.name}`)
      .replace(
        "{{mainMessage}}",
        `Your order has been successfully cancelled. Reason: ${reason}`
      )
      .replace("{{orderId}}", orderId)
      .replace("{{orderDate}}", order.orderDate.toLocaleDateString())
      .replace("{{status}}", "Cancelled")
      .replace(
        "{{additionalDetails}}",
        `<tr><th>Reason</th><td>${reason}</td></tr>`
      )
      .replace(
        "{{closingMessage}}",
        "We’re sorry to see you cancel. Contact us if you need assistance."
      )
      .replace("{{actionUrl}}", "https://www.gauraaj.com/user-account/")
      .replace("{{actionText}}", "View Orders");

    await sendEmail(order.userDetails.email, "Order Cancelled", customerEmailBody);

    // Send cancellation email to admin
    try {
      const adminEmailBody = emailTemplate
        .replace("{{emailTitle}}", "Order Cancellation Notification")
        .replace("{{greeting}}", "Dear Shop Owner")
        .replace(
          "{{mainMessage}}",
          `An order has been cancelled by the customer. Please review the details below.`
        )
        .replace("{{orderId}}", orderId)
        .replace("{{orderDate}}", order.orderDate.toLocaleDateString())
        .replace("{{status}}", "Cancelled")
        .replace(
          "{{additionalDetails}}",
          `<tr><th>Customer Name</th><td>${
            order.userDetails?.name || "N/A"
          }</td></tr>
           <tr><th>Customer Phone</th><td><a href="https://wa.me/${
             order.userDetails?.phone || ""
           }">${order.userDetails?.phone || "N/A"}</a></td></tr>
           <tr><th>Cancellation Reason</th><td>${reason}</td></tr>
           ${productTable}`
        )
        .replace(
          "{{closingMessage}}",
          "Please take necessary actions if required. Contact support if you need assistance."
        )
        .replace(
          "{{actionUrl}}",
          `https://gauraaj-admin.vercel.app/admin/orders/${orderId}`
        )
        .replace("{{actionText}}", "View Order in Dashboard");

      await sendEmail("ghccustomercare@gmail.com", "Order Cancelled", adminEmailBody);
    } catch (emailError) {
      console.error("Failed to send admin cancellation email:", {
        error:
          emailError instanceof Error ? emailError.message : "Unknown error",
        stack: emailError instanceof Error ? emailError.stack : "Unknown stack",
        orderId,
      });
    }

    return apiResponse(res, 200, true, "Order cancelled successfully.");
  } catch (error: any) {
    console.error("Error cancelling order:", {
      error: error.message,
      stack: error.stack,
    });
    return apiResponse(res, 500, false, "Error cancelling order.");
  }
};

// Updated initiateRefund function
const initiateRefund = async (order: Order, reason: string): Promise<void> => {
  try {
    const payment = order.payment_id as unknown as Payment;
    if (!payment || !payment.transactionId) {
      throw new Error("Payment details not found for this order.");
    }

    if (payment.paymentMethod === "Razorpay") {
      try {
        const refund = await razorpay.payments.refund(payment.transactionId, {
          amount: Math.round(order.totalAmount * 100), // Convert to paise
          notes: { reason: reason || "Order cancellation" },
        });

        await PaymentModel.findByIdAndUpdate(payment._id, {
          status: "Refunded",
          refundDetails: {
            refundId: refund.id,
            amount: order.totalAmount,
            reason: reason || "Order cancellation",
            refundedAt: new Date(),
          },
        });
      } catch (razorpayError: any) {
        console.error("Razorpay refund failed:", {
          transactionId: payment.transactionId,
          error: razorpayError.message || "Unknown error",
          details: razorpayError,
        });
        throw new Error(
          `Razorpay refund failed: ${razorpayError.message || "Unknown error"}`
        );
      }
    } else if (payment.paymentMethod === "COD") {
      await PaymentModel.findByIdAndUpdate(payment._id, {
        status: "Refunded",
        refundDetails: {
          amount: order.totalAmount,
          reason: reason || "Order cancellation",
          refundedAt: new Date(),
        },
      });
    } else {
      throw new Error(`Unsupported payment method: ${payment.paymentMethod}`);
    }
  } catch (error: any) {
    console.error("Refund initiation failed:", {
      orderId: order._id,
      error: error.message,
    });
    throw error;
  }
};

// 8. Post-Order Actions
const postOrderActions = async (req: any, res: Response) => {
  try {
    const { orderId } = req.params;
    const userId = req?.user?.id;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return apiResponse(res, 400, false, "Invalid order ID.");
    }
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return apiResponse(res, 400, false, "Invalid user ID.");
    }

    const order = await orderModel.findById(orderId).populate("user_id");
    if (!order) {
      return apiResponse(res, 404, false, "Order not found.");
    }
    if (order.user_id._id.toString() !== userId) {
      return apiResponse(res, 403, false, "Unauthorized access.");
    }
    if (order.orderStatus !== "Delivered") {
      return apiResponse(res, 400, false, "Order not delivered yet.");
    }

    // Send delivery confirmation
    await sendDeliveryConfirmation(order);

    // Request product review
    await requestProductReview(order);

    // Offer re-purchase suggestions
    const suggestions = await getProductSuggestions(order);

    return apiResponse(res, 200, true, "Post-order actions completed.", {
      suggestions,
    });
  } catch (error) {
    console.error("Error in post-order actions:", error);
    return apiResponse(res, 500, false, "Error in post-order actions.");
  }
};

const sendDeliveryConfirmation = async (order: any) => {
  const user = order.user_id;
  const emailContent = `
    Dear ${user.first_name},
    Your order ${order._id} was successfully delivered.
    We hope you love your purchase!
  `;
  await sendEmail(user.email, "Order Delivered", emailContent);
};

const requestProductReview = async (order: any) => {
  const user = order.user_id;
  const emailContent = `
    Dear ${user.first_name},
    Please share your feedback for order ${order._id}.
    Your review helps us improve!
    [Review Link]
  `;
  await sendEmail(user.email, "We Value Your Feedback", emailContent);
};

const getProductSuggestions = async (order: any) => {
  const productIds = order.products.map((p: any) => p.productId);
  const relatedProducts = await productModel
    .find({
      _id: { $nin: productIds },
      category_id: order.products[0].productId.category_id,
    })
    .limit(5);
  return relatedProducts;
};

// Admin: Shipping Performance Analytics
const getShippingAnalytics = async (req: any, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const orders = await orderModel
      .find({
        orderDate: { $gte: new Date(startDate), $lte: new Date(endDate) },
        orderStatus: { $in: ["Shipped", "Delivered"] },
      })
      .populate("shippingAddressId");

    const analytics: any = {
      totalOrders: orders.length,
      delayedOrders: 0,
      courierPerformance: {},
    };

    for (const order of orders) {
      const shipping = await ShippingModel.findOne({ orderId: order._id });
      if (shipping && shipping.deliveredAt) {
        const deliveryTime =
          (shipping.deliveredAt.getTime() - shipping.shippedAt.getTime()) /
          (1000 * 60 * 60 * 24);
        if (deliveryTime > shipping.estimatedDeliveryDate) {
          analytics.delayedOrders++;
        }

        const courier = shipping.courierService || "Unknown";
        analytics.courierPerformance[courier] = analytics.courierPerformance[
          courier
        ] || { total: 0, delays: 0 };
        analytics.courierPerformance[courier].total++;
        if (deliveryTime > shipping.estimatedDeliveryDate) {
          analytics.courierPerformance[courier].delays++;
        }
      }
    }

    return apiResponse(
      res,
      200,
      true,
      "Shipping analytics retrieved.",
      analytics
    );
  } catch (error) {
    console.error("Error in shipping analytics:", error);
    return apiResponse(res, 500, false, "Error retrieving shipping analytics.");
  }
};

// Helper for ShipRocket Token
const getShipRocketToken = async (): Promise<string> => {
  if (shipRocketConfig.token) return shipRocketConfig.token;

  try {
    const response = await axios.post<{ token: string }>(
      `${shipRocketConfig.baseUrl}/v1/external/auth/login`,
      {
        email: shipRocketConfig.email,
        password: shipRocketConfig.password,
      },
      { headers: { "Content-Type": "application/json" } }
    );

    shipRocketConfig.token = response.data.token;
    return shipRocketConfig.token;
  } catch (error: any) {
    console.error(
      "Error authenticating with ShipRocket:",
      error.response?.data || error.message
    );
    throw new Error("Failed to authenticate with ShipRocket.");
  }
};

// Get Order by ID
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
      })
      .populate("payment_id");

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

// Exchange Order
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

export {
  addProductToCart,
  calculateShippingCharges,
  cancelOrder,
  createOrder,
  exchangeOrder,
  getOrderById,
  getShippingAnalytics,
  postOrderActions,
  returnOrder,
  sendOrderNotification,
  shipOrder,
  trackOrder
};

