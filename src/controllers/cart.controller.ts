import { Response } from "express";
import mongoose from "mongoose";
import CartModel from "../models/Cart.model";
import productModel from "../models/Product.model";
import apiResponse from "../utils/ApiResponse";

const getUserCart = async (req: any, res: Response) => {
  try {
    const userId = req?.user?.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return apiResponse(res, 400, false, "Invalid user ID.");
    }

    const cart = await CartModel.findOne({ userId }).populate(
      "products.productId",
      "name price images stock"
    );

    if (!cart || cart.products.length === 0) {
      return apiResponse(res, 404, false, "Cart is empty.");
    }

    return apiResponse(res, 200, true, "Cart fetched successfully.", cart);
  } catch (error) {
    console.error("Error while fetching cart", error);
    return apiResponse(res, 500, false, "Error while fetching cart");
  }
};

const addProductToCart = async (req: any, res: Response) => {
  try {
    const userId = req?.user?.id;
    const { productId } = req?.params;
    const { quantity } = req?.body;

    // Validate productId and userId
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return apiResponse(res, 400, false, "Invalid product ID.");
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return apiResponse(res, 400, false, "Invalid user ID.");
    }

    // Validate quantity
    const parsedQuantity = Number(quantity);
    if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
      return apiResponse(
        res,
        400,
        false,
        "Quantity must be a valid number greater than 0."
      );
    }

    // Fetch product details
    const product = await productModel.findById(productId);
    if (!product) {
      return apiResponse(res, 404, false, "Product not found.");
    }

    if (product.stock < parsedQuantity) {
      return apiResponse(res, 400, false, "Not enough stock for this product.");
    }

    // Check if cart exists for user
    let cart = await CartModel.findOne({ userId });

    if (!cart) {
      // Create a new cart for the user if it doesn't exist
      cart = await CartModel.create({
        userId: new mongoose.Types.ObjectId(userId),
        products: [],
      });
    }

    // Check if the product is already in the cart
    const productInCart = cart.products.find(
      (item: any) => item.productId.toString() === productId
    );

    if (productInCart) {
      // Update the quantity of the product in the cart
      productInCart.quantity += parsedQuantity;

      // Check if the new quantity exceeds stock
      if (productInCart.quantity > product.stock) {
        return apiResponse(
          res,
          400,
          false,
          `Insufficient stock. Available stock: ${product.stock}`
        );
      }
    } else {
      // Add the product to the cart if it doesn't already exist
      cart.products.push({
        productId: new mongoose.Types.ObjectId(productId),
        quantity: parsedQuantity,
      });
    }

    // Save the cart
    await cart.save();

    // Success response
    return apiResponse(
      res,
      200,
      true,
      "Product added to cart successfully.",
      cart
    );
  } catch (error) {
    console.error("Error while adding product to cart:", error);
    return apiResponse(res, 500, false, "Internal Server Error");
  }
};

const updateCart = async (req: any, res: Response) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;
    const userId = req?.user?.id;

    // Validate inputs
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return apiResponse(res, 400, false, "Invalid product ID.");
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return apiResponse(res, 400, false, "Invalid user ID.");
    }

    if (!quantity || quantity < 0) {
      return apiResponse(res, 400, false, "Quantity must be zero or greater.");
    }

    const cart = await CartModel.findOne({ userId });
    if (!cart) {
      return apiResponse(res, 404, false, "Cart not found.");
    }

    const productInCart = cart.products.find(
      (item: any) => item.productId.toString() === productId
    );

    if (!productInCart) {
      return apiResponse(res, 404, false, "Product not found in cart.");
    }

    if (quantity === 0) {
      cart.products = cart.products.filter(
        (item: any) => item.productId.toString() !== productId
      );
    } else {
      const productDetails = await productModel.findById(productId);
      if (!productDetails) {
        return apiResponse(res, 404, false, "Product not found.");
      }

      if (productDetails.stock < quantity) {
        return apiResponse(
          res,
          400,
          false,
          `Insufficient stock. Available stock: ${productDetails.stock}`
        );
      }

      // Update the quantity in the cart
      productInCart.quantity = quantity;
    }

    await cart.save();

    return apiResponse(res, 200, true, "Cart updated successfully.", cart);
  } catch (error) {
    console.error("Error while updating cart", error);
    return apiResponse(res, 500, false, "Internal Server Error");
  }
};

const deleteProductFromCart = async (req: any, res: Response) => {
  try {
    const { productId } = req.params;
    const userId = req?.user?.id;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return apiResponse(res, 400, false, "Invalid product ID.");
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return apiResponse(res, 400, false, "Invalid user ID.");
    }

    const cartExist = await CartModel.findOne({
      userId,
    });

    const productInCart = cartExist.products.find(
      (item: any) => item.productId.toString() === productId
    );

    if (productInCart == -1) {
      return apiResponse(res, 404, false, "Product not found in cart.");
    }

    cartExist.products.splice(productInCart, 1);

    await cartExist.save();

    return apiResponse(
      res,
      200,
      true,
      "Product Removed from Cart Successfully",
      cartExist
    );
  } catch (error) {
    console.error("Error Removing product from cart", error);
    return apiResponse(res, 500, false, "Internal Server Error");
  }
};

export { addProductToCart, deleteProductFromCart, getUserCart, updateCart };

