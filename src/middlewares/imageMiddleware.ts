import { NextFunction, Request, Response } from "express";
import apiResponse from "../utils/ApiResponse"; // Assuming this is your response handling utility
import { uploadMultipleImages } from "../utils/uploadImage"; // Assuming your file is at this location

const handleImageUpload = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  uploadMultipleImages(req, res, (error: any) => {
    if (error) {
      // Handle errors related to the upload process
      console.error("Error uploading image:", error);

      // Respond with error message
      return apiResponse(
        res,
        400,
        false,
        error.message || "Image upload failed"
      );
    }

    // Ensure that files were uploaded and handle them accordingly
    if (req.files && Array.isArray(req.files)) {
      // If multiple files were uploaded, store the URLs in imageUrls
      req.body.imageUrls = (req.files as Express.MulterS3.File[]).map(
        (file) => file.location
      );
    } else if (req.file) {
      // If a single file was uploaded, store the URL in imageUrl
      req.body.imageUrl = (req.file as Express.MulterS3.File).location;
    }

    // Proceed to the next middleware or handler
    next();
  });
};

export default handleImageUpload;
