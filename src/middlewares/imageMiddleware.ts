import { Request, Response, NextFunction } from "express";
import { uploadMultipleImages } from "../utils/uploadImage";
import apiResponse from "../utils/ApiResponse";

const handleImageUpload = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  uploadMultipleImages(req, res, (error: any) => {
    if (error) {
      console.error("Error uploading image:", error);
      return apiResponse(
        res,
        400,
        false,
        error.message || "Image upload failed"
      );
    }

    if (req.files && Array.isArray(req.files)) {
      req.body.imageUrls = (req.files as any[]).map(
        (file: any) => file.location
      );
    } else if (req.file) {
      req.body.imageUrl = (req.file as any).location;
    }

    next();
  });
};

export default handleImageUpload;
