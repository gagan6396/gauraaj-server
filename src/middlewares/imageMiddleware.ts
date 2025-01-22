import { Request, Response, NextFunction } from "express";
<<<<<<< HEAD
import { uploadMultipleImages } from "../utils/uploadImage";
import apiResponse from "../utils/ApiResponse";
=======
import { uploadMultipleImages } from "../utils/uploadImage"; // Assuming your file is at this location
import apiResponse from "../utils/ApiResponse"; // Assuming this is your response handling utility
>>>>>>> ravichandra/main

const handleImageUpload = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  uploadMultipleImages(req, res, (error: any) => {
    if (error) {
<<<<<<< HEAD
      console.error("Error uploading image:", error);
=======
      // Handle errors related to the upload process
      console.error("Error uploading image:", error);

      // Respond with error message
>>>>>>> ravichandra/main
      return apiResponse(
        res,
        400,
        false,
        error.message || "Image upload failed"
      );
    }

<<<<<<< HEAD
    if (req.files && Array.isArray(req.files)) {
      req.body.imageUrls = (req.files as any[]).map(
        (file: any) => file.location
      );
    } else if (req.file) {
      req.body.imageUrl = (req.file as any).location;
    }

=======
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
>>>>>>> ravichandra/main
    next();
  });
};

export default handleImageUpload;
