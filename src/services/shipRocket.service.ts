import axios from "axios";
import mongoose from "mongoose";
import { sendMessageToKafka } from "../config/kafkaConfig";
import shipRocketConfig from "../config/shipRocketConfig";
import orderModel from "../models/Order.model";
import productModel from "../models/Product.model";

// interface ShipRocketOrderRequest {
//   orderId: string;
//   products: {
//     productId: string;
//     quantity: number;
//     selling_price?: number;
//     name?: string;
//     sku?: string;
//     discount?: number;
//     tax?: number;
//   }[];
//   addressSnapshot: {
//     addressLine1: string;
//     city: string;
//     state?: string;
//     country?: string;
//     postalCode: string;
//   };
//   dimensions: {
//     length?: number;
//     width?: number;
//     height?: number;
//     weight?: number;
//   };
// }

interface ShipRocketOrderRequest {
  orderId: string;
  products: {
    productId: string;
    quantity: number;
    selling_price?: number;
    name?: string;
    sku?: string;
    discount?: number;
    tax?: number;
    dimensions: {
      length: number;
      width: number;
      height: number;
      weight: number;
    };
  }[];
  addressSnapshot: {
    addressLine1: string;
    city: string;
    state?: string;
    country?: string;
    postalCode: string;
  };
}

interface ReturnItem {
  item_id: string; // The item ID to be returned
  return_quantity: number; // Quantity to be returned
  reason?: string; // Optional reason for the return
}

interface ReturnData {
  items: ReturnItem[]; // Array of items to be returned
}

let shipRocketToken: string | null = null;

// Helper function to validate ObjectId
const isValidObjectId = (id: string) => mongoose.Types.ObjectId.isValid(id);

export const getShipRocketToken = async (): Promise<string> => {
  if (shipRocketToken) return shipRocketToken;

  try {
    const response = await axios.post<{ token: string }>(
      `${shipRocketConfig.baseUrl}/v1/external/auth/login`,
      {
        email: shipRocketConfig.email,
        password: shipRocketConfig.password,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    shipRocketToken = response.data.token;
    return shipRocketToken;
  } catch (error: any) {
    console.error(
      "Error authenticating with ShipRocket:",
      error.response?.data || error.message
    );
    throw new Error("Failed to authenticate with ShipRocket.");
  }
};

const createShipRocketOrder = async (
  orderData: ShipRocketOrderRequest
): Promise<any> => {
  try {
    const { orderId, products, addressSnapshot } = orderData;

    console.log("Creating order for", orderId);

    if (!orderId || !products || !addressSnapshot) {
      throw new Error("Required fields are missing in the request.");
    }

    if (!isValidObjectId(orderId)) {
      throw new Error(`Invalid order ID: ${orderId}`);
    }

    const order = await orderModel
      .findById(new mongoose.Types.ObjectId(orderId)) // Instantiate ObjectId with 'new'
      .populate("user_id", "first_name last_name email phone");

    if (!order) {
      throw new Error(`Order with ID ${orderId} not found.`);
    }

    if (!Array.isArray(products) || products.length === 0) {
      throw new Error("No valid products provided for the order.");
    }

    // Initialize total order dimensions and subtotal
    let totalDimensions = { length: 0, width: 0, height: 0, weight: 0 };
    let sub_total = 0;

    // Loop through products to ensure correct price formatting and dimension handling
    const updatedProducts = await Promise.all(
      products.map(async (product) => {
        const productDetails = await productModel.findById(product.productId);
        if (!productDetails) {
          throw new Error(`Product with ID ${product.productId} not found.`);
        }

        // Ensure the selling price is an integer (but we will not round it off)
        const sellingPrice = parseFloat(
          product.selling_price?.toString() || "0"
        );

        // Extract product dimensions and weight
        const productDimensions = productDetails.dimensions || {};
        totalDimensions.length += productDimensions.length || 0;
        totalDimensions.width += productDimensions.width || 0;
        totalDimensions.height += productDimensions.height || 0;
        totalDimensions.weight +=
          (productDetails.weight || 0) * product.quantity;

        sub_total += product.quantity * sellingPrice;

        return {
          productId: product.productId.toString(),
          quantity: product.quantity,
          selling_price: sellingPrice, // Ensure this is kept as it is, no rounding
          name: productDetails.name,
          sku: productDetails.sku,
          discount: product.discount || 0,
          tax: product.tax || 0,
          dimensions: productDimensions, // Ensure dimensions are included here
        };
      })
    );

    // Pass the sub_total as is, without rounding
    // Prepare the request body for the ShipRocket API
    const requestBody = {
      order_id: order._id.toString(),
      order_date: new Date().toISOString(),
      payment_method: "Prepaid",
      sub_total,
      shipping_is_billing: true,
      billing_customer_name: order.user_id.first_name,
      billing_last_name: order.user_id.last_name || "",
      billing_address: addressSnapshot.addressLine1,
      billing_city: addressSnapshot.city,
      billing_state: addressSnapshot.state || "Jodhpur",
      billing_country: addressSnapshot.country || "India",
      billing_phone: order.user_id.phone || "1234567890",
      billing_pincode: addressSnapshot.postalCode,
      order_items: updatedProducts.map((product) => ({
        name: product.name || "Default Product Name",
        sku: product.sku || "DEFAULT-SKU",
        units: product.quantity,
        selling_price: product.selling_price || 0,
        discount: product.discount || 0,
        tax: product.tax || 0,
      })),
      length: totalDimensions.length || 10,
      breadth: totalDimensions.width || 5,
      height: totalDimensions.height || 8,
      weight: totalDimensions.weight || 2,
    };

    // Get ShipRocket Token and send the request to ShipRocket API
    const token = await getShipRocketToken();

    const response = await axios.post(
      `${shipRocketConfig.baseUrl}/v1/external/orders/create/adhoc`,
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Publish Event to Kafka (Order Created)
    await sendMessageToKafka("shiprocket.orders", {
      event: "order_created",
      orderId: orderId,
      response: response.data,
    });

    return response.data;
  } catch (error: any) {
    console.error(
      "Error creating order in ShipRocket:",
      error.response?.data || error.message
    );

    // Publish Event to Kafka (Order Creation Failed)
    await sendMessageToKafka("shiprocket.orders", {
      event: "order_creation_failed",
      orderId: orderData.orderId,
      error: error.message,
    });

    throw new Error("Failed to create order in ShipRocket.");
  }
};

const cancelShipRocketOrder = async (
  orderId: string,
  shipRocketOrderId: number
): Promise<any> => {
  try {
    const token = await getShipRocketToken();
    if (!token) {
      throw new Error("Failed to retrieve authorization token.");
    }

    const payload = {
      ids: [shipRocketOrderId], // ShipRocket expects an array of order IDs
    };

    console.log("Payload sent to ShipRocket API:", payload);

    const response = await axios.post(
      `https://apiv2.shiprocket.in/v1/external/orders/cancel`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("ShipRocket Response:", response.data);

    // Send success message to Kafka
    await sendMessageToKafka("shiprocket.orders", {
      event: "order_canceled",
      orderId: orderId,
      response: response.data,
    });

    return response.data;
  } catch (error: any) {
    console.error("Error canceling order in ShipRocket:", error);

    // Send failure message to Kafka
    await sendMessageToKafka("shiprocket.orders", {
      event: "order_cancellation_failed",
      orderId: orderId,
      error: error.message || "An unknown error occurred.",
    });

    throw new Error(
      `Failed to cancel order in ShipRocket: ${
        error.message || "Unknown error"
      }`
    );
  }
};

// Service function to return an order in ShipRocket
const returnShipRocketOrder = async (
  orderId: string,
  returnData: ReturnData
): Promise<any> => {
  try {
    // Fetch the ShipRocket Token
    const token = await getShipRocketToken();
    if (!token) {
      throw new Error("Failed to retrieve authorization token.");
    }

    // Prepare the payload for the return request
    const payload = {
      order_id: orderId,
      return_items: returnData.items.map((item: any) => ({
        item_id: item.item_id,
        return_quantity: item.return_quantity,
        reason: item.reason || "No reason provided",
      })),
    };

    console.log("Payload sent to ShipRocket API for return:", payload);

    // Send the return request to ShipRocket API
    const response = await axios.post(
      `https://apiv2.shiprocket.in/v1/external/orders/return`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("ShipRocket Return Response:", response.data);

    // Send message to Kafka (return success)
    await sendMessageToKafka("shiprocket.orders", {
      event: "order_returned",
      orderId: orderId,
      response: response.data,
    });

    return response.data;
  } catch (error: any) {
    console.error("Error returning order in ShipRocket:", error);

    // Send failure message to Kafka
    await sendMessageToKafka("shiprocket.orders", {
      event: "order_return_failed",
      orderId: orderId,
      error: error.message || "An unknown error occurred.",
    });

    throw new Error(
      `Failed to return order in ShipRocket: ${
        error.message || "Unknown error"
      }`
    );
  }
};

const shipRocketTrackOrder = async (shipmentId: number): Promise<any> => {
  try {
    // Get the token from shipRocket
    const token = await getShipRocketToken();

    if (!token) {
      throw new Error("Failed to recive authorization token");
    }

    const response = await axios.get(
      `${shipRocketConfig.baseUrl}/v1/external/courier/track/shipment/${shipmentId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Error Tracking shipment in ShipRocket", error);
    throw new Error(`Failed to track shipment: ${error}`);
  }
};

export const getOrderDetailsFromShipRocket = async (
  shipRocketOrderId: number
): Promise<any | null> => {
  try {
    const url = `https://apiv2.shiprocket.in/v1/external/orders/show/${shipRocketOrderId}`;
    const token = await getShipRocketToken();

    // Make the GET request to ShipRocket API
    const response = await axios.get(url, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    // Check if the response contains order details
    if (response?.data) {
      return response.data;
    }

    // Return null if no order details are found
    return null;
  } catch (error: any) {
    console.error(
      "Error fetching order details from ShipRocket:",
      error?.message || error
    );
    return null;
  }
};

const shipRocketReturnOrder = async (payload: any) => {
  try {
    const token = await getShipRocketToken();
    if (!token) {
      throw new Error("No ShipRocket token found");
    }

    const response = await axios.post(
      "https://apiv2.shiprocket.in/v1/external/orders/create/return",
      payload,
      {
        headers: {
          "content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("ShipRocket: Unable to return order", error);
    throw new Error("Failed to create return order on shipRocket");
  }
};

export {
  cancelShipRocketOrder, createShipRocketOrder, returnShipRocketOrder, shipRocketReturnOrder, shipRocketTrackOrder
};

