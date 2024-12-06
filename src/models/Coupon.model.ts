import mongoose, { Schema, Document } from "mongoose";

export interface Coupon extends Document {
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minOrderValue?: number;
  maxDiscountValue?: number;
  startDate: Date;
  expiryDate: Date;
  isActive: Boolean;
  usageLimit?: number;
  usedCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const couponSchema: Schema<Coupon> = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
    },
    minOrderValue: {
      type: Number,
    },
    maxDiscountValue: {
      type: Number,
    },
    startDate: {
      type: Date,
      required: true,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    usageLimit: {
      type: Number,
    },
    usedCount: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const couponModel =
  mongoose.models.Coupon || mongoose.model<Coupon>("Coupon", couponSchema);

export default couponModel;
