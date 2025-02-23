// utils/uploadVideo.ts
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

      if (["mp4"].includes(fileExtension) || ["video/mp4"].includes(mimeType)) {
        cb(null, true);
      } else {
        cb(new Error("Invalid file type. Only MP4 is allowed."));
      }
    } else {
      cb(new Error("No file provided"));
    }
  },
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB file size limit for video
});

// Middleware to upload a single video
export const uploadSingleVideo = upload.single("video");

// Function to delete a video from S3
export const deleteVideoFromS3 = async (videoUrl: string) => {
  try {
    const url = new URL(videoUrl);
    const key = url.pathname.substring(1); // Remove the leading '/'

    const deleteParams = {
      Bucket: process.env.AWS_BUCKET_NAME!,
      Key: key,
    };

    await s3Client.send(new DeleteObjectCommand(deleteParams));
    console.log(`Deleted video from S3: ${videoUrl}`);
  } catch (error) {
    console.error(`Error deleting video from S3: ${videoUrl}`, error);
  }
};
