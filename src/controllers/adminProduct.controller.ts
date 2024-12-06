import { Request, Response } from "express";
import productModel from "../models/Product.model";
import categoryModel from "../models/Category.model";
import apiResponse from "../utils/ApiResponse";
import mongoose from "mongoose";

// View All Products
export const getAllProducts = async (req: Request, res: Response) => {
  try {
    const products = await productModel
      .find()
      .populate("supplier_id", "shop_name username")
      .populate("category_id", "name");

    if (!products || products.length === 0) {
      return apiResponse(res, 404, false, "No products found");
    }

    return apiResponse(
      res,
      200,
      true,
      "Products fetched successfully",
      products
    );
  } catch (error) {
    console.error("Error fetching products:", error);
    return apiResponse(res, 500, false, "Error fetching products");
  }
};

// Add New Product
export const addNewProduct = async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      price,
      stock,
      images,
      supplier_id,
      category_id,
    } = req.body;

    const category = await categoryModel.findById(category_id);
    if (!category) {
      return apiResponse(res, 400, false, "Category not found");
    }

    const newProduct = new productModel({
      name,
      description,
      price,
      stock,
      images,
      supplier_id,
      category_id,
    });

    await newProduct.save();
    return apiResponse(
      res,
      201,
      true,
      "Product added successfully",
      newProduct
    );
  } catch (error) {
    console.error("Error adding new product:", error);
    return apiResponse(res, 500, false, "Error adding new product");
  }
};

// Update Product Details
export const updateProductById = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { stock } = req.body; // Get the stock to be added

    // Ensure the stock is a valid number
    if (typeof stock !== "number" || stock <= 0) {
      return apiResponse(res, 400, false, "Invalid stock value provided");
    }

    // Update the product by incrementing the stock
    const updatedProduct = await productModel.findByIdAndUpdate(
      productId,
      { $inc: { stock } }, // Add the stock to the current stock value
      { new: true }
    );

    if (!updatedProduct) {
      return apiResponse(res, 404, false, "Product not found");
    }

    return apiResponse(
      res,
      200,
      true,
      "Product stock updated successfully",
      updatedProduct
    );
  } catch (error) {
    console.error("Error updating product stock:", error);
    return apiResponse(res, 500, false, "Error updating product stock");
  }
};

// Delete Product
export const deleteProductById = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;

    if (!mongoose.isValidObjectId(productId)) {
      return apiResponse(res, 400, false, "Invalid product ID");
    };
    
    const deletedProduct = await productModel.findByIdAndDelete(productId);

    if (!deletedProduct) {
      return apiResponse(res, 404, false, "Product not found");
    }

    return apiResponse(res, 200, true, "Product deleted successfully");
  } catch (error) {
    console.error("Error deleting product:", error);
    return apiResponse(res, 500, false, "Error deleting product");
  }
};
