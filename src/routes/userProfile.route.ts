import { Router } from "express";
import {
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
  updateUserWishlist,
} from "../controllers/userprofile.controller";
import authMiddleware from "../middlewares/authMiddleware";

const profileRoute = Router();

// User Profile management
profileRoute.get("/profile", authMiddleware, getUserProfile);
profileRoute.patch("/profile", authMiddleware, updateUserProfile);
// User Profile Wishlist Api's
profileRoute.get("/wishlist", authMiddleware, FetchUserWishlist);
profileRoute.post("/wishlist", authMiddleware, addProductToWishlist);
profileRoute.patch("/wishlist", authMiddleware, updateUserWishlist);
profileRoute.delete(
  "/wishlist/:productId",
  authMiddleware,
  deleteProductFromWishlist
);

// User Profile Order Api's
profileRoute.get("/orders", authMiddleware, getUserOrders);
profileRoute.get("/orders/history", authMiddleware, getUserOrderHistory);

// User Profile Loyalti Points
profileRoute.get("/loyalti", authMiddleware, getUserLoyaltiPoints);
profileRoute.patch("/loyalti", authMiddleware, RedeeemLoyaltiPoints);

// User Profile Notification Fetching model
profileRoute.get("/notification", authMiddleware, FetchUserNotification);

export default profileRoute;
