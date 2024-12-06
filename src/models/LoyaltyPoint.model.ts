import mongoose, { Schema, Document } from "mongoose";

export interface LoyaltyPoint extends Document {
  user_id: mongoose.Types.ObjectId;
  totalPoints: number;
  pointsHistory: {
    transactionType: "Earned" | "Redeemed";
    points: number;
    description: string;
    date: Date;
  }[];
  updatedAt: Date;
}

const loyaltyPointSchema: Schema<LoyaltyPoint> = new Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    totalPoints: {
      type: Number,
      required: true,
      default: 0,
    },
    pointsHistory: [
      {
        transactionType: {
          type: String,
          enum: ["Earned", "Redeemed"],
          required: true,
        },
        points: {
          type: Number,
          required: true,
        },
        description: {
          type: String,
          trim: true,
        },
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const LoyaltyPointModel =
  mongoose.models.LoyaltyPoint ||
  mongoose.model<LoyaltyPoint>("LoyaltyPoint", loyaltyPointSchema);

export default LoyaltyPointModel;
