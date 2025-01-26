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
profileRoute.get(
  "/:userId/profile",
  authMiddleware,
  // validateRequest({ params: userIdParamSchema }),
  getUserProfile
);
profileRoute.patch(
  "/:userId/profile",
  authMiddleware,
  // validateRequest({ params: userIdParamSchema, body: profileUpdateSchema }),
  updateUserProfile
);

// User Profile Wishlist Api's
profileRoute.get(
  "/:userId/wishlist",
  authMiddleware,
  // validateRequest({ params: userIdParamSchema }),
  FetchUserWishlist
);
profileRoute.post(
  "/:userId/wishlist",
  authMiddleware,
  // validateRequest({ params: userIdParamSchema, body: wishlishAddSchema }),
  addProductToWishlist
);
profileRoute.patch(
  "/:userId/wishlist",
  authMiddleware,
  // validateRequest({ params: userIdParamSchema, body: wishlistUpdateSchema }),
  updateUserWishlist
);
profileRoute.delete(
  "/:userId/wishlist/:productId",
  authMiddleware,
  deleteProductFromWishlist
);

// User Profile Order Api's
profileRoute.get(
  "/:userId/orders",
  authMiddleware,
  // validateRequest({ params: userIdParamSchema }),
  getUserOrders
);

profileRoute.get(
  "/:userId/orders/history",
  authMiddleware,
  // validateRequest({ params: userIdParamSchema }),
  getUserOrderHistory
);

// User Profile Loyalti Points
profileRoute.get(
  "/:userId/loyalti",
  authMiddleware,
  // validateRequest({ params: userIdParamSchema }),
  getUserLoyaltiPoints
);
profileRoute.patch(
  "/:userId/loyalti",
  authMiddleware,
  // validateRequest({ params: userIdParamSchema }),
  RedeeemLoyaltiPoints
);

// User Profile Notification Fetching model
profileRoute.get(
  "/:userId/notification",
  authMiddleware,
  // validateRequest({ params: userIdParamSchema }),
  FetchUserNotification
);

export default profileRoute;
