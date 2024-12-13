import orderModel from "../models/Order.model";
import { Request, Response } from "express";
import apiResponse from "../utils/ApiResponse";
import productModel from "../models/Product.model";
import PaymentModel from "../models/Payment.model";
import mongoose from "mongoose";
import ShippingModel from "../models/Shipping.model";
import { addProductBySupplier } from "./supplierProduct.controller";
import {
  createShipRocketOrder,
  cancelShipRocketOrder,
} from "../services/shipRocket.service";
import { sendMessageToKafka } from "../config/kafkaConfig";

// const createOrder = async (req: Request, res: Response) => {
//   try {
//     const { userId, products, shippingAddressId, payment_id } = req.body;

//     // Validate input fields
//     if (!userId || !products || !shippingAddressId || !payment_id) {
//       return apiResponse(res, 400, false, "All fields are required.");
//     }

//     // Check if the userId, shippingAddressId, and payment_id are valid ObjectIds
//     if (!mongoose.Types.ObjectId.isValid(userId)) {
//       return apiResponse(res, 400, false, "Invalid userId format.");
//     }

//     if (!mongoose.Types.ObjectId.isValid(shippingAddressId)) {
//       return apiResponse(res, 400, false, "Invalid shippingAddressId format.");
//     }

//     if (!mongoose.Types.ObjectId.isValid(payment_id)) {
//       return apiResponse(res, 400, false, "Invalid payment_id format.");
//     }

//     // Log the values to verify their correctness
//     console.log("userId:", userId);
//     console.log("shippingAddressId:", shippingAddressId);
//     console.log("payment_id:", payment_id);

//     if (!Array.isArray(products) || products.length === 0) {
//       return apiResponse(res, 400, false, "At least one product is required.");
//     }

//     let totalAmount = 0;

//     for (const item of products) {
//       const { productId, quantity } = item;

//       // Validate product and quantity
//       if (!productId || !quantity || quantity <= 0) {
//         return apiResponse(res, 400, false, "Invalid product or quantity.");
//       }

//       // Fetch the product details
//       const productDetails = await productModel.findById(productId);

//       if (!productDetails) {
//         return apiResponse(
//           res,
//           404,
//           false,
//           `Product with ID ${productId} not found.`
//         );
//       }

//       if (productDetails.stock < quantity) {
//         return apiResponse(
//           res,
//           400,
//           false,
//           `Insufficient stock for product "${productDetails.name}". Available stock: ${productDetails.stock}.`
//         );
//       }

//       // Reduce the stock of the product
//       productDetails.stock -= quantity;
//       await productDetails.save();

//       // Calculate the total price
//       totalAmount += parseFloat(productDetails.price.toString()) * quantity;
//     }

//     // Create the order
//     const order = new orderModel({
//       user_id: new mongoose.Types.ObjectId(userId),
//       orderDate: new Date(),
//       totalAmount,
//       orderStatus: "Pending",
//       products: products.map((item: any) => ({
//         productId: new mongoose.Types.ObjectId(item.productId),
//         quantity: item.quantity,
//       })),
//       shippingAddressId: new mongoose.Types.ObjectId(shippingAddressId),
//       payment_id: new mongoose.Types.ObjectId(payment_id),
//     });

//     // Save the order
//     const savedOrder = await order.save();

//     // Create the shipping record
//     const shipping = new ShippingModel({
//       userId: new mongoose.Types.ObjectId(userId),
//       orderId: savedOrder._id,
//       profileId: new mongoose.Types.ObjectId(shippingAddressId),
//       addressSnapshot: req.body.addressSnapshot,
//       shippingStatus: "Pending",
//       estimatedDeliveryDate: new Date(
//         new Date().setDate(new Date().getDate() + 7)
//       ),
//     });

//     // Save the shipping record
//     const savedShipping = await shipping.save();

//     return apiResponse(res, 201, true, "Order placed successfully.", {
//       order: savedOrder,
//       shipping: savedShipping,
//     });
//   } catch (error) {
//     console.error("Error while placing order:", error);
//     return apiResponse(res, 500, false, "Error while placing order.");
//   }
// };

const createOrder = async (req: Request, res: Response) => {
  try {
    const { userId, products, shippingAddressId, payment_id, addressSnapshot } =
      req.body;

    if (
      !userId ||
      !products ||
      !shippingAddressId ||
      !payment_id ||
      !addressSnapshot
    ) {
      return apiResponse(res, 400, false, "All fields are Required");
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return apiResponse(res, 400, false, "Invalid User ID");
    }

    if (!mongoose.Types.ObjectId.isValid(shippingAddressId)) {
      return apiResponse(res, 400, false, "Invalid Shipping Address ID");
    }

    if (!Array.isArray(products) || products.length === 0) {
      return apiResponse(res, 400, false, "Products are empty");
    }

    let totalAmount = 0;
    const updatedProducts = [];

    for (const item of products) {
      const { productId, quantity } = item;

      if (!productId || !quantity) {
        return apiResponse(res, 400, false, "Invalid product or quantity.");
      }

      const productDetails = await productModel.findById(productId);
      if (!productDetails) {
        return apiResponse(res, 404, false, "Product not found");
      }

      if (productDetails.stock < quantity) {
        return apiResponse(
          res,
          400,
          false,
          `Insufficient stock for product "${productDetails.name}". Available stock: ${productDetails.stock}.`
        );
      }

      productDetails.stock -= quantity;
      await productDetails.save();

      // Calculate price with discount and tax
      const discountAmount =
        (productDetails.price * (item.discount || 0)) / 100;
      const priceAfterDiscount = productDetails.price - discountAmount;
      const taxAmount = (priceAfterDiscount * (item.tax || 0)) / 100;
      const finalPricePerProduct = priceAfterDiscount + taxAmount;

      // Add the total for this product without rounding it off
      totalAmount += finalPricePerProduct * quantity;

      // Include product dimensions (length, width, height, weight) to the updated products
      updatedProducts.push({
        productId: productId.toString(), // Convert ObjectId to string
        quantity,
        selling_price: productDetails.price,
        name: productDetails.name,
        sku: productDetails.sku,
        discount: item.discount || 0,
        tax: item.tax || 0,
        dimensions: productDetails.dimensions, // Ensure dimensions are included here
      });
    }

    // Create the Order
    const newOrder = new orderModel({
      user_id: new mongoose.Types.ObjectId(userId),
      orderDate: new Date(),
      totalAmount, // No rounding here
      orderStatus: "Pending",
      products: updatedProducts,
      shippingAddressId: new mongoose.Types.ObjectId(shippingAddressId),
      payment_id: new mongoose.Types.ObjectId(payment_id),
    });

    const savedOrder = await newOrder.save();

    // Create ShipRocket Order using extracted dimensions
    const response = await createShipRocketOrder({
      orderId: savedOrder._id.toString(), // Convert ObjectId to string
      products: updatedProducts,
      addressSnapshot,
    });

    savedOrder.shipRocketOrderId = response.order_id;
    await savedOrder.save();

    const shippingRecord = new ShippingModel({
      userId: new mongoose.Types.ObjectId(userId),
      orderId: savedOrder._id,
      profileId: new mongoose.Types.ObjectId(shippingAddressId),
      addressSnapshot,
      shippingStatus: "Pending",
      estimatedDeliveryDate: new Date(
        new Date().setDate(new Date().getDate() + 7) // Default delivery estimate: +7 days
      ),
    });

    const savedShipping = await shippingRecord.save();

    return apiResponse(res, 200, true, "Order placed successfully", {
      order: savedOrder,
      shipping: savedShipping,
      shipRocket: response,
    });
  } catch (error) {
    console.error("Error while placing order", error);
    return apiResponse(res, 500, false, "Error while placing order");
  }
};

const getOrderById = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { userId } = req.body;

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

// Cancelled the Order
// const cancelOrder = async (req: Request, res: Response) => {
//   try {
//     const { orderId } = req.params;
//     const { userId } = req.body;

//     if (!mongoose.Types.ObjectId.isValid(orderId)) {
//       return apiResponse(res, 400, false, "Invalid order ID.");
//     }

//     if (!mongoose.Types.ObjectId.isValid(userId)) {
//       return apiResponse(res, 400, false, "Invalid user ID.");
//     }

//     // Fetch the order to cancel
//     const order = await orderModel.findById(orderId);
//     if (!order) {
//       return apiResponse(res, 404, false, "Order not found.");
//     }

//     // The order to cancel should belong to the user
//     if (order.user_id.toString() !== userId) {
//       return apiResponse(
//         res,
//         400,
//         false,
//         "Access Denied: order not belonging to the userId"
//       );
//     }

//     if (order.orderStatus === "Cancelled") {
//       return apiResponse(res, 400, false, "Order is already cancelled.");
//     }

//     // Update order status to "Cancelled"
//     order.orderStatus = "Cancelled";
//     const cancelledOrder = await order.save();

//     // Update the shipping status to "Cancelled"
//     const shipping = await ShippingModel.findOne({ orderId: orderId });

//     if (shipping) {
//       shipping.shippingStatus = "Cancelled";
//       await shipping.save();
//     } else {
//       console.log("No shipping record found for this order.");
//     }

//     return apiResponse(
//       res,
//       200,
//       true,
//       "Order Cancelled Successfully, and shipping status updated.",
//       cancelledOrder
//     );
//   } catch (error) {
//     console.error("Error while updating order status", error);
//     return apiResponse(res, 500, false, "Error while updating order status");
//   }
// };

const cancelOrder = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { userId } = req.body;

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

const returnOrder = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const {
      userId,
      reason,
      products,
    }: {
      userId: string;
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

    const order = await orderModel.findById(orderId);
    if (!order) {
      return apiResponse(res, 404, false, "Order not found.");
    }

    // Ensure order belongs to the user_id
    if (order.user_id.toString() !== userId) {
      return apiResponse(
        res,
        403,
        false,
        "Access Denied: Order does not belong to user."
      );
    }

    // Order status should not be cancelled
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

    // Validate products in the request
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

    // Process the return
    for (const { productId, quantity } of products) {
      const productDetails = await productModel.findById(productId);
      if (!productDetails) {
        continue; // Skip if the product is not found
      }

      // Update the stock for returned products
      productDetails.stock += quantity;
      await productDetails.save();
    }

    // Update the order status and products
    order.orderStatus = "Return Requested";
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

    // Update the shipping status to "Returned"
    const shipping = await ShippingModel.findOne({ orderId: orderId });

    if (shipping) {
      shipping.shippingStatus = "Returned";
      await shipping.save();
    } else {
      console.log("No shipping record found for this order.");
    }

    return apiResponse(
      res,
      200,
      true,
      "Order return requested successfully, and shipping status updated.",
      updatedOrder
    );
  } catch (error) {
    console.error("Error while processing return request", error);
    return apiResponse(
      res,
      500,
      false,
      "Error while processing return request."
    );
  }
};

const exchangeOrder = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const {
      userId,
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

export { createOrder, getOrderById, cancelOrder, returnOrder, exchangeOrder };
