import mongoose, { Document, Model, Schema } from "mongoose";

export interface Payment extends Document {
  userId: mongoose.Types.ObjectId;
  orderId: mongoose.Types.ObjectId;
  paymentMethod:
    | "UPI"
    | "COD"
    | "Razorpay"
    | "Credit Card"
    | "Debit Card"
    | "Net Banking"
    | "Wallet";
  transactionId: string;
  amount: mongoose.Types.Decimal128;
  status: "Pending" | "Completed" | "Failed" | "Refunded";
  refundDetails?: {
    refundId?: string;
    amount?: mongoose.Types.Decimal128;
    reason?: string;
    refundedAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema: Schema<Payment> = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
    paymentMethod: {
      type: String,
      enum: [
        "UPI",
        "COD",
        "Razorpay",
        "Credit Card",
        "Debit Card",
        "Net Banking",
        "Wallet",
      ],
      required: true,
    },
    transactionId: {
      type: String,
      unique: true,
      required: true,
    },
    amount: {
      type: mongoose.Types.Decimal128,
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Completed", "Failed", "Refunded"],
      default: "Pending",
    },
    refundDetails: {
      refundId: {
        type: String,
        default: null, // Allow null values explicitly
      },
      amount: { type: mongoose.Types.Decimal128 },
      reason: { type: String },
      refundedAt: { type: Date },
    },
  },
  {
    timestamps: true,
  }
);

// Drop the existing index on `refundDetails.refundId` if it exists
paymentSchema.pre("save", async function (next) {
  const collection = (this.constructor as Model<Document>).collection;
  const indexes = await collection.indexes();

  const indexExists = indexes.some(
    (index: any) => index.name === "refundDetails.refundId_1"
  );

  if (indexExists) {
    await collection.dropIndex("refundDetails.refundId_1");
    console.log("Dropped conflicting index: refundDetails.refundId_1");
  }

  next();
});

// Define the model and handle reinitialization
const PaymentModel =
  mongoose.models.Payment || mongoose.model<Payment>("Payment", paymentSchema);

export default PaymentModel;
