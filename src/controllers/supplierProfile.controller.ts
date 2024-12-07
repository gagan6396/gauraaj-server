import supplierModel from "../models/Supplier.model";
import { Response, Request } from "express";
import apiResponse from "../utils/ApiResponse";
import { redisClient } from "../config/redisClient";

// Supplier Profile managment Controller
const getSupplierProfile = async (req: Request, res: Response) => {
  try {
    const { supplierId } = req.params;

    if (!supplierId) {
      return apiResponse(res, 400, false, "Supplier ID is required");
    }

    // Check Redis cache first
    const cachedSupplierProfile = await redisClient.get(
      `supplierProfile:${supplierId}`
    );
    if (cachedSupplierProfile) {
      console.log("Returning supplier profile from cache.");
      return apiResponse(
        res,
        200,
        true,
        "Supplier profile fetched successfully (from cache)",
        JSON.parse(cachedSupplierProfile)
      );
    }

    const supplier = await supplierModel
      .findById(supplierId)
      .select("-password")
      .populate("products")
      .populate("orders")
      .exec();

    if (!supplier) {
      return apiResponse(res, 404, false, "Supplier not found");
    }

    // Cached the supplier Profile
    const cacheKey = `supplierProfile:${supplierId}`;
    await redisClient.setEx(cacheKey, 3600, JSON.stringify(supplier));

    return apiResponse(
      res,
      200,
      true,
      "Supplier profile fetched successfully",
      supplier
    );
  } catch (error) {
    console.error("Error fetching supplier profile");
    return apiResponse(res, 500, false, "Error Fetching SupplierProfile");
  }
};

const updateSupplierProfile = async (req: Request, res: Response) => {
  try {
    const { supplierId } = req.params;
    const { username, email, phone, shop_name, shop_address, imageUrls } =
      req.body;

    if (
      !username &&
      !email &&
      !phone &&
      !shop_name &&
      !shop_address &&
      !imageUrls &&
      !req.body.imageUrl
    ) {
      return apiResponse(res, 400, false, "No fields to update.");
    }

    // Find the supplier by ID
    const supplier = await supplierModel
      .findById(supplierId)
      .select("-password");
    if (!supplier) {
      return apiResponse(res, 404, false, "Supplier not found.");
    }

    // Update fields if provided
    if (username) supplier.username = username;
    if (email) supplier.email = email;
    if (phone) supplier.phone = phone;
    if (shop_name) supplier.shop_name = shop_name;
    if (shop_address) supplier.shop_address = shop_address;

    if (imageUrls && Array.isArray(imageUrls)) {
      supplier.profileImage = imageUrls.join(", "); // Join multiple image URLs if they exist
    } else if (req.body.imageUrl) {
      supplier.profileImage = req.body.imageUrl;
    }

    const updatedSupplier = await supplier.save();

    // Storing updatedProfile as Cached
    const cacheKey = `supplierProfile:${supplierId}`;
    if (!redisClient.isOpen) {
      console.log("Connecting to RedisClient...");
      redisClient.connect();
    }

    await redisClient.del(cacheKey);

    const cahceSetResult = await redisClient.setEx(
      cacheKey,
      3600,
      JSON.stringify(updatedSupplier)
    );

    if (cahceSetResult == "OK") {
      console.log("Cache Set Successfully", cacheKey);
    } else {
      console.log("Cache Set Failed", cacheKey);
    }

    return apiResponse(
      res,
      200,
      true,
      "Supplier profile updated successfully.",
      updatedSupplier
    );
  } catch (error) {
    console.error("Error updating supplier profile", error);
    return apiResponse(res, 500, false, "Error updating supplier profile.");
  }
};

export { getSupplierProfile, updateSupplierProfile };
