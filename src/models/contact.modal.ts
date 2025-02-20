import mongoose, { Document, Schema } from "mongoose";

interface IContact extends Document {
  name: string;
  phone: string;
  category: "General Inquiry" | "Support" | "Feedback" | "Other";
  message: string;
  createdAt: Date;
}

const ContactSchema = new Schema<IContact>(
  {
    name: { type: String, required: true, trim: true },
    phone: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ["General Inquiry", "Support", "Feedback", "Other"],
      required: true,
    },
    message: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

const Contact = mongoose.model<IContact>("Contact", ContactSchema);

export default Contact;
