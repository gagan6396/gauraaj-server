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
cartRoute.post("/:productId", authMiddleware, addProductToCart);
cartRoute.put("/:productId", authMiddleware, updateCart);
cartRoute.delete("/:productId", authMiddleware, deleteProductFromCart);

export default cartRoute;
