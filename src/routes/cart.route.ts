import express, { Router } from "express";
import {
  getUserCart,
  addProductToCart,
  updateCart,
  deleteProductFromCart,
} from "../controllers/cart.controller";
import {
  getUserCartSchema,
  addProductToCartSchema,
  updateCartSchema,
  deleteProductFromCartSchema,
  productIdParamSchema,
} from "../Schema/cart.schema";
import validateRequest from "../middlewares/validateSchema";

const cartRoute = Router();

// Define here the cart Routes
cartRoute.get(
  "/:userId",
  // validateRequest({ params: getUserCartSchema, query: getUserCartSchema }),
  getUserCart
);

cartRoute.post(
  "/:productId",
  // validateRequest({
  //   params: productIdParamSchema,
  //   body: addProductToCartSchema,
  // }),
  addProductToCart
);

cartRoute.put(
  "/:productId",
  // validateRequest({ params: productIdParamSchema, body: updateCartSchema }),
  updateCart
);
cartRoute.delete(
  "/:productId",
  // validateRequest({
  //   params: productIdParamSchema,
  //   body: deleteProductFromCartSchema,
  // }),
  deleteProductFromCart
);

export default cartRoute;
