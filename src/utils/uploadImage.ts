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

      if (
        ["jpg", "jpeg", "png"].includes(fileExtension) ||
        ["image/jpeg", "image/png", "image/jpg"].includes(mimeType)
      ) {
        cb(null, true);
      } else {
        cb(
          new Error("Invalid file type. Only JPG, JPEG, and PNG are allowed.")
        );
      }
    } else {
      cb(new Error("No file provided"));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB file size limit per file
});

export const uploadMultipleImages = upload.array("images", 5); // 5 images max per product

export const deleteImageFromS3 = async (imageUrl: string) => {
  try {
    const url = new URL(imageUrl);
    const key = url.pathname.substring(1); // Remove the leading '/'

    const deleteParams = {
      Bucket: process.env.AWS_BUCKET_NAME!,
      Key: key,
    };

    await s3Client.send(new DeleteObjectCommand(deleteParams));
    console.log(`Deleted image from S3: ${imageUrl}`);
  } catch (error) {
    console.error(`Error deleting image from S3: ${imageUrl}`, error);
  }
};
