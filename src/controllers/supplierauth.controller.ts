import supplierModel from "../models/Supplier.model";
import { Response, Request } from "express";
import apiResponse from "../utils/ApiResponse";
import bcrypt from "bcrypt";
import adminModel from "../models/Admin.model";
import { sendEmailToAdmins } from "../utils/EmailSend";
import { generateToken } from "../utils/jwtHelper";
import { sendOtpEmail } from "../utils/EmailHelper";

const saltRounds = 10;

const registerSupplier = async (req: Request, res: Response) => {
  try {
    const { username, email, password, phone, shop_name, shop_address } =
      req.body;

    // Validate required fields
    if (
      !username ||
      !email ||
      !password ||
      !phone ||
      !shop_name ||
      !shop_address
    ) {
      return apiResponse(res, 400, false, "All fields are required.");
    }

    // Check if supplier email already exists
    const existingSupplier = await supplierModel.findOne({ email });
    if (existingSupplier) {
      return apiResponse(res, 400, false, "Email is already registered.");
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create a new supplier with "pending" approval status
    const newSupplier = new supplierModel({
      username,
      email,
      password: hashedPassword,
      phone,
      shop_name,
      shop_address,
      approval_status: "Pending",
    });

    const savedSupplier = await newSupplier.save();

    const admins = await adminModel.find();
    if (admins.length > 0) {
      const adminEmails = admins.map((admin) => admin.email);

      // Send email to admins for approval
      const emailSubject = "New Supplier Registration Approval Request";
      const emailHtml = `
        <p>A new supplier has registered on the platform:</p>
        <ul>
          <li><strong>Username:</strong> ${username}</li>
          <li><strong>Email:</strong> ${email}</li>
          <li><strong>Shop Name:</strong> ${shop_name}</li>
          <li><strong>Phone:</strong> ${phone}</li>
        </ul>
        <p>Please review and approve the supplier in the admin panel.</p>
      `;
      await sendEmailToAdmins(adminEmails, emailSubject, emailHtml);
    }

    return apiResponse(
      res,
      201,
      true,
      "Registration successful. Approval request sent to admins.",
      {
        supplier_id: newSupplier._id,
        savedSupplier,
      }
    );
  } catch (error) {
    console.error("Error during supplier registration:", error);
    return apiResponse(res, 500, false, "Internal server error.");
  }
};

const loginSupplier = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return apiResponse(res, 400, false, "Email and password are required.");
    }

    // Find the supplier
    const supplier = await supplierModel.findOne({ email });
    if (!supplier) {
      return apiResponse(res, 404, false, "Supplier not found.");
    }

    if (supplier.approval_status !== "Approved") {
      return apiResponse(
        res,
        403,
        false,
        "Your account has not been approved by the admin."
      );
    }

    // Validating the password if approved
    const isValidPassword = await bcrypt.compare(password, supplier.password);
    if (!isValidPassword) {
      return apiResponse(res, 401, false, "Invalid password.");
    }

    const token = generateToken({ id: supplier._id, role: "Supplier" });

    return apiResponse(res, 200, true, "Login Successfull", {
      token,
      supplier: {
        id: supplier._id,
        username: supplier.username,
        email: supplier.email,
        phone: supplier.phone,
        shop_name: supplier.shop_name,
        shop_address: supplier.shop_address,
        profileImage: supplier.profileImage,
        approval_status: supplier.approval_status,
        createdAt: supplier.createdAt,
        updatedAt: supplier.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error logging Supplier", error);
    return apiResponse(res, 500, false, "Internal server error.");
  }
};

const supplierForgatPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return apiResponse(res, 400, false, "Email is required.");
    }

    const supplier = await supplierModel.findOne({
      email,
    });

    if (!supplier) {
      return apiResponse(res, 404, false, "Supplier not found.");
    }

    const otp = await sendOtpEmail(email);

    supplier.passwordResetOTP = otp;
    supplier.passwordResetOTPExpiration = Date.now() + 600000; // 10 minutes
    await supplier.save();

    return apiResponse(res, 200, true, "OTP sent successfully!");
  } catch (error) {
    console.error("Error Forgoting Supplier Password", error);
    return apiResponse(res, 500, false, "Internal server error.");
  }
};

const supplierResetPassword = async (req: Request, res: Response) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return apiResponse(
        res,
        400,
        false,
        "Email, OTP, and new password are required"
      );
    }

    // Find the supplier by email
    const supplier = await supplierModel.findOne({ email });
    if (!supplier) {
      return apiResponse(res, 404, false, "Supplier not found");
    }

    // Verify OTP
    if (supplier.passwordResetOTP !== otp) {
      return apiResponse(res, 400, false, "Invalid OTP");
    }

    // Check OTP expiration
    if (Date.now() > supplier.passwordResetOTPExpiration) {
      return apiResponse(res, 400, false, "OTP has expired");
    }

    // Hash the new password (await the promise)
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update the supplier's password
    supplier.password = hashedPassword;

    // Clear OTP fields
    supplier.passwordResetOTP = null;
    supplier.passwordResetOTPExpiration = null;

    // Save the updated supplier document
    await supplier.save();

    return apiResponse(res, 200, true, "Supplier password reset successfully");
  } catch (error) {
    console.error("Error resetting supplier password:", error);
    return apiResponse(res, 500, false, "Internal server error.");
  }
};

const supplierLogOut = async (req: Request, res: Response) => {
  try {
    // Example of forcing the client to clear the token:
    return apiResponse(res, 200, true, "Supplier logged out successfully.");
  } catch (error) {
    console.error("Error in supplierLogOut:", error);
    return apiResponse(res, 500, false, "Internal server error.");
  }
};

export {
  registerSupplier,
  loginSupplier,
  supplierForgatPassword,
  supplierResetPassword,
  supplierLogOut,
};
