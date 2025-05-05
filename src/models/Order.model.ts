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
    variantId: string;
    quantity: number;
    price: number;
    name: string;
    skuParameters?: Record<string, any>;
  }[];
  shipRocketOrderId?: string;
  shippingAddressId: mongoose.Types.ObjectId;
  payment_id: mongoose.Types.ObjectId;
  paymentMethod: 0 | 1; // 0 for Razorpay, 1 for COD
  userDetails: {
    name: string;
    phone: string;
    email: string;
  };
  estimatedDeliveryDays?: number;
  courierService?: string;
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
          type: String,
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
          sku: { type: String, required: true },
          weight: { type: String, required: true },
          length: { type: String },
          breadth: { type: String },
          height: { type: String },
        },
      },
    ],
    shipRocketOrderId: {
      type: String,
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
    paymentMethod: {
      type: Number,
      enum: [0, 1],
      required: true,
    },
    userDetails: {
      name: {
        type: String,
        required: true,
      },
      phone: {
        type: String,
        required: true,
      },
      email: {
        type: String,
        required: true,
      },
    },
    estimatedDeliveryDays: {
      type: Number,
      required: false,
    },
    courierService: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

const orderModel =
  mongoose.models.Order || mongoose.model<Order>("Order", OrderSchema);

export default orderModel;
