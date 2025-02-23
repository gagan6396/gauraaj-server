// utils/uploadImage.ts
import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import multer from "multer";
import multerS3 from "multer-s3";

// Initialize AWS S3 client (SDK v3)
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Base Multer configuration for S3
const multerS3Config = {
  s3: s3Client,
  bucket: process.env.AWS_BUCKET_NAME || "your-bucket-name",
  acl: "public-read",
  key: (req: any, file: { originalname: any; }, cb: (arg0: null, arg1: string) => void) => {
    const uniqueFileName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueFileName);
  },
};

// Image-specific upload configuration
const uploadImages = multer({
  storage: multerS3(multerS3Config),
  fileFilter: (req, file, cb) => {
    if (file && file.mimetype) {
      const mimeType = file.mimetype.toLowerCase();
      const fileExtension =
        file.originalname.split(".").pop()?.toLowerCase() || "";

      const allowedImageTypes = ["image/jpeg", "image/png", "image/jpg"];
      const allowedImageExtensions = ["jpg", "jpeg", "png"];

      if (
        allowedImageTypes.includes(mimeType) ||
        allowedImageExtensions.includes(fileExtension)
      ) {
        cb(null, true);
      } else {
        cb(
          new Error(
            "Invalid file type. Only JPG, JPEG, and PNG are allowed for images."
          )
        );
      }
    } else {
      cb(new Error("No image file provided"));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB for images
    files: 5, // Max 5 images
  },
});

// Video-specific upload configuration
const uploadVideos = multer({
  storage: multerS3(multerS3Config),
  fileFilter: (req, file, cb) => {
    if (file && file.mimetype) {
      const mimeType = file.mimetype.toLowerCase();
      const fileExtension =
        file.originalname.split(".").pop()?.toLowerCase() || "";

      const allowedVideoTypes = ["video/mp4"];
      const allowedVideoExtensions = ["mp4"];

      if (
        allowedVideoTypes.includes(mimeType) ||
        allowedVideoExtensions.includes(fileExtension)
      ) {
        cb(null, true);
      } else {
        cb(new Error("Invalid file type. Only MP4 is allowed for videos."));
      }
    } else {
      cb(new Error("No video file provided"));
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB for videos (adjust as needed)
    files: 1, // Max 1 video
  },
});

// Middleware to upload multiple images
export const uploadMultipleImages = uploadImages.array("images", 5);

// Middleware to upload a single video
export const uploadVideo = uploadVideos.single("video");

// Function to delete a file (image or video) from S3
export const deleteImageFromS3 = async (fileUrl: string) => {
  try {
    const url = new URL(fileUrl);
    const key = url.pathname.substring(1); // Remove the leading '/'

    const deleteParams = {
      Bucket: process.env.AWS_BUCKET_NAME!,
      Key: key,
    };

    await s3Client.send(new DeleteObjectCommand(deleteParams));
    console.log(`Deleted file from S3: ${fileUrl}`);
  } catch (error) {
    console.error(`Error deleting file from S3: ${fileUrl}`, error);
  }
};
