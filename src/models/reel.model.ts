import mongoose, { Document, Schema } from "mongoose";

interface IReel extends Document {
  name: string;
  description: string;
  reelUrl: string;
  products: mongoose.Schema.Types.ObjectId[]; // Array of product IDs
  createdAt: Date;
}

const ReelSchema = new Schema<IReel>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    reelUrl: { type: String, required: true },
    products: [{ type: Schema.Types.ObjectId, ref: "Product" }],
  },
  { timestamps: true }
);

const Reel = mongoose.model<IReel>("Reel", ReelSchema);
export default Reel;
