import mongoose, { Document } from "mongoose";

// Category interface
export interface ICategory extends Document {
  name: string;
  description: string;
  images?: string[]; // Updated to allow multiple images
  parentCategoryId?: mongoose.Types.ObjectId | null; // Nullable for top-level categories
  status: boolean;
  slug: string;
  skuParameters?: string[];
  createdAt: Date;
  updatedAt: Date;
  sequence: number; // Optional sequence field for ordering
}

// Updated Category Schema
const categorySchema = new mongoose.Schema<ICategory>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      required: true,
    },
    images: {
      type: [String], // Array of strings for multiple image URLs
      validate: {
        validator: (v: string[]) => v.length <= 5, // Limit to 5 images
        message: "A category can have up to 5 images.",
      },
      required: true, // Ensure at least one image is provided
    },
    parentCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    status: {
      type: Boolean,
      default: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
    },
    skuParameters: {
      type: [String],
      default: [],
    },
    sequence: {
      type: Number,
      required: true,
      min: [0, "Sequence cannot be negative"],
      default: 0, // Default sequence value
    },
  },
  { timestamps: true }
);

const categoryModel =
  mongoose.models.Category ||
  mongoose.model<ICategory>("Category", categorySchema);

export default categoryModel;
