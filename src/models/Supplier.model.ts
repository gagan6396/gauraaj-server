<<<<<<< HEAD
import mongoose, { Document, Schema } from "mongoose";
=======
import mongoose, { Schema, Document } from "mongoose";
>>>>>>> ravichandra/main

export interface Supplier extends Document {
  username: string;
  email: string;
  password: string;
  phone: string;
  shop_name: string;
  role: "Supplier";
  shop_address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  profileImage?: string;
  products: mongoose.Types.ObjectId[];
  orders: mongoose.Types.ObjectId[];
  inventoryCount: number;
  totalSales: number;
  averageRating: number;
<<<<<<< HEAD
  token: string;
=======
>>>>>>> ravichandra/main
  approval_status: "Pending" | "Approved" | "Rejected";
  totalOrders: number;
  passwordResetOTP: number;
  passwordResetOTPExpiration: Date;
  createdAt: Date;
  updatedAt: Date;
}

const supplierSchema: Schema<Supplier> = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    shop_name: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["Supplier"],
      default: "Supplier",
    },
    shop_address: {
      street: {
        type: String,
      },
      city: {
        type: String,
      },
      state: {
        type: String,
      },
      postalCode: {
        type: String,
      },
      country: {
        type: String,
      },
    },
    profileImage: {
      type: String,
    },
<<<<<<< HEAD
    token: {
      type: String,
    },
=======
>>>>>>> ravichandra/main
    products: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    orders: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order", // Reference to the Order model
      },
    ],
    inventoryCount: {
      type: Number,
      default: 0,
    },
    totalSales: {
      type: Number,
      default: 0,
    },
    averageRating: {
      type: Number,
      default: 0,
    },
    approval_status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    totalOrders: {
      type: Number,
      default: 0,
    },
    passwordResetOTP: {
      type: Number,
    },
    passwordResetOTPExpiration: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const supplierModel =
  mongoose.models.Supplier ||
  mongoose.model<Supplier>("Supplier", supplierSchema);

export default supplierModel;
