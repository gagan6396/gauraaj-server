import bcrypt from "bcrypt";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import profileModel from "../models/Profile.model";
import userModel from "../models/User.model";
import apiResponse from "../utils/ApiResponse";
import { generateToken } from "../utils/jwtHelper";

// Configure Nodemailer transporter for Gmail
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // Your Gmail address (set in .env)
    pass: process.env.EMAIL_PASS, // Your Gmail App Password (set in .env)
  },
});

const RegisterUser = async (req: Request, res: Response) => {
  try {
    const { first_name, last_name, email, phone, password } = req.body;

    // Validate input fields
    if (!first_name || !last_name || !email || !password || !phone) {
      return apiResponse(res, 400, false, "All fields are required");
    }

    // Check if user already exists
    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return apiResponse(res, 409, false, "User already exists");
    }

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create a new user
    const newUser = await userModel.create({
      first_name,
      last_name,
      email,
      phone,
      password: hashedPassword,
    });

    // Generate JWT token
    const token = generateToken({ id: newUser._id, email: newUser.email });

    newUser.passwordResetToken = token;
    await newUser.save();

    // Create a profile for the new user
    await profileModel.create({
      user_id: newUser._id,
      shoppingAddress: {
        addressLine1: "",
        addressLine2: "",
        city: "",
        state: "",
        country: "",
        postalCode: "",
      },
    });

    // Send welcome email
    const welcomeMailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Welcome to Our Platform!",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #2B0504;">Thank You for Joining Us!</h2>
          <p>Hello ${first_name},</p>
          <p>We’re excited to have you on board! Your account has been successfully created.</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone}</p>
          <p>Start exploring our platform and enjoy your shopping experience!</p>
          <a href="${process.env.FRONTEND_URL}" style="display: inline-block; padding: 10px 20px; background-color: #2B0504; color: white; text-decoration: none; border-radius: 5px;">Visit Now</a>
          <p style="margin-top: 20px;">Best regards,<br>The Team</p>
        </div>
      `,
    };

    await transporter.sendMail(welcomeMailOptions);

    // Return success response
    return apiResponse(res, 201, true, "User registered successfully", {
      user: { token },
    });
  } catch (error) {
    console.error("Error while registering user:", error);
    return apiResponse(res, 500, false, "Internal server error");
  }
};

const LoginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return apiResponse(res, 400, false, "Please fill all fields");
    }

    // Check if user exists
    const userExist = await userModel.findOne({ email });
    if (!userExist) {
      return apiResponse(res, 404, false, "User not found");
    }

    // Validate password
    const isPasswordValid = await bcrypt.compare(password, userExist.password);
    if (!isPasswordValid) {
      return apiResponse(res, 401, false, "Invalid password");
    }

    // Generate JWT token
    const token = generateToken({ id: userExist._id, email: userExist.email });

    userExist.passwordResetToken = token;
    await userExist.save();

    return apiResponse(res, 200, true, "Login successful", {
      token,
      user: {
        id: userExist._id,
        email: userExist.email,
      },
    });
  } catch (error) {
    console.error("Error while logging user:", error);
    return apiResponse(res, 500, false, "Internal server error");
  }
};

const logOut = async (req: Request, res: Response) => {
  try {
    res.clearCookie("token", { httpOnly: true, secure: true });
    return apiResponse(res, 200, true, "Logged out successfully");
  } catch (error) {
    console.error("Error while logging out:", error);
    return apiResponse(res, 500, false, "Internal server error");
  }
};

// Request password reset (send email with reset link)
const requestPasswordReset = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return apiResponse(res, 400, false, "Email is required");
    }

    const user = await userModel.findOne({ email });
    if (!user) {
      return apiResponse(res, 404, false, "User not found");
    }

    // Generate reset token
    const resetToken = generateToken({ id: user._id, email: user.email }); // Expires in 1 hour
    user.passwordResetToken = resetToken;
    await user.save();

    // Send reset email
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset Request",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #2B0504;">Reset Your Password</h2>
          <p>Hello ${user.first_name},</p>
          <p>We received a request to reset your password. Click the link below to proceed:</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #2B0504; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
          <p style="margin-top: 20px;">This link will expire in 1 hour. If you didn’t request this, please ignore this email.</p>
          <p>Best regards,<br>The Team</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    return apiResponse(
      res,
      200,
      true,
      "Password reset link sent to your email"
    );
  } catch (error) {
    console.error("Error while requesting password reset:", error);
    return apiResponse(res, 500, false, "Internal server error");
  }
};

// Reset password with token from email
const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return apiResponse(
        res,
        400,
        false,
        "Token and new password are required"
      );
    }

    // Verify token
    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
    } catch (error) {
      return apiResponse(res, 400, false, "Invalid or expired token");
    }

    const user = await userModel.findOne({
      _id: decoded.id,
      passwordResetToken: token,
    });
    if (!user) {
      return apiResponse(res, 404, false, "User not found or invalid token");
    }

    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    user.password = hashedPassword;
    user.passwordResetToken = null; // Clear token after use
    await user.save();

    return apiResponse(res, 200, true, "Password reset successfully");
  } catch (error) {
    console.error("Error while resetting password:", error);
    return apiResponse(res, 500, false, "Internal server error");
  }
};

export { LoginUser, logOut, RegisterUser, requestPasswordReset, resetPassword };

