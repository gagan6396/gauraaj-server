import { Router } from "express";
import {
    deletePublicReview,
    getAllPublicReviews,
    getPublicReviewById,
    publicCreateReview,
    updatePublicReview,
} from "../controllers/reviewPublic.controller";
import handleImageUpload from "../middlewares/imageMiddleware";

const reviewRouter = Router();

// Define review routes
reviewRouter.post("/", handleImageUpload, publicCreateReview);
reviewRouter.get("/", getAllPublicReviews);
reviewRouter.get("/:id", getPublicReviewById);
reviewRouter.put("/:id", handleImageUpload, updatePublicReview);
reviewRouter.delete("/:id", deletePublicReview);

export default reviewRouter;
