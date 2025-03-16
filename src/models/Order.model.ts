// models/Order.model.ts
import mongoose, { Document, Schema } from "mongoose";

export interface Order extends Document {
  user_id: mongoose.Types.ObjectId;
  orderDate: Date;
  totalAmount: number;
  orderStatus:
    | "Pending"
    | "Confirmed"
    | "Shipped"
    | "Delivered"
    | "Cancelled"
    | "Return Requested";
  shippingStatus:
    | "Pending"
    | "Shipped"
    | "Delivered"
    | "Cancelled"
    | "Returned";
  products: {
    productId: mongoose.Types.ObjectId;
    variantId: string; // Variant SKU or identifier
    quantity: number;
    price: number; // Price of the variant at the time of order
    name: string; // Product name + variant name for reference
    skuParameters?: Record<string, string>;
  }[];
  shipRocketOrderId?: number;
  shippingAddressId: mongoose.Types.ObjectId;
  payment_id: mongoose.Types.ObjectId;
}

const OrderSchema: Schema<Order> = new Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    orderDate: {
      type: Date,
      default: Date.now,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: [0, "Total amount cannot be negative"],
    },
    orderStatus: {
      type: String,
      enum: [
        "Pending",
        "Confirmed",
        "Shipped",
        "Delivered",
        "Cancelled",
        "Return Requested",
      ],
      default: "Pending",
    },
    shippingStatus: {
      type: String,
      enum: ["Pending", "Shipped", "Delivered", "Cancelled", "Returned"],
      default: "Pending",
    },
    products: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        variantId: {
          type: String, // Use SKU or another unique identifier for the variant
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: [1, "Quantity must be at least 1"],
        },
        price: {
          type: Number,
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        skuParameters: {
          type: Map,
          of: String,
        },
      },
    ],
    shipRocketOrderId: {
      type: Number,
      required: false,
    },
    shippingAddressId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Profile",
      required: true,
    },
    payment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
    },
  },
  {
    timestamps: true,
  }
);

const orderModel =
  mongoose.models.Order || mongoose.model<Order>("Order", OrderSchema);

export default orderModel;