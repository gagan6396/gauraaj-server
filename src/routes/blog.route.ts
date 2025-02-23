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

const blogRoute = Router();

// Public routes
blogRoute.get("/", getBlogs);
blogRoute.get("/:id", getBlogById);

// Protected routes (admin only)
blogRoute.post("/", authMiddleware, createBlog);
blogRoute.patch("/:id", authMiddleware, updateBlog);
blogRoute.delete("/:id", authMiddleware, deleteBlog);
blogRoute.patch("/:id/toggle-pin", authMiddleware, togglePinBlog);
blogRoute.patch("/:id/toggle-hide", authMiddleware, toggleHideBlog);

export default blogRoute;