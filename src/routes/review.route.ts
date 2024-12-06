import { Router } from "express";
import {
  addReview,
  getAllReviwsForProduct,
  updateReview,
  deleteReview,
  getReviewsByUser,
} from "../controllers/review.controller";
import {
  addReviewSchema,
  updateReviewSchema,
  reviewIdParamSchema,
  productIdParamSchema,
} from "../Schema/review.schema";
import validateRequest from "../middlewares/validateSchema";

const reviewRoute = Router();

// Define here all review Routes
reviewRoute.post("/", addReview);
reviewRoute.get(
  "/products/:productId",
  // validateRequest({ params: productIdParamSchema }),
  getAllReviwsForProduct
);
reviewRoute.patch(
  "/:reviewId",
  // validateRequest({ params: reviewIdParamSchema, body: updateReviewSchema }),
  updateReview
);

reviewRoute.delete(
  "/:reviewId",
  // validateRequest({ params: reviewIdParamSchema }),
  deleteReview
);

reviewRoute.get("user/:userId", getReviewsByUser);

export default reviewRoute;
