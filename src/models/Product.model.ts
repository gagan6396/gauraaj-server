import mongoose, { Document, Schema } from "mongoose";

export interface Product extends Document {
  supplier_id: mongoose.Types.ObjectId;
  category_id: mongoose.Types.ObjectId;
  subcategory_id?: mongoose.Types.ObjectId;
  reviews: mongoose.Types.ObjectId[];
  name: string;
  description: string;
  price: mongoose.Types.Decimal128;
  stock: number;
  images: string[];
  rating: number;
  brand: string;
  weight: number; // Weight in kilograms
  dimensions: {
    height: number; // Height in cm
    length: number; // Length in cm
    width: number; // Width in cm
  };
  sku: string; // Stock Keeping Unit
  skuParameters?: Record<string, string[]>; // Dynamic SKU parameters
}

const productSchema: Schema<Product> = new mongoose.Schema(
  {
    supplier_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
    },
    category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    subcategory_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category", // Assuming subcategories are stored in the same collection as categories
      default: null,
    },
    reviews: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Review",
      },
    ],
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
      validate: {
        validator: (value: mongoose.Types.Decimal128) =>
          parseFloat(value.toString()) > 0,
        message: "Price must be greater than zero.",
      },
    },
    stock: {
      type: Number,
      required: true,
      min: [0, "Stock cannot be negative."],
    },
    images: {
      type: [String],
      required: true,
    },
    rating: {
      type: Number,
      default: 0,
      min: [0, "Rating cannot be less than 0."],
      max: [5, "Rating cannot be greater than 5."],
    },
    brand: {
      type: String,
      required: true,
      trim: true,
    },
    weight: {
      type: Number,
      required: true,
      min: [0, "Weight cannot be negative."],
    },
    dimensions: {
      height: {
        type: Number,
        required: true,
        min: [0, "Height cannot be negative."],
      },
      length: {
        type: Number,
        required: true,
        min: [0, "Length cannot be negative."],
      },
      width: {
        type: Number,
        required: true,
        min: [0, "Width cannot be negative."],
      },
    },
    sku: {
      type: String,
      required: true,
      // unique: true,
      trim: true,
    },
    skuParameters: {
      type: Map,
      of: [String],
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

const productModel =
  mongoose.models.Product || mongoose.model<Product>("Product", productSchema);

export default productModel;
