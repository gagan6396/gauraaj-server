import { Response } from "express";
import CartModel from "../models/Cart.model";
import couponModel from "../models/Coupon.model";
import apiResponse from "../utils/ApiResponse";

export const validateCart = async (req: any, res: Response) => {
  try {
    const userId = req?.user?.id;

    const cart = await CartModel.findOne({ userId }).populate(
      "products.productId"
    );
    if (!cart || cart.products.length === 0) {
      return apiResponse(res, 400, false, "Cart is empty");
    }

    // Check if all products in cart are in stock
    const outOfStockItems = cart.products.filter((item: any) => {
      const product = item.productId as any;
      return product.stock < item.quantity;
    });

    if (outOfStockItems.length > 0) {
      return apiResponse(
        res,
        400,
        false,
        "Some items are out of stock",
        outOfStockItems
      );
    }

    return apiResponse(res, 200, true, "Cart is valid", cart);
  } catch (error) {
    console.error("Error validating cart", error);
    return apiResponse(res, 500, false, "Error validating cart");
  }
};

export const applyCoupon = async (req: any, res: Response) => {
  try {
    const { code } = req.body;
    const userId = req?.user?.id;

    const coupon = await couponModel.findOne({ code, isActive: true });
    if (!coupon) {
      return apiResponse(res, 400, false, "Invalid or inactive coupon");
    }

    if (new Date() > coupon.expiryDate) {
      return apiResponse(res, 400, false, "Coupon has expired");
    }

    const cart = await CartModel.findOne({ userId }).populate(
      "products.productId"
    );
    if (!cart) {
      return apiResponse(res, 400, false, "Cart is empty");
    }

    const cartTotal = cart.products.reduce((total: any, item: any) => {
      const product = item.productId as any;
      return total + product.price * item.quantity;
    }, 0);

    if (coupon.minOrderValue && cartTotal < coupon.minOrderValue) {
      return apiResponse(
        res,
        400,
        false,
        `Cart total must be at least ${coupon.minOrderValue}`
      );
    }

    let discount = 0;
    if (coupon.discountType === "percentage") {
      discount = (cartTotal * coupon.discountValue) / 100;
      if (coupon.maxDiscountValue) {
        discount = Math.min(discount, coupon.maxDiscountValue);
      }
    } else {
      discount = coupon.discountValue;
    }

    const finalTotal = cartTotal - discount;

    return apiResponse(res, 200, true, "Coupon applied successfully", {
      cartTotal,
      discount,
      finalTotal,
    });
  } catch (error) {
    console.error("Error applying coupon", error);
    return apiResponse(res, 500, false, "Error applying coupon");
  }
};

export const reviewOrder = async (req: any, res: Response) => {
  try {
    const userId = req?.user?.id;

    const cart = await CartModel.findOne({ userId }).populate(
      "products.productId"
    );
    if (!cart) {
      return apiResponse(res, 400, false, "Cart is empty");
    }

    const cartTotal = cart.products.reduce((total: any, item: any) => {
      const product = item.productId as any;
      return total + product.price * item.quantity;
    }, 0);

    const shippingOption = req.query.shippingOption || "standard";
    const shippingCost = shippingOption === "express" ? 10 : 5;

    const orderSummary = {
      items: cart.products,
      cartTotal,
      shippingOption,
      shippingCost,
      total: cartTotal + shippingCost,
    };

    return apiResponse(
      res,
      200,
      true,
      "Order reviewed successfully",
      orderSummary
    );
  } catch (error) {
    console.error("Error reviewing order", error);
    return apiResponse(res, 500, false, "Error reviewing order");
  }
};
