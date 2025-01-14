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
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Invalid file type: ${file.mimetype}. Only JPG, JPEG, and PNG are allowed.`
        )
      );
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB file size limit per file
});

export const uploadMultipleImages = upload.array("images", 5); // 5 images on each product
