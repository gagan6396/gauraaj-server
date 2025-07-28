import { Request, Response } from "express";
import Slider from "../models/slider.model";
import apiResponse from "../utils/ApiResponse";

/**
 * @desc Create a new slider
 * @route POST /api/sliders
 */
export const createSlider = async (req: any, res: Response) => {
  try {
    const { title, subtitle, button, sequence, isHidden } = JSON.parse(req.body.data);
    const imageUrl = req.body.imageUrls[0] || "";

    if (!title || !subtitle || !button?.label || !button?.actionURL || !imageUrl) {
      return apiResponse(
        res,
        400,
        false,
        "Title, subtitle, button label, button action URL, and image are required."
      );
    }

    const newSlider: any = await Slider.create({
      title,
      subtitle,
      button,
      sequence: sequence || 0,
      isHidden: isHidden || false,
      imageUrl,
    });

    return apiResponse(res, 201, true, "Slider created successfully", newSlider);
  } catch (error) {
    console.error("Error creating slider:", error);
    return apiResponse(res, 500, false, "Error creating slider");
  }
};

/**
 * @desc Fetch all sliders with filtering and sorting
 * @route GET /api/sliders
 */
export const getSliders = async (req: Request, res: Response) => {
  try {
    const { isHidden, sortBy = "sequence", order = "asc" } = req.query;
    const query: any = {};

    if (isHidden !== undefined) query.isHidden = isHidden === "true";

    const sliders = await Slider.find(query).sort({
      [sortBy as string]: order === "asc" ? 1 : -1,
    });

    return apiResponse(res, 200, true, "Sliders fetched successfully", sliders);
  } catch (error) {
    console.error("Error fetching sliders:", error);
    return apiResponse(res, 500, false, "Error fetching sliders");
  }
};

/**
 * @desc Fetch a single slider by ID
 * @route GET /api/sliders/:id
 */
export const getSliderById = async (req: Request, res: Response) => {
  try {
    const slider: any = await Slider.findById(req.params.id);

    if (!slider) {
      return apiResponse(res, 404, false, "Slider not found.");
    }

    return apiResponse(res, 200, true, "Slider fetched successfully", slider);
  } catch (error) {
    console.error("Error fetching slider:", error);
    return apiResponse(res, 500, false, "Error fetching slider");
  }
};

/**
 * @desc Update a slider
 * @route PATCH /api/sliders/:id
 */
export const updateSlider = async (req: any, res: Response) => {
  try {
    const { title, subtitle, button, sequence, isHidden } = JSON.parse(req.body.data);
    const imageUrl = req.body.imageUrls?.[0] || "";

    const slider: any = await Slider.findById(req.params.id);
    if (!slider) {
      return apiResponse(res, 404, false, "Slider not found.");
    }

    if (title) slider.title = title;
    if (subtitle) slider.subtitle = subtitle;
    if (button?.label) slider.button.label = button.label;
    if (button?.actionURL) slider.button.actionURL = button.actionURL;
    if (sequence !== undefined) slider.sequence = sequence;
    if (isHidden !== undefined) slider.isHidden = isHidden;
    if (imageUrl) slider.imageUrl = imageUrl;

    await slider.save();

    return apiResponse(res, 200, true, "Slider updated successfully", slider);
  } catch (error) {
    console.error("Error updating slider:", error);
    return apiResponse(res, 500, false, "Error updating slider");
  }
};

/**
 * @desc Delete a slider
 * @route DELETE /api/sliders/:id
 */
export const deleteSlider = async (req: Request, res: Response) => {
  try {
    const slider: any = await Slider.findByIdAndDelete(req.params.id);
    if (!slider) {
      return apiResponse(res, 404, false, "Slider not found.");
    }
    return apiResponse(res, 200, true, "Slider deleted successfully");
  } catch (error) {
    console.error("Error deleting slider:", error);
    return apiResponse(res, 500, false, "Error deleting slider");
  }
};

/**
 * @desc Toggle hide status of a slider
 * @route PATCH /api/sliders/:id/toggle-hide
 */
export const toggleHideSlider = async (req: any, res: Response) => {
  try {
    const slider: any = await Slider.findById(req.params.id);
    if (!slider) {
      return apiResponse(res, 404, false, "Slider not found.");
    }
    slider.isHidden = !slider.isHidden;
    await slider.save();
    return apiResponse(
      res,
      200,
      true,
      `Slider ${slider.isHidden ? "hidden" : "unhidden"} successfully`,
      slider
    );
  } catch (error) {
    console.error("Error toggling hide status:", error);
    return apiResponse(res, 500, false, "Error toggling hide status");
  }
};