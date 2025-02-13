import { Response } from "express";
import mongoose from "mongoose";
import { redisClient } from "../config/redisClient";
import historyModel from "../models/History.model";
import LoyaltyPointModel from "../models/LoyaltyPoint.model";
import NotificationModel from "../models/Notification.model";
import orderModel from "../models/Order.model";
import profileModel from "../models/Profile.model";
import userModel from "../models/User.model";
import wishlistModel from "../models/WishList";
import apiResponse from "../utils/ApiResponse";

const getUserProfile = async (req: any, res: Response) => {
  try {
    const userId = req?.user?.id;

    if (!userId) {
      return apiResponse(res, 400, false, "Please provide a userId");
    }

    // Ensure Redis client is connected before using it
    if (!redisClient.isOpen) {
      console.log("Redis client not connected, reconnecting...");
      await redisClient.connect();
    }

    // Check if the user profile is cached
    const cacheKey = `user:profile:${userId}`;
    console.log("fetchign profile for cacheKey", cacheKey);
    const cachedProfile = await redisClient.get(cacheKey);
    // if (cachedProfile) {
    //   console.log("Serving user profile from cache");
    //   return apiResponse(
    //     res,
    //     200,
    //     true,
    //     "User profile fetched successfully (from cache)",
    //     JSON.parse(cachedProfile)
    //   );
    // }

    // Fetch user and profile from the database
    const user = await userModel.findById(userId);
    if (!user) {
      return apiResponse(res, 404, false, "User not found");
    }

    const profileExist = await profileModel.findOne({ user_id: user._id });
    if (!profileExist) {
      return apiResponse(
        res,
        404,
        false,
        "Profile not found. Please create one."
      );
    }

    // Combine user and profile data
    const userProfile = {
      id: profileExist._id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      profileImage: profileExist.profileImage || "",
      shoppingAddress: profileExist.shoppingAddress || [],
      orderList: profileExist.orderList || [],
      wishList: profileExist.wishList || [],
      profileExist,
    };

    // Cache the user profile for 1 hour (3600 seconds)
    const cacheResult = await redisClient.setEx(
      cacheKey,
      3600,
      JSON.stringify(userProfile)
    );
    if (cacheResult === "OK") {
      console.log("User profile cached successfully");
    }

    return apiResponse(
      res,
      200,
      true,
      "User profile fetched successfully",
      userProfile
    );
  } catch (error) {
    console.error("Error while fetching user profile", error);
    return apiResponse(res, 500, false, "Internal server error");
  }
};

// UpdateUserProfile
const updateUserProfile = async (req: any, res: Response) => {
  try {
    const userId = req?.user?.id;
    if (!userId) {
      return apiResponse(res, 400, false, "Please provide a userId");
    }

    const {
      first_name,
      last_name,
      email,
      phone,
      profileImage,
      shoppingAddress,
    } = req.body;

    // Fetch user and profile
    const userExist = await userModel.findById(userId);
    if (!userExist) {
      return apiResponse(res, 404, false, "User not found");
    }

    const profileExist = await profileModel.findOne({ user_id: userExist._id });
    if (!profileExist) {
      return apiResponse(res, 404, false, "Profile not found");
    }

    // Update user data
    if (first_name) userExist.first_name = first_name;
    if (last_name) userExist.last_name = last_name;
    if (email) userExist.email = email;
    if (phone) userExist.phone = phone;

    // Update profile data
    if (profileImage) profileExist.profileImage = profileImage;
    if (shoppingAddress) {
      profileExist.shoppingAddress = {
        ...profileExist.shoppingAddress,
        ...shoppingAddress,
      };
    }

    // Save changes to the database
    await userExist.save();
    await profileExist.save();

    // Prepare updated profile data
    const updatedUserProfile = {
      first_name: userExist.first_name,
      last_name: userExist.last_name,
      email: userExist.email,
      phone: userExist.phone,
      role: userExist.role,
      profileImage: profileExist.profileImage || "",
      shoppingAddress: profileExist.shoppingAddress || {},
      orderList: profileExist.orderList || [],
      wishList: profileExist.wishList || [],
    };

    // Update Redis cache
    const cacheKey = `user:profile:${userId}`;
    if (!redisClient.isOpen) {
      console.log("Redis client not open, reconnecting...");
      await redisClient.connect();
    }

    await redisClient.del(cacheKey);

    const cacheSetResult = await redisClient.setEx(
      cacheKey,
      3600,
      JSON.stringify(updatedUserProfile)
    );

    if (cacheSetResult === "OK") {
      console.log("Cache updated successfully for key:", cacheKey);
    } else {
      console.error("Failed to update cache for key:", cacheKey);
    }

    return apiResponse(
      res,
      200,
      true,
      "User profile updated successfully",
      updatedUserProfile
    );
  } catch (error) {
    console.error("Error while updating user profile", error);
    return apiResponse(res, 500, false, "Internal server error");
  }
};

// User Profile Wishlist Fetch Api'
const FetchUserWishlist = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return apiResponse(res, 404, false, "Invalid user id");
    }

    const userExist = await userModel.findById({
      _id: userId,
    });

    if (!userExist) {
      return apiResponse(res, 404, false, "User not found");
    }

    const wishlistForUser = await wishlistModel
      .findOne({
        user_id: userExist._id,
      })
      .populate("product_id");

    if (!wishlistForUser && wishlistForUser.length === 0) {
      return apiResponse(res, 404, false, "Wishlist not found");
    }

    return apiResponse(
      res,
      200,
      true,
      "Wishlist Fetched Successfully!",
      wishlistForUser
    );
  } catch (error) {
    console.error("Error while Fetching Wishlist", error);
    return apiResponse(res, 500, false, "Internal server error");
  }
};

const addProductToWishlist = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { productId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return apiResponse(res, 404, false, "Invalid user ID");
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return apiResponse(res, 404, false, "Invalid product ID");
    }

    const user = await userModel.findById(userId);
    if (!user) {
      return apiResponse(res, 404, false, "User not found");
    }

    let wishlist = await wishlistModel.findOne({ user_id: userId });

    if (!wishlist) {
      wishlist = new wishlistModel({
        user_id: userId,
        product_id: [], // Note: This matches your schema
      });
    }

    if (!Array.isArray(wishlist.product_id)) {
      wishlist.product_id = [];
    }

    const isProductInWishlist = wishlist.product_id.some(
      (product: mongoose.Types.ObjectId) =>
        product.toString() === productId.toString()
    );

    if (isProductInWishlist) {
      return apiResponse(res, 400, false, "Product already in wishlist");
    }

    wishlist.product_id.push(new mongoose.Types.ObjectId(productId));

    await wishlist.save();

    return apiResponse(res, 200, true, "Product added to wishlist", wishlist);
  } catch (error) {
    console.error("Error adding product to wishlist:", error);
    return apiResponse(res, 500, false, "Internal server error");
  }
};

const updateUserWishlist = async (req: any, res: Response) => {
  try {
    const userId = req?.user?.id;
    const { productIds } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return apiResponse(res, 404, false, "Invalid user id");
    }

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return apiResponse(
        res,
        400,
        false,
        "Product IDs must be a non-empty array"
      );
    }

    const userExist = await userModel.findById(userId);
    if (!userExist) {
      return apiResponse(res, 404, false, "User not found");
    }

    let wishlist = await wishlistModel.findOne({
      user_id: userExist._id,
    });

    if (wishlist) {
      const updatedProductIds = [
        ...new Set([
          ...wishlist.product_id,
          ...productIds.map((id) => new mongoose.Types.ObjectId(id)),
        ]),
      ]; // Ensures no duplicates
      wishlist.product_id = updatedProductIds;
      wishlist = await wishlist.save();
    } else {
      wishlist = await wishlistModel.create({
        user_id: userExist._id,
        product_id: productIds.map((id) => new mongoose.Types.ObjectId(id)),
      });
    }

    return apiResponse(
      res,
      200,
      true,
      "Wishlist updated successfully",
      wishlist
    );
  } catch (error) {
    console.error("Error while updating wishlist", error);
    return apiResponse(res, 500, false, "Internal server error");
  }
};

// delete product from wishlist
const deleteProductFromWishlist = async (req: any, res: Response) => {
  try {
    const { productId } = req.params;
    const userId = req?.user?.id;
    if (
      !mongoose.Types.ObjectId.isValid(userId) ||
      !mongoose.Types.ObjectId.isValid(productId)
    ) {
      return apiResponse(res, 400, false, "Invalid user or product ID");
    }

    const userExist = await userModel.findById(userId);
    if (!userExist) {
      return apiResponse(res, 404, false, "User not found");
    }

    const wishList = await wishlistModel.findOne({
      user_id: userExist._id,
    });

    if (!wishList) {
      return apiResponse(res, 404, false, "Wishlist not found");
    }

    const updatedProductIds = wishList.product_id.filter(
      (id: mongoose.Types.ObjectId) => id.toString() !== productId
    );

    if (updatedProductIds.length === wishList.product_id.length) {
      return apiResponse(res, 404, false, "Product not found in wishlist");
    }

    wishList.product_id = updatedProductIds;
    await wishList.save();

    return apiResponse(
      res,
      200,
      true,
      "Product removed from wishlist!",
      wishList
    );
  } catch (error) {
    console.error("Error while removing product from wishlist", error);
    return apiResponse(res, 500, false, "Internal server error");
  }
};

// get user's current order
const getUserOrders = async (req: any, res: Response) => {
  try {
    const userId = req?.user?.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return apiResponse(res, 400, false, "Invalid user ID");
    }

    const userExist = await userModel.findById(userId);
    if (!userExist) {
      return apiResponse(res, 404, false, "User not found");
    }

    const UserOrders = await orderModel
      .find({
        user_id: userExist._id,
      })
      .sort({ createdAt: -1 });

    if (UserOrders.length === 0) {
      return apiResponse(res, 404, false, "No orders found");
    }

    return apiResponse(res, 200, true, "Orders Fetch Succesfully", {
      orders: UserOrders,
    });
  } catch (error) {
    console.error("Error while fetching user orders", error);
    return apiResponse(res, 500, false, "Internal server error");
  }
};

// Get the user orderHistory
const getUserOrderHistory = async (req: any, res: Response) => {
  try {
    const userId = req?.user?.id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return apiResponse(res, 400, false, "Invalid user ID");
    }

    const orderHistory = await historyModel
      .findOne({
        user_id: userId,
      })
      .sort({
        createdAt: -1,
      });

    if (!orderHistory) {
      return apiResponse(res, 404, false, "No order history found");
    }

    return apiResponse(
      res,
      200,
      true,
      "Order Histort Fetched Succesfully!",
      orderHistory
    );
  } catch (error) {
    console.error("Error while Fetching OrderHistory", error);
    return apiResponse(res, 500, false, "Internal server error");
  }
};

// get userLoyaltiPoints
const getUserLoyaltiPoints = async (req: any, res: Response) => {
  try {
    const userId = req?.user?.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return apiResponse(res, 400, false, "Invalid user ID");
    }

    const loyaltiData = await LoyaltyPointModel.findOne({
      user_id: userId,
    });

    if (!loyaltiData) {
      return apiResponse(
        res,
        404,
        false,
        "No loyalty points found for this user"
      );
    }

    return apiResponse(
      res,
      200,
      true,
      "Loyalti Points Fetched Succesfully",
      loyaltiData
    );
  } catch (error) {
    console.error("Error while fetching user loyalty points", error);
    return apiResponse(res, 500, false, "Internal Server Error");
  }
};

// Redeem loyalti Points
const RedeeemLoyaltiPoints = async (req: any, res: Response) => {
  try {
    const userId = req?.user?.id;
    const { PointsToRedeem, description } = req.body;

    // Data Validation

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return apiResponse(res, 400, false, "Invalid user ID");
    }

    if (typeof PointsToRedeem !== "number" || PointsToRedeem <= 0) {
      return apiResponse(res, 400, false, "Invalid points to redeem");
    }

    if (!description || typeof description !== "string") {
      return apiResponse(res, 400, false, "Invalid description");
    }

    const loyaltiData = await LoyaltyPointModel.findOne({
      user_id: userId,
    });

    if (loyaltiData.totalPoints < PointsToRedeem) {
      return apiResponse(res, 400, false, "Insufficient loyalti points");
    }

    // update the loyalti points
    loyaltiData.totalPoints -= PointsToRedeem;
    loyaltiData.pointsHistory.push({
      transactionType: "Redeemed",
      points: PointsToRedeem,
      description,
      date: new Date(),
    });

    await loyaltiData.save();

    return apiResponse(
      res,
      200,
      true,
      "Loyalti Points Updated Succesfully!",
      loyaltiData
    );
  } catch (error) {
    console.error("Error while Redeeming loyalti points", error);
    return apiResponse(res, 500, false, "Internal Server Error");
  }
};

// Fetch the notifiction for User
const FetchUserNotification = async (req: any, res: Response) => {
  try {
    const userId = req?.user?.id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return apiResponse(res, 400, false, "Invalid user ID");
    }

    const notificaiton = await NotificationModel.findOne({
      user_id: userId,
    }).sort({
      createdAt: -1,
    });

    if (!notificaiton || notificaiton.length === 0) {
      return apiResponse(
        res,
        404,
        false,
        "No notifications found for this user"
      );
    }

    return apiResponse(
      res,
      200,
      true,
      "Notification Fetched Succesfully",
      notificaiton
    );
  } catch (error) {
    console.error("Error fetching notificaiton for user", error);
    return apiResponse(res, 500, false, "Internal Server Error");
  }
};

export {
  addProductToWishlist,
  deleteProductFromWishlist,
  FetchUserNotification,
  FetchUserWishlist,
  getUserLoyaltiPoints,
  getUserOrderHistory,
  getUserOrders,
  getUserProfile,
  RedeeemLoyaltiPoints,
  updateUserProfile,
  updateUserWishlist
};

