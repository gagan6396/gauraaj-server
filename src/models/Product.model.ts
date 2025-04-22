// models/Product.model.ts
import mongoose, { Document, Schema } from "mongoose";

export interface Variant {
  name: string;
  price: mongoose.Types.Decimal128;
  stock: number;
  weight: number;
  dimensions: {
    height: number;
    length: number;
    width: number;
  };
  sku: string;
  images?: string[];
  discount?: {
    type: "percentage" | "flat";
    value: number;
    active: boolean;
    startDate?: Date;
    endDate?: Date;
  };
}

export interface Product extends Document {
  supplier_id: mongoose.Types.ObjectId;
  category_id: mongoose.Types.ObjectId;
  subcategory_id?: mongoose.Types.ObjectId;
  reviews: mongoose.Types.ObjectId[];
  name: string;
  description: string;
  variants: Variant[];
  images: { url: string; sequence: number }[]; // Updated images with sequence
  video?: string;
  rating: number;
  brand: string;
  isBestSeller: boolean; // Added best seller flag
  sequence: number;
}

const variantSchema = new mongoose.Schema({
  name: {
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
  },
  images: {
    type: [String],
    default: [],
  },
  discount: {
    type: {
      type: String,
      enum: ["percentage", "flat"],
    },
    value: {
      type: Number,
      min: [0, "Discount cannot be negative"],
      max: [100, "Percentage discount cannot exceed 100"],
    },
    active: {
      type: Boolean,
      default: false,
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
  },
});

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
      ref: "Category",
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
    variants: [variantSchema],
    images: [
      {
        url: {
          type: String,
          required: true,
        },
        sequence: {
          type: Number,
          required: true,
          min: [0, "Sequence cannot be negative"],
        },
      },
    ],
    video: {
      type: String,
      trim: true,
      default: null,
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
    isBestSeller: {
      type: Boolean,
      default: false,
    },
    sequence: {
      type: Number,
      required: true,
      min: [0, "Sequence cannot be negative"],
      default: 0, // Default sequence value
    },
  },
  {
    timestamps: true,
  }
);

const productModel =
  mongoose.models.Product || mongoose.model<Product>("Product", productSchema);

export default productModel;
