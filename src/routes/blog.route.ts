// routes/blog.routes.ts
import { Router } from "express";
import {
    createBlog,
    deleteBlog,
    getBlogById,
    getBlogs,
    toggleHideBlog,
    togglePinBlog,
    updateBlog,
} from "../controllers/blog.controller";
import authMiddleware from "../middlewares/authMiddleware"; // Assuming authentication is required
import handleImageUpload from "../middlewares/imageMiddleware";

const blogRoute = Router();

// Public routes
blogRoute.get("/", getBlogs);
blogRoute.get("/:id", getBlogById);

// Protected routes (admin only)
blogRoute.post("/", authMiddleware, handleImageUpload, createBlog);
blogRoute.patch("/:id", authMiddleware, handleImageUpload, updateBlog);
blogRoute.delete("/:id", authMiddleware, deleteBlog);
blogRoute.patch("/:id/toggle-pin", authMiddleware, togglePinBlog);
blogRoute.patch("/:id/toggle-hide", authMiddleware, toggleHideBlog);

export default blogRoute;
