import { Request, Response, NextFunction } from "express";
import {
  createShipRocketOrder,
  cancelShipRocketOrder,
  returnShipRocketOrder,
} from "../services/shipRocket.service";
import apiResponse from "../utils/ApiResponse";
import orderModel from "../models/Order.model";

// Create order
export const createOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const orderData = req.body;

    // Validate the required fields
    if (
      !orderData.shippingAddressId ||
      !orderData.user_id ||
      !orderData.totalAmount
    ) {
      throw new Error(
        "Missing required fields: shippingAddressId, totalAmount, or user_id."
      );
    }

    // Ensure the totalAmount is calculated or provided
    if (!orderData.totalAmount) {
      const sub_total = orderData.products.reduce(
        (total: any, product: any) =>
          total + product.quantity * (product.selling_price || 0),
        0
      );
      orderData.totalAmount = sub_total; // Calculate totalAmount if not present
    }

    // Create the ShipRocket order (calls external API)
    const result = await createShipRocketOrder(orderData);

    // Create a new order document with the validated fields
    const order = new orderModel({
      ...orderData,
      orderStatus: "Pending",
      totalAmount: orderData.totalAmount, // Ensure totalAmount is set
      user_id: orderData.user_id, // Ensure user_id is set
      shippingAddressId: orderData.shippingAddressId, // Ensure shippingAddressId is set
    });

    // Save the order to the database
    await order.save();

    // Return the response from ShipRocket
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// export const cancelOrder = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   try {
//     const { orderId } = req.body;

//     // Check if orderId is provided
//     if (!orderId) {
//       return apiResponse(res, 400, false, "Order ID is required");
//     }

//     // Cancel the order via ShipRocket
//     const result = await cancelShipRocketOrder(orderId,);

//     return apiResponse(res, 200, true, "Order cancelled successfully", result);
//   } catch (error: any) {
//     console.error("Error while canceling order:", error);
//     return apiResponse(res, 500, false, "Error while canceling order");
//   }
// };

export const returnOrderController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { orderId, returnData } = req.body;

  if (!orderId || !returnData || !Array.isArray(returnData.items)) {
    res.status(400).json({
      message: "Invalid request data. Order ID and return items are required.",
    });
    return;
  }

  try {
    // Call the service to process the order return
    const response = await returnShipRocketOrder(orderId, returnData);

    // Return the response from ShipRocket
    res.status(200).json(response);
  } catch (error) {
    console.error("Error processing return request:", error);
    res.status(500).json({ message: "Failed to process order return." });
  }
};
