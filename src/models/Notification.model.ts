import mongoose, { Schema, Document } from "mongoose";

export interface Notification extends Document {
  user_id: mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: "Order" | "Promotion" | "System" | "Reminder";
  isRead: boolean;
  createdAt: Date;
}

const notificationSchema: Schema<Notification> = new Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["Order", "Promotion", "System", "Reminder"],
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const NotificationModel =
  mongoose.models.Notification ||
  mongoose.model<Notification>("Notification", notificationSchema);

export default NotificationModel;
