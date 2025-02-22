import mongoose, { Document, Schema } from "mongoose";

// Define Order interface extending Document
export interface Order extends Document {
  user_id: mongoose.Types.ObjectId;
  orderDate: Date;
  totalAmount: number;
  orderStatus:
    | "Pending"
    | "Confirmed" // Added "Confirmed"
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
    quantity: number;
    skuParameters?: Record<string, string>;
  }[];
  shipRocketOrderId?: number;
  shippingAddressId: mongoose.Types.ObjectId;
  payment_id: mongoose.Types.ObjectId;
}

// Order Schema definition
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
        "Confirmed", // Added "Confirmed"
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
        quantity: {
          type: Number,
          required: true,
          min: [1, "Quantity must be at least 1"],
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