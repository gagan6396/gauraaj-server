import { Request, Response } from "express";
import mongoose from "mongoose";
import productModel from "../models/Product.model";
import apiResponse from "../utils/ApiResponse";

const getAllProducts = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Fetch all products with necessary fields
    const products = await productModel
      .find(
        {}, // Fetch all products without filtering
        {
          supplier_id: 1,
          category_id: 1,
          subcategory_id: 1,
          name: 1,
          description: 1,
          price: 1,
          stock: 1,
          skuParameters: 1,
          images: 1,
          rating: 1,
          color: 1,
          size: 1,
          brand: 1,
          sku: 1,
          createdAt: 1,
        }
      )
      .populate({
        path: "supplier_id",
        select: "shop_name shop_address email phone",
      })
      .populate({
        path: "category_id",
        select: "name description image slug",
      })
      .populate({
        path: "subcategory_id",
        select: "name description image slug",
      })
      .populate({
        path: "reviews",
        select: "rating comment user_id",
      })
      .skip(skip)
      // .limit(limit);

    // Count total number of products for pagination
    const totalProducts = await productModel.countDocuments();

    // Calculate total pages
    const totalPages = Math.ceil(totalProducts / limit);

    if (!products.length) {
      return apiResponse(res, 404, false, "No products found");
    }

    return apiResponse(res, 200, true, "Products fetched successfully", {
      products,
      pagination: {
        totalProducts,
        totalPages,
        currentPage: page,
        productsPerPage: limit,
      },
    });
  } catch (error) {
    console.error("Error while fetching all products", error);
    return apiResponse(res, 500, false, "Internal server error");
  }
};

const getProductById = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;

    if (!productId) {
      return apiResponse(res, 400, false, "ProductId is Required");
    }

    // Use .lean() to get a plain object
    const product = await productModel
      .findById(productId, {
        supplier_id: 1,
        category_id: 1,
        subcategory_id: 1,
        name: 1,
        description: 1,
        price: 1,
        stock: 1,
        skuParameters: 1,
        images: 1,
        rating: 1,
        color: 1,
        size: 1,
        brand: 1,
        sku: 1,
        createdAt: 1,
      })
      .populate({
        path: "supplier_id",
        select: "username email shop_name shop_address",
      })
      .populate({
        path: "category_id",
        select: "name description image slug",
      })
      .populate({
        path: "subcategory_id",
        select: "name description image slug",
      })
      .populate({
        path: "reviews",
        select: "rating comment user_id", // Limit review fields
      })
      .lean();

    if (!product) {
      return apiResponse(res, 404, false, "Product not found");
    }

    return apiResponse(
      res,
      200,
      true,
      `Product fetched successfully: ${productId}`,
      product
    );
  } catch (error) {
    console.error("Error while fetching product by id", error);
    return apiResponse(res, 500, false, "Internal Server Error");
  }
};

const searchProduct = async (req: Request, res: Response) => {
  try {
    const { searchTerm } = req.params;

    // Validate searchTerm
    if (!searchTerm || searchTerm.trim().length === 0) {
      return apiResponse(res, 400, false, "Search term is required");
    }

    // Perform the search query for name, description, color, and brand fields
    const products = await productModel
      .find({
        $or: [
          { name: { $regex: searchTerm.trim(), $options: "i" } },
          { description: { $regex: searchTerm.trim(), $options: "i" } },
          { "color.name": { $regex: searchTerm.trim(), $options: "i" } },
          { brand: { $regex: searchTerm.trim(), $options: "i" } },
        ],
      })
      .populate({
        path: "category_id",
        select: "name description image slug",
      })
      .populate({
        path: "subcategory_id",
        select: "name description image slug",
      })
      .populate({
        path: "supplier_id",
        select: "shop_name",
      });

    // Handle no results
    if (products.length === 0) {
      return apiResponse(res, 404, false, "No products found");
    }

    // Success response
    return apiResponse(res, 200, true, "Products fetched successfully!", {
      products,
    });
  } catch (error) {
    // Log error for debugging
    console.error("Error while searching products:", error);

    // Internal server error response
    return apiResponse(res, 500, false, "Internal server error");
  }
};

const filterProduct = async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.params;
    const {
      minPrice,
      maxPrice,
      inStock,
      supplierId,
      rating,
      subcategoryId,
      color,
      sortBy,
      sortOrder,
      page = 1,
      limit = 10,
    } = req.query;

    const filter: Record<string, any> = {};

    // Filter by category with ObjectId validation
    if (
      categoryId &&
      typeof categoryId === "string" &&
      mongoose.Types.ObjectId.isValid(categoryId)
    ) {
      filter.category_id = new mongoose.Types.ObjectId(categoryId); // Cast to ObjectId
    } else if (categoryId) {
      return apiResponse(res, 400, false, "Invalid categoryId format");
    }

    // Filter by subcategory with ObjectId validation
    if (
      subcategoryId &&
      typeof subcategoryId === "string" &&
      mongoose.Types.ObjectId.isValid(subcategoryId)
    ) {
      filter.subcategory_id = new mongoose.Types.ObjectId(subcategoryId); // Cast to ObjectId
    } else if (subcategoryId) {
      return apiResponse(res, 400, false, "Invalid subcategoryId format");
    }

    // Filter by price range
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice as string);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice as string);
    }

    // Filter by stock availability
    if (inStock === "true") {
      filter.stock = { $gt: 0 };
    }

    // Filter by supplier ID with ObjectId validation
    if (
      supplierId &&
      typeof supplierId === "string" &&
      mongoose.Types.ObjectId.isValid(supplierId)
    ) {
      filter.supplier_id = new mongoose.Types.ObjectId(supplierId); // Cast to ObjectId
    } else if (supplierId) {
      return apiResponse(res, 400, false, "Invalid supplierId format");
    }

    // Filter by rating
    if (rating) {
      filter.rating = { $gte: parseFloat(rating as string) };
    }

    // Filter by color (e.g., 'Red', 'Blue')
    if (color) {
      filter["color.name"] = { $regex: color as string, $options: "i" };
    }

    const pageNumber = parseInt(page as string);
    const pageSize = parseInt(limit as string);
    const skip = (pageNumber - 1) * pageSize;

    const sortCriteria: Record<string, any> = {};
    if (sortBy && sortOrder) {
      sortCriteria[sortBy as string] = sortOrder === "desc" ? -1 : 1;
    } else {
      sortCriteria.createdAt = -1;
    }

    const products = await productModel
      .find(filter)
      .populate({
        path: "supplier_id",
        select: "shop_name shop_address email phone",
      })
      .populate({
        path: "category_id",
        select: "name description image slug",
      })
      .populate({
        path: "subcategory_id",
        select: "name description image slug",
      })
      .populate({
        path: "reviews",
        select: "rating comment user_id",
      })
      .sort(sortCriteria)
      .skip(skip)
      .limit(pageSize);

    const totalProducts = await productModel.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / pageSize);

    // Return response if no products are found
    if (!products || products.length === 0) {
      return apiResponse(res, 404, false, "No products found");
    }

    // Return the filtered products with pagination data
    return apiResponse(
      res,
      200,
      true,
      "Filtered Products Fetched Successfully!",
      {
        products,
        pagination: {
          totalProducts,
          totalPages,
          currentPage: pageNumber,
          productsPerPage: pageSize,
        },
      }
    );
  } catch (error) {
    console.error("Error filtering products", error);
    return apiResponse(res, 500, false, "Internal server error");
  }
};

export { filterProduct, getAllProducts, getProductById, searchProduct };

