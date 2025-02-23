// middlewares/imageMiddleware.ts
import { NextFunction, Request, Response } from "express";
import apiResponse from "../utils/ApiResponse";
import { uploadMultipleImages, uploadVideo } from "../utils/uploadImage";

const handleImageUpload = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // First handle image uploads
  uploadMultipleImages(req, res, (imageError: any) => {
    if (imageError) {
      console.error("Error uploading images:", imageError);
      return apiResponse(
        res,
        400,
        false,
        imageError.message || "Image upload failed"
      );
    }

    // Store image URLs if present
    if (req.files && Array.isArray(req.files)) {
      req.body.imageUrls = (req.files as Express.MulterS3.File[]).map(
        (file) => file.location
      );
    }

    // Then handle video upload
    uploadVideo(req, res, (videoError: any) => {
      if (videoError) {
        console.error("Error uploading video:", videoError);
        return apiResponse(
          res,
          400,
          false,
          videoError.message || "Video upload failed"
        );
      }

      // Store video URL if present
      if (req.file) {
        req.body.videoUrl = (req.file as Express.MulterS3.File).location;
      }

      next();
    });
  });
};

export default handleImageUpload;