import { Response } from "express";
import mongoose from "mongoose";
import CartModel from "../models/Cart.model";
import productModel from "../models/Product.model";
import apiResponse from "../utils/ApiResponse";

const getUserCart = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;

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
    const { productId } = req.params;
    const { quantity, skuParameters } = req.body;
    const userId = req.user.id;

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

    // Validate SKU parameters
    if (skuParameters) {
      const skuParams = product.skuParameters || {};
      for (const [param, value] of Object.entries(skuParameters)) {
        if (!skuParams.has(param) || !skuParams.get(param).includes(value)) {
          return apiResponse(
            res,
            400,
            false,
            `Invalid value for ${param}: ${value}`
          );
        }
      }
    }

    // Check stock based on SKU parameters
    // This assumes that `product.skuParameters` has stock management for variants.
    const selectedVariant = `${product.sku}-${JSON.stringify(skuParameters)}`;
    if (
      !product.stock[selectedVariant] ||
      product.stock[selectedVariant] < parsedQuantity
    ) {
      return apiResponse(
        res,
        400,
        false,
        `Not enough stock for the selected variant.`
      );
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

    // Check if the product with specific SKU parameters is already in the cart
    const productInCart = cart.products.find(
      (item: any) =>
        item.productId.toString() === productId &&
        JSON.stringify(item.skuParameters) === JSON.stringify(skuParameters)
    );

    if (productInCart) {
      // Update the quantity of the product in the cart
      productInCart.quantity += parsedQuantity;

      // Check if the new quantity exceeds stock
      if (productInCart.quantity > product.stock[selectedVariant]) {
        return apiResponse(
          res,
          400,
          false,
          `Insufficient stock for the selected variant. Available stock: ${product.stock[selectedVariant]}`
        );
      }
    } else {
      // Add the product with SKU parameters to the cart if it doesn't already exist
      cart.products.push({
        productId: new mongoose.Types.ObjectId(productId),
        quantity: parsedQuantity,
        skuParameters: skuParameters,
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
    const { quantity, skuParameters } = req.body;
    const userId = req.user.id;

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

    // Validate SKU parameters
    if (!skuParameters || typeof skuParameters !== "object") {
      return apiResponse(res, 400, false, "Invalid SKU parameters.");
    }

    // Retrieve the cart for the user
    const cart = await CartModel.findOne({ userId });
    if (!cart) {
      return apiResponse(res, 404, false, "Cart not found.");
    }

    // Check if the product already exists in the cart
    let productInCart = cart.products.find(
      (item: any) =>
        item.productId.toString() === productId &&
        JSON.stringify(item.skuParameters) === JSON.stringify(skuParameters)
    );

    // If product with SKU parameters not found, check if SKU is changing
    if (!productInCart) {
      // If SKU parameters are different, we need to remove the old one and add the new one
      const oldProductInCart = cart.products.find(
        (item: any) => item.productId.toString() === productId
      );

      // If an old product is found, remove it and treat the new SKU as a different variant
      if (oldProductInCart) {
        cart.products = cart.products.filter(
          (item: any) =>
            item.productId.toString() !== productId ||
            JSON.stringify(item.skuParameters) !==
              JSON.stringify(oldProductInCart.skuParameters)
        );
      }

      // Add the new SKU product to the cart
      productInCart = {
        productId,
        quantity,
        skuParameters,
      };
      cart.products.push(productInCart);
    }

    // Fetch product details to check stock
    const productDetails = await productModel.findById(productId);
    if (!productDetails) {
      return apiResponse(res, 404, false, "Product not found.");
    }

    // Check if stock is available for the updated SKU (if SKU is changed or quantity is updated)
    const availableStock = productDetails.skus?.[JSON.stringify(skuParameters)];
    if (!availableStock || availableStock < quantity) {
      return apiResponse(
        res,
        400,
        false,
        `Insufficient stock for the selected SKU. Available stock: ${availableStock}`
      );
    }

    // Update the quantity if it's an existing SKU
    if (productInCart) {
      if (quantity === 0) {
        // If quantity is 0, remove the product
        cart.products = cart.products.filter(
          (item: any) =>
            !(
              item.productId.toString() === productId &&
              JSON.stringify(item.skuParameters) ===
                JSON.stringify(skuParameters)
            )
        );
      } else {
        // Update the quantity for the product in the cart
        productInCart.quantity = quantity;
      }
    }

    // Save the updated cart
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
    const userId = req.user.id;

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

