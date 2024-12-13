import multer from "multer";

declare global {
  namespace Express {
    export interface Request {
      file: MulterS3File | MulterS3File[] | undefined;
    }
  }

  interface MulterS3File extends Express.Multer.File {
    location: string;
  }
}
