import mongoose, { Schema, Document } from "mongoose";

export interface Review extends Document {
  userId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  rating: number;
  comment: string;
  images: string[];
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema: Schema<Review> = new Schema(
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
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
    },
    images: [
      {
        type: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

const reviewModel =
  mongoose.models.Review || mongoose.model<Review>("Review", reviewSchema);

export default reviewModel;
