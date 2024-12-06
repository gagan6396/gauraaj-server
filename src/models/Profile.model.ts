import mongoose, { Schema, Document } from "mongoose";

export interface Profile extends Document {
  user_id: mongoose.Types.ObjectId;
  profileImage?: string;
  shoppingAddress: {
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  orderList?: mongoose.Types.ObjectId[];
  wishList?: mongoose.Types.ObjectId[];
}

const profileSchema: Schema<Profile> = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  profileImage: {
    type: String,
    default: "", 
  },
  shoppingAddress: {
    addressLine1: {
      type: String,
      default: "",
    },
    addressLine2: {
      type: String,
      default: "",
    },
    city: {
      type: String,
      default: "",
    },
    state: {
      type: String,
      default: "",
    },
    country: {
      type: String,
      default: "",
    },
    postalCode: {
      type: String,
      default: "",
    },
  },
  orderList: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
  ],
  wishList: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },
  ],
});

const profileModel =
  mongoose.models.Profile || mongoose.model<Profile>("Profile", profileSchema);

export default profileModel;
