import { Router } from "express";
import {
  addReview,
  deleteReview,
  getAllReviwsForProduct,
  getReviewsByUser,
  updateReview,
} from "../controllers/review.controller";
import authMiddleware from "../middlewares/authMiddleware";

const reviewRoute = Router();

// Define here all review Routes
reviewRoute.post("/", authMiddleware, addReview);

reviewRoute.get("/products/:productId", getAllReviwsForProduct);

reviewRoute.patch("/:reviewId", authMiddleware, updateReview);

reviewRoute.delete("/:reviewId", deleteReview);

reviewRoute.get("/user", authMiddleware, getReviewsByUser);

export default reviewRoute;
