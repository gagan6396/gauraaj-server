import { Request, Response } from "express";
import mongoose from "mongoose";
import publicReviewModel from "../models/PublicReview.model";
import apiResponse from "../utils/ApiResponse";

// Create a new review
export const publicCreateReview = async (req: Request, res: Response) => {
  try {
    const { comment } = req.body;

    if (!comment) {
      return apiResponse(res, 400, false, "Comment is required");
    }

    const newReview = new publicReviewModel({
      comment,
      profile: req.body.imageUrl || req.body.imageUrls[0] || "", // Optional profile photo URL
    });

    const savedReview = await newReview.save();
    return apiResponse(
      res,
      201,
      true,
      "Review created successfully",
      savedReview
    );
  } catch (error) {
    console.error("Error creating review:", error);
    return apiResponse(res, 500, false, "Internal Server Error");
  }
};

// Get all reviews
export const getAllPublicReviews = async (req: Request, res: Response) => {
  try {
    const reviews = await publicReviewModel.find().sort({ createdAt: -1 });
    return apiResponse(
      res,
      200,
      true,
      "Reviews retrieved successfully",
      reviews
    );
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return apiResponse(res, 500, false, "Internal Server Error");
  }
};

// Get a single review
export const getPublicReviewById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return apiResponse(res, 400, false, "Invalid review ID");
    }

    const review = await publicReviewModel.findById(id);
    if (!review) {
      return apiResponse(res, 404, false, "Review not found");
    }

    return apiResponse(res, 200, true, "Review retrieved successfully", review);
  } catch (error) {
    console.error("Error fetching review:", error);
    return apiResponse(res, 500, false, "Internal Server Error");
  }
};

// Update a review
export const updatePublicReview = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return apiResponse(res, 400, false, "Invalid review ID");
    }

    const review = await publicReviewModel.findById(id);
    if (!review) {
      return apiResponse(res, 404, false, "Review not found");
    }

    review.comment = comment || review.comment;
    review.profile =
      req.body.imageUrls[0] !== undefined
        ? req.body.imageUrls[0]
        : review.profile;

    const updatedReview = await review.save();
    return apiResponse(
      res,
      200,
      true,
      "Review updated successfully",
      updatedReview
    );
  } catch (error) {
    console.error("Error updating review:", error);
    return apiResponse(res, 500, false, "Internal Server Error");
  }
};

// Delete a review
export const deletePublicReview = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return apiResponse(res, 400, false, "Invalid review ID");
    }

    const review = await publicReviewModel.findByIdAndDelete(id);
    if (!review) {
      return apiResponse(res, 404, false, "Review not found");
    }

    return apiResponse(res, 200, true, "Review deleted successfully");
  } catch (error) {
    console.error("Error deleting review:", error);
    return apiResponse(res, 500, false, "Internal Server Error");
  }
};
