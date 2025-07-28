import { Router } from "express";
import {
    createSlider,
    deleteSlider,
    getSliderById,
    getSliders,
    toggleHideSlider,
    updateSlider,
} from "../controllers/slider.controller";
import authMiddleware from "../middlewares/authMiddleware";
import handleImageUpload from "../middlewares/imageMiddleware";

const sliderRoute = Router();

// Public routes
sliderRoute.get("/", getSliders);
sliderRoute.get("/:id", getSliderById);

// Protected routes (admin only)
sliderRoute.post("/", authMiddleware, handleImageUpload, createSlider);
sliderRoute.patch("/:id", authMiddleware, handleImageUpload, updateSlider);
sliderRoute.delete("/:id", authMiddleware, deleteSlider);
sliderRoute.patch("/:id/toggle-hide", authMiddleware, toggleHideSlider);

export default sliderRoute;