import mongoose, { Schema, Document, mongo } from "mongoose";

export interface History extends Document {
  order_id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  order_status: "Pending" | "Shipped" | "Delivered" | "Cancelled";
  createdAt: Date;
  updatedAt: Date;
  notes?: string;
}

const historySchema: Schema<History> = new mongoose.Schema(
  {
    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    order_status: {
      type: String,
      enum: ["Pending", "Shipped", "Delivered", "Cancelled"],
      required: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const historyModel =
  mongoose.models.History || mongoose.model<History>("History", historySchema);

export default historyModel;
