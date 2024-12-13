import mongoose, { Schema, Document } from "mongoose";

export interface WishList extends Document {
  user_id: mongoose.Types.ObjectId;
  product_id: mongoose.Types.ObjectId[]; // Array of Product Object
  createdAt: Date;
  updatedAt: Date;
}

const wishlistSchema: Schema<WishList> = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    product_id: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
  },
  {
    timestamps: true,
  }
);

const wishlistModel =
  mongoose.models.WishList ||
  mongoose.model<WishList>("WishList", wishlistSchema);

export default wishlistModel;
