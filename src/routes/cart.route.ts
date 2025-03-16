import { Router } from "express";
import {
  addProductToCart,
  deleteProductFromCart,
  getUserCart,
  updateCart,
} from "../controllers/cart.controller";
import authMiddleware from "../middlewares/authMiddleware";

const cartRoute = Router();

// Define here the cart Routes
cartRoute.get("/", authMiddleware, getUserCart);
cartRoute.post("/:productId/:variantId", authMiddleware, addProductToCart);
cartRoute.put("/:productId/:variantId", authMiddleware, updateCart);
cartRoute.delete("/:productId/:variantId", authMiddleware, deleteProductFromCart);

export default cartRoute;
