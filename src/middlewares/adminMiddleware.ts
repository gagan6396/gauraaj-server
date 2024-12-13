import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import adminModel from "../models/Admin.model";
import apiResponse from "../utils/ApiResponse";

const JWT_SECRET = process.env.JWT_SECRET || "BoostEngineIsFutureStickCompany";

const adminAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Extract token from Authorization header
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return apiResponse(res, 401, false, "Access Denied: No token provided");
  }

  try {
    // Verify and decode the token
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    console.log("Decoded Token:", decoded); // Debugging log

    if (!decoded._id) {
      return apiResponse(res, 401, false, "Invalid token structure");
    }


    const admin = await adminModel.findById(decoded._id); 
    console.log("Admin Found:", admin); 

    if (!admin) {
      return apiResponse(res, 404, false, "Admin not found");
    }


    (req as Request & { admin?: typeof admin }).admin = admin;


    next();
  } catch (error) {
    console.error("JWT Error:", error); 
    return apiResponse(res, 401, false, "Invalid or expired token");
  }
};

export default adminAuthMiddleware;
