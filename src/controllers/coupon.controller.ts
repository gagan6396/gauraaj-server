import { Request, Response } from "express";
import apiResponse from "../utils/ApiResponse";
import couponModel from "../models/Coupon.model";
import UserModel from "../models/User.model"; // Assuming you have a User model to manage users

// Create Coupon for Supplier
export const createSupplierCoupon = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params; 
    const couponData = req.body; 

    const user = await UserModel.findById(userId);
    if (!user || user.role !== "supplier") {
      return apiResponse(res, 403, false, "You are not authorized to create coupons");
    }

    if (!couponData.code || !couponData.discountType || !couponData.discountValue || !couponData.startDate || !couponData.expiryDate) {
      return apiResponse(res, 400, false, "Missing required fields");
    }

    couponData.supplierId = userId; 

    const coupon = await couponModel.create(couponData);

    return apiResponse(res, 201, true, "Coupon created successfully", coupon);
  } catch (error) {
    console.error("Error creating supplier coupon", error);
    return apiResponse(res, 500, false, "Error creating coupon");
  }
};
