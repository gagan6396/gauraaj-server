// middlewares/imageMiddleware.ts
import { NextFunction, Request, Response } from "express";
import apiResponse from "../utils/ApiResponse";
import { uploadFiles } from "../utils/uploadImage";

const handleImageUpload = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  uploadFiles(req, res, (error: any) => {
    if (error) {
      console.error("Error uploading files:", error);
      return apiResponse(
        res,
        400,
        false,
        error.message || "File upload failed"
      );
    }

    // Handle uploaded images
    if (req.files && "images" in req.files) {
      req.body.imageUrls = (req.files["images"] as Express.MulterS3.File[]).map(
        (file) => file.location
      );
    }

    // Handle uploaded video
    if (req.files && "video" in req.files) {
      req.body.videoUrl = (req.files["video"] as Express.MulterS3.File[])[0].location;
    }

    next();
  });
};

export default handleImageUpload;