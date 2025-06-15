import axios from "axios";
import mongoose from "mongoose";
import { sendMessageToKafka } from "../config/kafkaConfig";
import shipRocketConfig from "../config/shipRocketConfig";
import productModel from "../models/Product.model";

interface ShipRocketOrderRequest {
  orderId: string;
  products: {
    productId: string;
    variantId: string;
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
    skuParameters?: Record<string, any>;
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

// Create Shiprocket order

const createShipRocketOrder = async (data: {
  orderId: string;
  products: any[];
  addressSnapshot: any;
  totalAmount: number;
  paymentMethod: number;
  courierName: string;
}) => {
  try {
    console.log("products", data.products);

    // Validate required fields
    if (!data.products?.length) {
      throw new Error("No products provided for Shiprocket order");
    }
    if (!data.addressSnapshot?.postalCode?.match(/^\d{6}$/)) {
      throw new Error("Invalid billing pincode");
    }
    if (
      data.addressSnapshot?.phone &&
      !data.addressSnapshot.phone.match(/^\+?\d{10,12}$/)
    ) {
      console.warn(
        "Invalid billing phone number, using fallback:",
        data.addressSnapshot.phone
      );
      data.addressSnapshot.phone = "9876543210"; // Fallback for testing
    }
    if (!data.courierName) {
      throw new Error("Courier name is required for Shiprocket order");
    }

    const token = await getShipRocketToken();

    // Fetch SKUs for products if missing in skuParameters
    const orderItems = await Promise.all(
      data.products.map(async (item) => {
        let sku = item.skuParameters?.sku;
        if (!sku) {
          // Fetch product to get SKU
          const product = await productModel.findById(item.productId);
          if (product) {
            const variant = product.variants.find(
              (v: any) => v._id.toString() === item.variantId
            );
            sku = variant?.sku || item.productId.toString(); // Fallback to productId if variant SKU is missing
          } else {
            sku = item.productId.toString(); // Fallback if product not found
          }
        }

        if (!item.name || !item.quantity || !item.price) {
          throw new Error(`Invalid product data: ${JSON.stringify(item)}`);
        }

        return {
          name: item.name,
          sku,
          units: parseInt(item.quantity.toString(), 10),
          selling_price: parseFloat(item.price.toString()),
          discount: parseFloat(item.discount?.toString() || "0"),
          tax: parseFloat(item.tax?.toString() || "0"),
          hsn: item.hsn || "",
        };
      })
    );

    const payload = {
      order_id: data.orderId,
      order_date: new Date().toISOString(),
      pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION || "Primary",
      channel_id: "",
      comment: "Order from Gauraaj",
      billing_customer_name:
        data.addressSnapshot.name?.split(" ")[0] || "Customer",
      billing_last_name:
        data.addressSnapshot.name?.split(" ").slice(1).join(" ") || "",
      billing_address: data.addressSnapshot.addressLine1,
      billing_address_2: data.addressSnapshot.addressLine2 || "",
      billing_city: data.addressSnapshot.city,
      billing_pincode: data.addressSnapshot.postalCode,
      billing_state: data.addressSnapshot.state,
      billing_country: data.addressSnapshot.country || "India",
      billing_email: data.addressSnapshot.email || "customer@example.com",
      billing_phone: data.addressSnapshot.phone || "9876543210",
      shipping_is_billing: true,
      order_items: orderItems,
      payment_method: data.paymentMethod === 1 ? "COD" : "Prepaid",
      shipping_charges: 0,
      giftwrap_charges: 0,
      transaction_charges: 0,
      total_discount: data.products.reduce(
        (sum, item) =>
          sum + parseFloat(item.discount?.toString() || "0") * item.quantity,
        0
      ),
      sub_total: parseFloat(data.totalAmount.toString()),
      weight: data.products.reduce(
        (total, item) =>
          total +
          (parseFloat(item.skuParameters?.weight?.toString()) || 0.5) *
            item.quantity,
        0
      ),
      length: data.products.reduce(
        (max, item) =>
          Math.max(
            max,
            parseFloat(item.skuParameters?.length?.toString()) || 10
          ),
        0
      ),
      breadth: data.products.reduce(
        (max, item) =>
          Math.max(
            max,
            parseFloat(item.skuParameters?.breadth?.toString()) || 10
          ),
        0
      ),
      height: data.products.reduce(
        (max, item) =>
          Math.max(
            max,
            parseFloat(item.skuParameters?.height?.toString()) || 10
          ),
        0
      ),
      courier_name: data.courierName.toLowerCase(),
    };

    console.debug(
      "Shiprocket create order payload:",
      JSON.stringify(payload, null, 2)
    );

    const response = await axios.post(
      `${shipRocketConfig.baseUrl}/v1/external/orders/create/adhoc`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error: any) {
    const errorDetails = error
      ? {
          status: error.response?.status,
          message: error.response?.data?.message || error.message,
          errors: error.response?.data?.errors || [],
          requestPayload: error.config?.data,
        }
      : {
          message: error.message,
          stack: error.stack,
        };
    console.error("Shiprocket order creation failed:", errorDetails);
    throw new Error(`Shiprocket error: ${errorDetails.message}`);
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
  cancelShipRocketOrder,
  createShipRocketOrder,
  returnShipRocketOrder,
  shipRocketReturnOrder,
  shipRocketTrackOrder
};

