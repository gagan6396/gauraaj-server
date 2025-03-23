import mongoose, { Document, Schema } from "mongoose";

export interface PublicReview extends Document {
  comment: string;
  profile: string;
  createdAt: Date;
  updatedAt: Date;
}

const publicReviewSchema: Schema<PublicReview> = new Schema(
  {
    comment: {
      type: String,
      required: true,
      trim: true,
    },
    profile: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const publicReviewModel =
  mongoose.models.PublicReview || mongoose.model<PublicReview>("PublicReview", publicReviewSchema);

export default publicReviewModel;