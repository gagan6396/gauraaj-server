import mongoose, { Document, Schema } from "mongoose";

export interface Shipping extends Document {
  userId: mongoose.Types.ObjectId;
  orderId: mongoose.Types.ObjectId;
  profileId: mongoose.Types.ObjectId;
  addressSnapshot: {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  trackingNumber?: string;
  courierService: string;
  shippingStatus:
    | "Pending"
    | "Shipped"
    | "In Transit"
    | "Delivered"
    | "Cancelled";
  estimatedDeliveryDate: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
}

const ShippingSchema: Schema<Shipping> = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    profileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Profile",
      required: true,
    },
    addressSnapshot: {
      addressLine1: {
        type: String,
        required: true,
      },
      addressLine2: {
        type: String,
      },
      city: {
        type: String,
        required: true,
      },
      state: {
        type: String,
        required: true,
      },
      postalCode: {
        type: String,
        required: true,
      },
      country: {
        type: String,
        required: true,
      },
    },
    trackingNumber: {
      type: String,
    },
    courierService: {
      type: String,
      required: true,
    },
    shippingStatus: {
      type: String,
      enum: ["Pending", "Shipped", "In Transit", "Delivered", "Cancelled"],
      default: "Pending",
    },
    estimatedDeliveryDate: {
      type: Date,
      required: true,
    },
    shippedAt: {
      type: Date,
    },
    deliveredAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

const ShippingModel =
  mongoose.models.Shipping ||
  mongoose.model<Shipping>("Shipping", ShippingSchema);

export default ShippingModel;