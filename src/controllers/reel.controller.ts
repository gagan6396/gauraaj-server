import { Request, Response } from "express";
import Reel from "../models/reel.model";
import apiResponse from "../utils/ApiResponse";

/**
 * @desc Create a new reel
 * @route POST /api/reels
 */
export const createReel = async (req: Request, res: Response) => {
  try {
    const { name, description, reelUrl, products } = req.body;

    if (!name || !description || !reelUrl) {
      return apiResponse(res, 400, false, "All fields are required.");
    }

    const newReel: any = await Reel.create({
      name,
      description,
      reelUrl,
      products,
    });

    return apiResponse(res, 201, true, "Reel created successfully", newReel);
  } catch (error) {
    console.error("Error creating reel", error);
    return apiResponse(res, 500, false, "Error creating reel");
  }
};

/**
 * @desc Fetch all reels
 * @route GET /api/reels
 */
export const getReels = async (_req: Request, res: Response) => {
  try {
    const reels = await Reel.find().populate("products");
    return apiResponse(res, 200, true, "Reels fetched successfully", reels);
  } catch (error) {
    console.error("Error fetching reels", error);
    return apiResponse(res, 500, false, "Error fetching reels");
  }
};

/**
 * @desc Fetch a single reel by ID
 * @route GET /api/reels/:id
 */
export const getReelById = async (req: Request, res: Response) => {
  try {
    const reel: any = await Reel.findById(req.params.id).populate("products");
    if (!reel) {
      return apiResponse(res, 404, false, "Reel not found.");
    }
    return apiResponse(res, 200, true, "Reel fetched successfully", reel);
  } catch (error) {
    console.error("Error fetching reel", error);
    return apiResponse(res, 500, false, "Error fetching reel");
  }
};

/**
 * @desc Delete a reel
 * @route DELETE /api/reels/:id
 */
export const deleteReel = async (req: Request, res: Response) => {
  try {
    const reel = await Reel.findByIdAndDelete(req.params.id);
    if (!reel) {
      return apiResponse(res, 404, false, "Reel not found.");
    }
    return apiResponse(res, 200, true, "Reel deleted successfully");
  } catch (error) {
    console.error("Error deleting reel", error);
    return apiResponse(res, 500, false, "Error deleting reel");
  }
};

/**
 * @desc Add a product to a reel
 * @route POST /api/reels/:id/add-product
 */
export const addProductToReel = async (req: Request, res: Response) => {
  try {
    const { productId } = req.body;
    const reel: any = await Reel.findById(req.params.id);

    if (!reel) {
      return apiResponse(res, 404, false, "Reel not found.");
    }

    if (reel.products.includes(productId)) {
      return apiResponse(res, 400, false, "Product already added to reel.");
    }

    reel.products.push(productId);
    await reel.save();

    return apiResponse(
      res,
      200,
      true,
      "Product added to reel successfully",
      reel
    );
  } catch (error) {
    console.error("Error adding product to reel", error);
    return apiResponse(res, 500, false, "Error adding product to reel");
  }
};
