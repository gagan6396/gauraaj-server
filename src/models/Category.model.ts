import mongoose, { Document } from "mongoose";

// Category interface
export interface ICategory extends Document {
  name: string;
  description: string;
  image?: string;
  parentCategoryId?: mongoose.Types.ObjectId | null; // Nullable for top-level categories
  status: boolean;
  slug: string;
  skuParameters: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Category Schema
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
    image: {
      type: String,
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
      type: [String], // Array of strings
      default: [], // Initialize as an empty array
    },
  },
  { timestamps: true }
);

const categoryModel =
  mongoose.models.Category ||
  mongoose.model<ICategory>("Category", categorySchema);

export default categoryModel;
