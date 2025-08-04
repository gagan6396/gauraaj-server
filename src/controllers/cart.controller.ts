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

    const cart = await CartModel.findOne({ userId }).populate({
      path: "products.productId",
      select: "name images variants rating brand",
      populate: {
        path: "variants",
        match: { _id: { $in: "$products.variantId" } }, // Match the specific variant
        select: "name price stock sku images",
      },
    });

    if (!cart) {
      return apiResponse(res, 404, false, "Cart is empty.");
    }

    // Transform the response to include variant details directly
    const cartData = {
      ...cart.toObject(),
      products: cart.products.map((item: any) => ({
        productId: item.productId._id,
        variantId: item.variantId,
        quantity: item.quantity,
        productDetails: {
          name: item.productId.name,
          images: item.productId.images,
          rating: item.productId.rating,
          brand: item.productId.brand,
          variant: item.productId.variants.find((v: any) =>
            v._id.equals(item.variantId)
          ),
        },
      })),
    };

    return apiResponse(res, 200, true, "Cart fetched successfully.", cartData);
  } catch (error) {
    console.error("Error while fetching cart", error);
    return apiResponse(res, 500, false, "Error while fetching cart");
  }
};

const addProductToCart = async (req: any, res: Response) => {
  try {
    const userId = req?.user?.id;
    const { productId, variantId } = req?.params; // Updated to include variantId
    const { quantity } = req?.body;

    // Validate productId, variantId, and userId
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return apiResponse(res, 400, false, "Invalid product ID.");
    }
    if (!mongoose.Types.ObjectId.isValid(variantId)) {
      return apiResponse(res, 400, false, "Invalid variant ID.");
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

    // Find the variant
    const variant = product.variants.find((v: any) =>
      v._id.equals(new mongoose.Types.ObjectId(variantId))
    );
    if (!variant) {
      return apiResponse(res, 404, false, "Variant not found.");
    }

    if (variant.stock < parsedQuantity) {
      return apiResponse(
        res,
        400,
        false,
        `Not enough stock for this variant. Available: ${variant.stock}`
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

    // Check if the product with this variant is already in the cart
    const productInCart = cart.products.find(
      (item: any) =>
        item.productId.toString() === productId &&
        item.variantId.toString() === variantId
    );

    if (productInCart) {
      // Update the quantity of the product in the cart
      productInCart.quantity += parsedQuantity;

      // Check if the new quantity exceeds stock
      if (productInCart.quantity > variant.stock) {
        return apiResponse(
          res,
          400,
          false,
          `Insufficient stock. Available stock: ${variant.stock}`
        );
      }
    } else {
      // Add the product with variant to the cart
      cart.products.push({
        productId: new mongoose.Types.ObjectId(productId),
        variantId: new mongoose.Types.ObjectId(variantId),
        quantity: parsedQuantity,
      });
    }

    // Save the cart
    await cart.save();

    // Populate the updated cart for response
    const updatedCart = await CartModel.findById(cart._id).populate({
      path: "products.productId",
      select: "name images variants rating brand",
    });

    return apiResponse(
      res,
      200,
      true,
      "Product added to cart successfully.",
      updatedCart
    );
  } catch (error) {
    console.error("Error while adding product to cart:", error);
    return apiResponse(res, 500, false, "Internal Server Error");
  }
};

const updateCart = async (req: any, res: Response) => {
  try {
    const { productId, variantId } = req.params; // Updated to include variantId
    const { quantity } = req.body;
    const userId = req?.user?.id;

    // Validate inputs
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return apiResponse(res, 400, false, "Invalid product ID.");
    }
    if (!mongoose.Types.ObjectId.isValid(variantId)) {
      return apiResponse(res, 400, false, "Invalid variant ID.");
    }
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return apiResponse(res, 400, false, "Invalid user ID.");
    }

    const parsedQuantity = Number(quantity);
    if (isNaN(parsedQuantity) || parsedQuantity < 0) {
      return apiResponse(res, 400, false, "Quantity must be zero or greater.");
    }

    const cart = await CartModel.findOne({ userId });
    if (!cart) {
      return apiResponse(res, 404, false, "Cart not found.");
    }

    const productInCart = cart.products.find(
      (item: any) =>
        item.productId.toString() === productId &&
        item.variantId.toString() === variantId
    );

    if (!productInCart) {
      return apiResponse(res, 404, false, "Product variant not found in cart.");
    }

    if (parsedQuantity === 0) {
      // Remove the product variant from the cart
      cart.products = cart.products.filter(
        (item: any) =>
          !(
            item.productId.toString() === productId &&
            item.variantId.toString() === variantId
          )
      );
    } else {
      const productDetails = await productModel.findById(productId);
      if (!productDetails) {
        return apiResponse(res, 404, false, "Product not found.");
      }

      const variant = productDetails.variants.find((v: any) =>
        v._id.equals(new mongoose.Types.ObjectId(variantId))
      );
      if (!variant) {
        return apiResponse(res, 404, false, "Variant not found.");
      }

      if (variant.stock < parsedQuantity) {
        return apiResponse(
          res,
          400,
          false,
          `Insufficient stock. Available stock: ${variant.stock}`
        );
      }

      // Update the quantity in the cart
      productInCart.quantity = parsedQuantity;
    }

    await cart.save();

    // Populate the updated cart for response
    const updatedCart = await CartModel.findById(cart._id).populate({
      path: "products.productId",
      select: "name images variants rating brand",
    });

    return apiResponse(
      res,
      200,
      true,
      "Cart updated successfully.",
      updatedCart
    );
  } catch (error) {
    console.error("Error while updating cart", error);
    return apiResponse(res, 500, false, "Internal Server Error");
  }
};

const deleteProductFromCart = async (req: any, res: Response) => {
  try {
    const { productId, variantId } = req.params; // Updated to include variantId
    const userId = req?.user?.id;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return apiResponse(res, 400, false, "Invalid product ID.");
    }
    if (!mongoose.Types.ObjectId.isValid(variantId)) {
      return apiResponse(res, 400, false, "Invalid variant ID.");
    }
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return apiResponse(res, 400, false, "Invalid user ID.");
    }

    const cart = await CartModel.findOne({ userId });
    if (!cart) {
      return apiResponse(res, 404, false, "Cart not found.");
    }

    const productIndex = cart.products.findIndex(
      (item: any) =>
        item.productId.toString() === productId &&
        item.variantId.toString() === variantId
    );

    if (productIndex === -1) {
      return apiResponse(res, 404, false, "Product variant not found in cart.");
    }

    cart.products.splice(productIndex, 1);
    await cart.save();

    // Populate the updated cart for response
    const updatedCart = await CartModel.findById(cart._id).populate({
      path: "products.productId",
      select: "name images variants rating brand",
    });

    return apiResponse(
      res,
      200,
      true,
      "Product removed from cart successfully.",
      updatedCart
    );
  } catch (error) {
    console.error("Error removing product from cart", error);
    return apiResponse(res, 500, false, "Internal Server Error");
  }
};

export { addProductToCart, deleteProductFromCart, getUserCart, updateCart };

