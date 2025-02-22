import axios from "axios";
import mongoose from "mongoose";
import { sendMessageToKafka } from "../config/kafkaConfig";
import shipRocketConfig from "../config/shipRocketConfig";
import orderModel from "../models/Order.model";
import productModel from "../models/Product.model";

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
  }[];
  addressSnapshot: {
    addressLine1: string;
    city: string;
    state?: string;
    country?: string;
    postalCode: string;
  };
}

let shipRocketToken: string | null = null;

const getShipRocketToken = async (): Promise<string> => {
  if (shipRocketToken) return shipRocketToken;

  try {
    const response = await axios.post<{ token: string }>(
      `${shipRocketConfig.baseUrl}/v1/external/auth/login`,
      {
        email: shipRocketConfig.email,
        password: shipRocketConfig.password,
      },
      { headers: { "Content-Type": "application/json" } }
    );
    shipRocketToken = response.data.token;
    return shipRocketToken;
  } catch (error: any) {
    console.error("ShipRocket authentication failed:", error.response?.data || error.message);
    throw new Error("Failed to authenticate with ShipRocket.");
  }
};

const createShipRocketOrder = async (orderData: ShipRocketOrderRequest): Promise<any> => {
  try {
    const { orderId, products, addressSnapshot } = orderData;

    if (!mongoose.Types.ObjectId.isValid(orderId) || !products?.length || !addressSnapshot?.addressLine1) {
      throw new Error("Invalid or missing order data.");
    }

    const order = await orderModel
      .findById(orderId)
      .populate("user_id", "first_name last_name email phone");
    if (!order) throw new Error("Order not found.");

    const updatedProducts = await Promise.all(
      products.map(async (product) => {
        const productDetails = await productModel.findById(product.productId);
        if (!productDetails) throw new Error(`Product ${product.productId} not found.`);

        const sellingPrice = parseFloat(product.selling_price?.toString() || "0");
        return {
          name: productDetails.name || "Unnamed Product",
          sku: productDetails.sku || `SKU-${product.productId}`,
          units: product.quantity,
          selling_price: sellingPrice,
          discount: product.discount || 0,
          tax: product.tax || 0,
        };
      })
    );

    const totalDimensions = { length: 10, width: 5, height: 8, weight: 0.5 };
    const sub_total = updatedProducts.reduce((sum, p) => sum + p.units * p.selling_price, 0);

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
      billing_state: addressSnapshot.state || "Unknown",
      billing_country: addressSnapshot.country || "India",
      billing_phone: order.user_id.phone || "1234567890",
      billing_pincode: addressSnapshot.postalCode,
      billing_email: order.user_id.email || "",
      order_items: updatedProducts,
      length: totalDimensions.length,
      breadth: totalDimensions.width,
      height: totalDimensions.height,
      weight: totalDimensions.weight,
    };

    const token = await getShipRocketToken();
    const response = await axios.post(
      `${shipRocketConfig.baseUrl}/v1/external/orders/create/adhoc`,
      requestBody,
      { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
    );

    await sendMessageToKafka("shiprocket.orders", {
      event: "order_created",
      orderId,
      response: response.data,
    });

    return response.data;
  } catch (error: any) {
    console.error("Error creating ShipRocket order:", error.message);
    await sendMessageToKafka("shiprocket.orders", {
      event: "order_creation_failed",
      orderId: orderData.orderId,
      error: error.message,
    });
    throw error;
  }
};

const cancelShipRocketOrder = async (orderId: string, shipRocketOrderId: number): Promise<any> => {
  try {
    const token = await getShipRocketToken();
    const response = await axios.post(
      `${shipRocketConfig.baseUrl}/v1/external/orders/cancel`,
      { ids: [shipRocketOrderId] },
      { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
    );

    await sendMessageToKafka("shiprocket.orders", {
      event: "order_canceled",
      orderId,
      response: response.data,
    });
    return response.data;
  } catch (error: any) {
    console.error("Error canceling ShipRocket order:", error.message);
    await sendMessageToKafka("shiprocket.orders", {
      event: "order_cancellation_failed",
      orderId,
      error: error.message,
    });
    throw error;
  }
};

const shipRocketReturnOrder = async (payload: any): Promise<any> => {
  try {
    const token = await getShipRocketToken();
    const response = await axios.post(
      `${shipRocketConfig.baseUrl}/v1/external/orders/create/return`,
      payload,
      { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
    );

    await sendMessageToKafka("shiprocket.orders", {
      event: "order_returned",
      orderId: payload.order_id,
      response: response.data,
    });
    return response.data;
  } catch (error: any) {
    console.error("Error returning ShipRocket order:", error.message);
    await sendMessageToKafka("shiprocket.orders", {
      event: "order_return_failed",
      orderId: payload.order_id,
      error: error.message,
    });
    throw error;
  }
};

const shipRocketTrackOrder = async (shipmentId: number): Promise<any> => {
  try {
    const token = await getShipRocketToken();
    const response = await axios.get(
      `${shipRocketConfig.baseUrl}/v1/external/courier/track/shipment/${shipmentId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error: any) {
    console.error("Error tracking ShipRocket shipment:", error.message);
    throw error;
  }
};

const getOrderDetailsFromShipRocket = async (shipRocketOrderId: number): Promise<any> => {
  try {
    const token = await getShipRocketToken();
    const response = await axios.get(
      `${shipRocketConfig.baseUrl}/v1/external/orders/show/${shipRocketOrderId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error: any) {
    console.error("Error fetching ShipRocket order details:", error.message);
    return null;
  }
};

export {
  cancelShipRocketOrder,
  createShipRocketOrder, getOrderDetailsFromShipRocket, shipRocketReturnOrder,
  shipRocketTrackOrder
};
