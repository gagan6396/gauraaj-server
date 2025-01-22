<<<<<<< HEAD
import mongoose, { Document } from "mongoose";
=======
import mongoose, { Schema, Document } from "mongoose";
>>>>>>> ravichandra/main

// Category interface
export interface ICategory extends Document {
  name: string;
  description: string;
<<<<<<< HEAD
  image?: string;
  parentCategoryId?: mongoose.Types.ObjectId | null; // Nullable for top-level categories
  status: boolean;
  slug: string;
  skuParameters: string[];
=======
  images?: string[]; // Updated to allow multiple images
  parentCategoryId?: mongoose.Types.ObjectId | null; // Nullable for top-level categories
  status: boolean;
  slug: string;
  skuParameters?: string[];
>>>>>>> ravichandra/main
  createdAt: Date;
  updatedAt: Date;
}

<<<<<<< HEAD
// Category Schema
=======
// Updated Category Schema
>>>>>>> ravichandra/main
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
<<<<<<< HEAD
    image: {
      type: String,
=======
    images: {
      type: [String], // Array of strings for multiple image URLs
      validate: {
        validator: (v: string[]) => v.length <= 5, // Limit to 5 images
        message: "A category can have up to 5 images.",
      },
      required: true, // Ensure at least one image is provided
>>>>>>> ravichandra/main
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
<<<<<<< HEAD
      type: [String], // Array of strings
      default: [], // Initialize as an empty array
=======
      type: [String], 
      default: [], 
>>>>>>> ravichandra/main
    },
  },
  { timestamps: true }
);

const categoryModel =
  mongoose.models.Category ||
  mongoose.model<ICategory>("Category", categorySchema);

export default categoryModel;
