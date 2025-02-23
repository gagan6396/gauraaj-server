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

// Configure Multer storage with AWS S3 for SDK v3
const upload = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: process.env.AWS_BUCKET_NAME || "your-bucket-name",
    acl: "public-read",
    key: (req, file, cb) => {
      const uniqueFileName = `${Date.now()}-${file.originalname}`;
      cb(null, uniqueFileName);
    },
  }),
  fileFilter: (req, file, cb) => {
    if (file && file.mimetype) {
      const mimeType = file.mimetype.toLowerCase();
      const fileExtension =
        file.originalname.split(".").pop()?.toLowerCase() || "";

      const allowedImageTypes = ["image/jpeg", "image/png", "image/jpg"];
      const allowedVideoTypes = ["video/mp4"];
      const allowedImageExtensions = ["jpg", "jpeg", "png"];
      const allowedVideoExtensions = ["mp4"];

      if (
        allowedImageTypes.includes(mimeType) ||
        allowedImageExtensions.includes(fileExtension) ||
        allowedVideoTypes.includes(mimeType) ||
        allowedVideoExtensions.includes(fileExtension)
      ) {
        cb(null, true);
      } else {
        cb(
          new Error(
            "Invalid file type. Only JPG, JPEG, PNG, and MP4 are allowed."
          )
        );
      }
    } else {
      cb(new Error("No file provided"));
    }
  },
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB max to accommodate videos
});

// Middleware to upload both images and a single video
export const uploadFiles = upload.fields([
  { name: "images", maxCount: 5 }, // Up to 5 images
  { name: "video", maxCount: 1 },  // Up to 1 video
]);

export const deleteFileFromS3 = async (fileUrl: string) => {
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