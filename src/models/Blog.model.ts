// models/blog.model.ts
import mongoose, { Document, Schema } from "mongoose";

interface IBlog extends Document {
  title: string;
  content: string;
  author: mongoose.Schema.Types.ObjectId;
  category: string;
  sequence: number;
  isPinned: boolean;
  isHidden: boolean;
  tags: string[];
  imageUrl?: string;
  slug: string;
  views: number;
  createdAt: Date;
  updatedAt: Date;
}

const BlogSchema = new Schema<IBlog>(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    category: { type: String, required: true },
    sequence: { type: Number, default: 0 }, // For ordering blogs
    isPinned: { type: Boolean, default: false }, // Pin to top
    isHidden: { type: Boolean, default: false }, // Hide from public view
    tags: [{ type: String, trim: true }],
    imageUrl: { type: String },
    slug: { type: String, required: true, unique: true, trim: true }, // SEO-friendly URL
    views: { type: Number, default: 0 }, // Track view count
  },
  { timestamps: true }
);

// Ensure slug uniqueness
BlogSchema.index({ slug: 1 }, { unique: true });

const Blog = mongoose.model<IBlog>("Blog", BlogSchema);
export default Blog;
