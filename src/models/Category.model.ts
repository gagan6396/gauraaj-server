import mongoose, { Schema, Document } from "mongoose";

// Category interface
export interface ICategory extends Document {
  name: string;
  description: string;
  image?: string;
  parentCategoryId?: mongoose.Types.ObjectId;
  status: boolean;
  slug: string;
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
  },
  { timestamps: true }
);

// Category Model
const categoryModel =
  mongoose.models.Category ||
  mongoose.model<ICategory>("Category", categorySchema);

export default categoryModel;
