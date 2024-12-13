import { Request, Response } from "express";
import crypto from "crypto";
import  paymentModel from "./src/models/Payment.model";

// Razorpay webhooks setup for getting bac the payment details


const razorpayWebhook = async (req: Request, res: Response) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    // Secret key for signature verification (keep it safe, don't expose in frontend)
    const secret = process.env.RAZORPAY_KEY_SECRET as string;

    // Step 1: Verify the signature
    const generatedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature",
      });
    }

    // Step 2: Find the payment in your database and update its status
    const payment = await paymentModel.findOneAndUpdate(
      { transactionId: razorpay_order_id },
      { status: "Completed" },
      { new: true }
    );

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      data: payment,
    });
  } catch (error) {
    console.error("Error processing Razorpay webhook", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export default razorpayWebhook;
