import bcrypt from "bcrypt";
import { Request, Response } from "express";
import adminModel from "../models/Admin.model";
import apiResponse from "../utils/ApiResponse";
import { generateToken } from "../utils/jwtHelper";

// Admin login logic

const AdminLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return apiResponse(
        res,
        400,
        false,
        "Email and Password are required fields"
      );
    }

    const admin = await adminModel.findOne({
      email,
    });

    if (!admin) {
      return apiResponse(res, 404, false, "Admin not found");
    }

    // Verify the password
    const isValidPassword = await bcrypt.compare(password, admin.password);
    if (!isValidPassword) {
      return apiResponse(res, 401, false, "Invalid password");
    }

    const token = generateToken({ _id: admin._id, role: "Admin" });

    return apiResponse(res, 200, true, "Login successfull", {
      token,
      adminId: admin._id,
    });
  } catch (error) {
    console.error("Error while logging admin", error);
    return apiResponse(res, 500, false, "Error logging admin");
  }
};

const AdminLogout = async (req: Request, res: Response) => {
  try {
    // Admin Authentication LogOut System
    return apiResponse(res, 200, true, "Logout successful.");
  } catch (error) {
    console.error("Admin logout error:", error);
    return apiResponse(res, 500, false, "An error occurred during logout.");
  }
};

export { AdminLogin, AdminLogout };
