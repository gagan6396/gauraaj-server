import crypto from "crypto";
import nodemailer from "nodemailer";

const generateOtp = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Sending the email using SendGrid SMTP Relay
export const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.sendgrid.net",
      port: 587, // Use 587 for TLS or 465 for SSL
      secure: false, // true for 465, false for 587
      auth: {
        user: "apikey", // SendGrid requires "apikey" as the username
        pass: process.env.SENDGRID_API_KEY, // Your SendGrid API key
      },
    });

    const mailOptions = {
      from:
        process.env.SENDGRID_VERIFIED_SENDER ||
        `"Gauraaj" <no-reply@gauraaj.com>`,
      to,
      subject: `${subject} | Gauraaj Order Update`,
      html,
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
  const html = `<p>Your OTP to reset your password is: <strong>${otp}</strong>. Please use it within the next 10 minutes.</p>`;

  try {
    await sendEmail(email, subject, html);
    return otp;
  } catch (error) {
    console.error("Error sending OTP email", error);
    throw new Error("Error sending Email");
  }
};

export { generateOtp, sendOtpEmail };

