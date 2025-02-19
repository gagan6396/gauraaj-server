import { Request, Response } from "express";
import mongoose from "mongoose";
import productModel from "../models/Product.model";
import reviewModel from "../models/Review.model";
import apiResponse from "../utils/ApiResponse";

const addReview = async (req: any, res: Response) => {
  try {
    const { productId, rating, comment } = req.body;
    const userId = req?.user?.id;
    if (!mongoose.isValidObjectId(userId)) {
      return apiResponse(res, 400, false, "Invalid userId");
    }

    if (!mongoose.isValidObjectId(productId)) {
      return apiResponse(res, 400, false, "Invalid productId");
    }

    const product = await productModel.findById(productId);
    if (!product) {
      return apiResponse(res, 404, false, "Product not found");
    }

    // Create review
    const reviews = new reviewModel({
      userId,
      productId,
      rating,
      comment,
    });

    await reviews.save();

    return apiResponse(res, 200, true, "Review added successfully", reviews);
  } catch (error) {
    console.error("Error adding review: ", error);
    return apiResponse(res, 500, false, "Error adding review");
  }
};

const getAllReviwsForProduct = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;

    if (!mongoose.isValidObjectId(productId)) {
      return apiResponse(res, 400, false, "Invalid productId");
    }

    const reviews = await reviewModel
      .find({ productId })
      .populate("userId", "username email")
      .sort({ createdAt: -1 });

    if (!reviews || reviews.length === 0) {
      return apiResponse(res, 404, false, "No reviews found");
    }

    return apiResponse(res, 200, true, "Reviews fetched successfully", reviews);
  } catch (error) {
    console.error("Error fetching reviews for product", error);
    return apiResponse(res, 500, false, "Error fetching reviews for product");
  }
};

const updateReview = async (req: Request, res: Response) => {
  try {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;

    const updatedReview = await reviewModel.findByIdAndUpdate(
      reviewId,
      { $set: { rating, comment } },
      { new: true }
    );

    if (!updatedReview) {
      return apiResponse(res, 404, false, "Review not found");
    }

    return apiResponse(
      res,
      200,
      true,
      "Review updated successfully",
      updatedReview
    );
  } catch (error) {
    console.error("Error updating reviews", error);
    return apiResponse(res, 500, false, "Error updating reviews");
  }
};

const deleteReview = async (req: Request, res: Response) => {
  try {
    const { reviewId } = req.params;

    const deletedReview = await reviewModel.findByIdAndDelete(reviewId);

    if (!deletedReview) {
      return apiResponse(res, 404, false, "Review not found");
    }

    return apiResponse(res, 200, true, "Review deleted successfully");
  } catch (error) {
    console.error("Error deleting review:", error);
    return apiResponse(res, 500, false, "Error deleting review");
  }
};

const getReviewsByUser = async (req: any, res: Response) => {
  try {
    const userId = req?.user?.id;

    const reviews = await reviewModel
      .find({ userId })
      .populate("productId", "name description");

    return apiResponse(
      res,
      200,
      true,
      "User reviews fetched successfully",
      reviews
    );
  } catch (error) {
    console.error("Error fetching user reviews:", error);
    return apiResponse(res, 500, false, "Error fetching user reviews");
  }
};

export {
  addReview,
  deleteReview,
  getAllReviwsForProduct,
  getReviewsByUser,
  updateReview
};

