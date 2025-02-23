// middlewares/videoMiddleware.ts
import { NextFunction, Request, Response } from "express";
import apiResponse from "../utils/ApiResponse";
import { uploadSingleVideo } from "../utils/uploadVideo";

const handleVideoUpload = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  uploadSingleVideo(req, res, (error: any) => {
    if (error) {
      // Handle errors related to the upload process
      console.error("Error uploading video:", error);

      // Respond with error message
      return apiResponse(
        res,
        400,
        false,
        error.message || "Video upload failed"
      );
    }

    // Ensure that a video file was uploaded and handle it accordingly
    if (req.file) {
      // Store the video URL in videoUrl
      req.body.videoUrl = (req.file as Express.MulterS3.File).location;
    }

    // Proceed to the next middleware or handler
    next();
  });
};

export default handleVideoUpload;