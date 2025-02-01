import mongoose, { Schema, Document } from "mongoose";

export interface User extends Document {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone: string;
  googleId?: string;
  role: "Guest User" | "User";
  passwordResetToken: string | null; // Added for token-based password reset
  passwordResetTokenExpiration: Date | null; // Added for token expiration
  createdAt: Date;
  updatedAt: Date;
}

const userSchema: Schema<User> = new mongoose.Schema(
  {
    first_name: {
      type: String,
      required: true,
    },
    last_name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    role: {
      type: String,
      enum: ["Guest User", "User"],
      required: true,
      default: "User",
    },
    passwordResetToken: {
      type: String,
      default: null, // Set default to null
    },
    passwordResetTokenExpiration: {
      type: Date,
      default: null, // Set default to null
    },
  },
  {
    timestamps: true,
  }
);

const userModel =
  mongoose.models.User || mongoose.model<User>("User", userSchema);

export default userModel;
