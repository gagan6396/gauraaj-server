import mongoose, { Document, Schema } from "mongoose";

export interface Order extends Document {
  user_id: mongoose.Types.ObjectId;
  orderDate: Date;
  totalAmount: number;
<<<<<<< HEAD
  orderStatus: "Pending" | "Shipped" | "Delivered" | "Cancelled";
=======
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
>>>>>>> ravichandra/main
  products: {
    productId: mongoose.Types.ObjectId;
    quantity: number;
  }[];
  shipRocketOrderId?: number;
  shippingAddressId: mongoose.Types.ObjectId;
  payment_id: mongoose.Types.ObjectId;
}

// Order Schema
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
<<<<<<< HEAD
      enum: ["Pending", "Shipped", "Delivered", "Cancelled"],
=======
      enum: [
        "Pending",
        "Shipped",
        "Delivered",
        "Cancelled",
        "Return Requested",
      ],
      default: "Pending",
    },
    shippingStatus: {
      type: String,
      enum: ["Pending", "Shipped", "Delivered", "Cancelled", "Returned"], // Added `Returned`
>>>>>>> ravichandra/main
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

// Order Model
const orderModel =
  mongoose.models.Order || mongoose.model<Order>("Order", OrderSchema);

export default orderModel;
