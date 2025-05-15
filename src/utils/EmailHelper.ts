import crypto from "crypto";
import nodemailer from "nodemailer";

const generateOtp = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Sending the email
export const sendEmail = async (
  to: string,
  subject: string,
  html: string,
  options: {
    from?: string;
    headers?: Record<string, string>;
    replyTo?: string;
  } = {}
) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      secure: true,
      port: 465,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: options.from || `"Gauraaj" <${process.env.EMAIL_USER}>`,
      to,
      subject: `${subject} | Gauraaj Order Update`,
      html,
      replyTo: options.replyTo || "ghccustomercare@gmail.com",
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${to}: ${info.messageId}`);
    return info;
  } catch (error: any) {
    console.error("Error sending email:", {
      error: error.message,
      stack: error.stack,
      to,
      subject,
    });
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

const sendOtpEmail = async (email: string): Promise<string> => {
  const otp = generateOtp();
  const subject = "Your OTP for Password Reset";
  const text = `Your OTP to reset your password is: ${otp}. Please use it within the next 10 minutes.`;

  try {
    await sendEmail(email, subject, text);
    return otp;
  } catch (error) {
    console.error("Error sending OTP email", error);
    throw new Error("Error sending Email");
  }
};

export { generateOtp, sendOtpEmail };

