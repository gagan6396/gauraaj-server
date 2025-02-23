// controllers/blog.controller.ts
import { Request, Response } from "express";
import Blog from "../models/Blog.model";
import apiResponse from "../utils/ApiResponse";

/**
 * @desc Create a new blog
 * @route POST /api/blogs
 */
export const createBlog = async (req: any, res: Response) => {
  try {
    const {
      title,
      content,
      category,
      sequence,
      isPinned,
      isHidden,
      tags,
      imageUrls,
    } = JSON.parse(req.body.data);
    const author = req.user?.id; // Assuming authMiddleware sets req.user
    const imageUrl = req.body.imageUrls[0] || "";
    console.log("req.body", req.body.data);

    console.log(
      "title",
      req.body.data.title,
      "content",
      req.body.data.content,
      "category",
      req.body.data.category,
      "author",
      req.body.data.author,
      "imageUrl",
      imageUrl
    );

    if (!title || !content || !category || !author) {
      return apiResponse(
        res,
        400,
        false,
        "Title, content, category, and author are required."
      );
    }

    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const existingBlog = await Blog.findOne({ slug });
    if (existingBlog) {
      return apiResponse(
        res,
        400,
        false,
        "A blog with this title/slug already exists."
      );
    }

    const newBlog: any = await Blog.create({
      title,
      content,
      author,
      category: [category],
      sequence: sequence || 0,
      isPinned: isPinned || false,
      isHidden: isHidden || false,
      tags: tags || [],
      imageUrl,
      slug,
    });

    return apiResponse(res, 201, true, "Blog created successfully", newBlog);
  } catch (error) {
    console.error("Error creating blog:", error);
    return apiResponse(res, 500, false, "Error creating blog");
  }
};

/**
 * @desc Fetch all blogs with filtering and sorting
 * @route GET /api/blogs
 */
export const getBlogs = async (req: Request, res: Response) => {
  try {
    const {
      category,
      isPinned,
      isHidden,
      sortBy = "sequence",
      order = "asc",
    } = req.query;
    const query: any = {};

    if (category) query.category = category;
    if (isPinned !== undefined) query.isPinned = isPinned === "true";
    if (isHidden !== undefined) query.isHidden = isHidden === "true";

    const blogs = await Blog.find(query)
      .populate("author", "first_name last_name email")
      .populate("category", "name")
      .sort({ [sortBy as string]: order === "asc" ? 1 : -1 });

    return apiResponse(res, 200, true, "Blogs fetched successfully", blogs);
  } catch (error) {
    console.error("Error fetching blogs:", error);
    return apiResponse(res, 500, false, "Error fetching blogs");
  }
};

/**
 * @desc Fetch a single blog by ID or slug
 * @route GET /api/blogs/:id
 */
export const getBlogById = async (req: any, res: Response) => {
  try {
    const blog: any = await Blog.findOne({
      $or: [{ _id: req.params.id }, { slug: req.params.id }],
    })
      .populate("author", "first_name last_name email")
      .populate("category", "name");

    if (!blog) {
      return apiResponse(res, 404, false, "Blog not found.");
    }

    // Increment views
    blog.views += 1;
    await blog.save();

    return apiResponse(res, 200, true, "Blog fetched successfully", blog);
  } catch (error) {
    console.error("Error fetching blog:", error);
    return apiResponse(res, 500, false, "Error fetching blog");
  }
};

/**
 * @desc Update a blog
 * @route PATCH /api/blogs/:id
 */
export const updateBlog = async (req: Request, res: Response) => {
  try {
    const {
      title,
      content,
      category,
      sequence,
      isPinned,
      isHidden,
      tags,
      imageUrl,
    } = req.body;

    const blog: any = await Blog.findById(req.params.id);
    if (!blog) {
      return apiResponse(res, 404, false, "Blog not found.");
    }

    if (title) {
      const newSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      if (newSlug !== blog.slug) {
        const existingBlog = await Blog.findOne({ slug: newSlug });
        if (existingBlog) {
          return apiResponse(
            res,
            400,
            false,
            "A blog with this title/slug already exists."
          );
        }
        blog.slug = newSlug;
      }
      blog.title = title;
    }

    if (content) blog.content = content;
    if (category) blog.category = category;
    if (sequence !== undefined) blog.sequence = sequence;
    if (isPinned !== undefined) blog.isPinned = isPinned;
    if (isHidden !== undefined) blog.isHidden = isHidden;
    if (tags) blog.tags = tags;
    if (imageUrl) blog.imageUrl = imageUrl;

    await blog.save();

    return apiResponse(res, 200, true, "Blog updated successfully", blog);
  } catch (error) {
    console.error("Error updating blog:", error);
    return apiResponse(res, 500, false, "Error updating blog");
  }
};

/**
 * @desc Delete a blog
 * @route DELETE /api/blogs/:id
 */
export const deleteBlog = async (req: Request, res: Response) => {
  try {
    const blog: any = await Blog.findByIdAndDelete(req.params.id);
    if (!blog) {
      return apiResponse(res, 404, false, "Blog not found.");
    }
    return apiResponse(res, 200, true, "Blog deleted successfully");
  } catch (error) {
    console.error("Error deleting blog:", error);
    return apiResponse(res, 500, false, "Error deleting blog");
  }
};

/**
 * @desc Toggle pin status of a blog
 * @route PATCH /api/blogs/:id/toggle-pin
 */
export const togglePinBlog = async (req: any, res: Response) => {
  try {
    const blog: any = await Blog.findById(req.params.id);
    if (!blog) {
      return apiResponse(res, 404, false, "Blog not found.");
    }
    blog.isPinned = !blog.isPinned;
    await blog.save();
    return apiResponse(
      res,
      200,
      true,
      `Blog ${blog.isPinned ? "pinned" : "unpinned"} successfully`,
      blog
    );
  } catch (error) {
    console.error("Error toggling pin status:", error);
    return apiResponse(res, 500, false, "Error toggling pin status");
  }
};

/**
 * @desc Toggle hide status of a blog
 * @route PATCH /api/blogs/:id/toggle-hide
 */
export const toggleHideBlog = async (req: any, res: Response) => {
  try {
    const blog: any = await Blog.findById(req.params.id);
    if (!blog) {
      return apiResponse(res, 404, false, "Blog not found.");
    }
    blog.isHidden = !blog.isHidden;
    await blog.save();
    return apiResponse(
      res,
      200,
      true,
      `Blog ${blog.isHidden ? "hidden" : "unhidden"} successfully`,
      blog
    );
  } catch (error) {
    console.error("Error toggling hide status:", error);
    return apiResponse(res, 500, false, "Error toggling hide status");
  }
};
