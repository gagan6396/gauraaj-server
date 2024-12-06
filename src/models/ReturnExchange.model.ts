import mongoose, { Document, Schema } from "mongoose";

// Return/Exchange Interface
export interface ReturnExchange extends Document {
  userId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  orderId: mongoose.Types.ObjectId;
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
  createdAt: Date;
}

// Return/Exchange Schema
const ReturnExchangeSchema: Schema<ReturnExchange> = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Return/Exchange Model
const ReturnExchangeModel =
  mongoose.models.ReturnExchange ||
  mongoose.model<ReturnExchange>("ReturnExchange", ReturnExchangeSchema);

export default ReturnExchangeModel;
