import mongoose, { Document, Schema } from "mongoose";

// Define Order interface extending Document
export interface Order extends Document {
  user_id: mongoose.Types.ObjectId;
  orderDate: Date;
  totalAmount: number;
  orderStatus:
    | "Pending"
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
      ref: "User", // Refers to the User model
      required: true,
    },
    orderDate: {
      type: Date,
      default: Date.now, // Default to current date
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
        "Shipped",
        "Delivered",
        "Cancelled",
        "Return Requested",
      ],
      default: "Pending", // Default to "Pending"
    },
    shippingStatus: {
      type: String,
      enum: ["Pending", "Shipped", "Delivered", "Cancelled", "Returned"],
      default: "Pending", // Default to "Pending"
    },
    products: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product", // Refers to the Product model
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: [1, "Quantity must be at least 1"], // Ensure quantity is at least 1
        },
        skuParameters: {
          type: Map,
          of: String, // SKU parameters will be stored as a Map of strings
        },
      },
    ],
    shipRocketOrderId: {
      type: Number,
      required: false,
    },
    shippingAddressId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Profile", // Refers to the Profile model for the shipping address
      required: true,
    },
    payment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment", // Refers to the Payment model
    },
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt fields
  }
);

// Create or use the existing Order model
const orderModel =
  mongoose.models.Order || mongoose.model<Order>("Order", OrderSchema);

export default orderModel;
