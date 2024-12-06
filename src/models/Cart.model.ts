import mongoose, { Document, Schema } from "mongoose";

export interface Cart extends Document {
  userId: mongoose.Types.ObjectId;
  products: {
    productId: mongoose.Types.ObjectId;
    quantity: number;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

// Cart Schema
const CartSchema: Schema<Cart> = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
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
  },
  {
    timestamps: true,
  }
);

const CartModel =
  mongoose.models.Cart || mongoose.model<Cart>("Cart", CartSchema);

export default CartModel;
