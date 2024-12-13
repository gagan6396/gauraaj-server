import mongoose from "mongoose";
import userModel from "../models/User.model";
import apiResponse from "../utils/ApiResponse";
import { Response, Request } from "express";

// Fetch all users
const getAllUserByAdmin = async (req: Request, res: Response) => {
  try {
    const users = await userModel.find({}).select("-password"); // exclude the password
    if (!users || users.length === 0) {
      return apiResponse(res, 400, false, "users not there");
    }

    return apiResponse(res, 200, true, "Succesfully fetched all users", users);
  } catch (error) {
    console.error("Error fetching all users", error);
    return apiResponse(res, 500, false, "Internal Server Error");
  }
};

const updateUserProfile = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    if (!userId) {
      return apiResponse(res, 400, false, "UserId is required");
    }

    const updatedUser = await userModel
      .findByIdAndUpdate(
        userId,
        { $set: updates },
        { new: true, runValidators: true }
      )
      .select("-password");

    if (!updatedUser) {
      return apiResponse(res, 400, false, "User not found");
    }

    return apiResponse(
      res,
      200,
      true,
      "User updated successfully",
      updatedUser
    );
  } catch (error) {
    console.error("Error updating user's by admin", error);
    return apiResponse(res, 400, false, "Error updating users by admin");
  }
};

const deleteUserByAdmin = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return apiResponse(res, 400, false, "UserId is required");
    }

    // Find and delete the user
    const deletedUser = await userModel.findByIdAndDelete(userId);

    if (!deletedUser) {
      return apiResponse(res, 404, false, "User not found");
    }

    return apiResponse(res, 200, true, "User deleted successfully", {
      userId: deletedUser._id,
      username: deletedUser.username,
      email: deletedUser.email,
    });
  } catch (error) {
    console.error("Error deleting user by admin", error);
    return apiResponse(res, 500, false, "Error deleting user by admin");
  }
};

export { getAllUserByAdmin, updateUserProfile , deleteUserByAdmin};
