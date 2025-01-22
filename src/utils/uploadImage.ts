<<<<<<< HEAD
import AWS from "aws-sdk";
import multer from "multer";
import multerS3 from "multer-s3";

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// Initialize S3 client
const s3 = new AWS.S3() as any;

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_BUCKET_NAME || "your-bucket-name",
    acl: "public-read", // Make uploaded images publicly readable
    key: (req, file, cb) => {
      const uniqueFileName = `${Date.now()}-${file.originalname}`;
      cb(null, uniqueFileName); // File name in S3 bucket
    },
  }),
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === "image/jpeg" ||
      file.mimetype === "image/png" ||
      file.mimetype === "image/jpg"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPG, JPEG, and PNG are allowed."));
=======
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
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
>>>>>>> ravichandra/main
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB file size limit per file
});

<<<<<<< HEAD
export const uploadMultipleImages = upload.array("images", 5); // 5 images on each product
=======
export const uploadMultipleImages = upload.array("images", 5); // 5 images max per product
>>>>>>> ravichandra/main
