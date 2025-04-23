import mongoose, { Document, Model, Schema } from "mongoose";

export interface Payment extends Document {
  userId: mongoose.Types.ObjectId;
  orderId: mongoose.Types.ObjectId;
  paymentMethod: "Razorpay" | "COD";
  transactionId: string;
  amount: number;
  status: "Pending" | "Completed" | "Failed" | "Refunded";
  refundDetails?: {
    refundId?: string;
    amount?: number;
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
      enum: ["Razorpay", "COD"],
      required: true,
    },
    transactionId: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [0, "Amount cannot be negative"],
    },
    status: {
      type: String,
      enum: ["Pending", "Completed", "Failed", "Refunded"],
      default: "Pending",
    },
    refundDetails: {
      refundId: {
        type: String,
        default: null,
      },
      amount: {
        type: Number,
      },
      reason: {
        type: String,
      },
      refundedAt: {
        type: Date,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Drop conflicting index if it exists
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

const PaymentModel =
  mongoose.models.Payment || mongoose.model<Payment>("Payment", paymentSchema);

export default PaymentModel;
