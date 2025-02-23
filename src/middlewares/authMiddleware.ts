// src/middlewares/authMiddleware.ts
import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import apiResponse from "../utils/ApiResponse";

const JWT_SECRET = process.env.JWT_SECRET || "BoostEngineIsFutureStickCompany";

interface DecodedUser extends JwtPayload {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
}

const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return apiResponse(res, 401, false, "Access Denied: No token provided");
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as DecodedUser;
    console.log("decoded", decoded);

    // Attach user info to the request
    (req as Request & { user: DecodedUser }).user = {
      id: decoded.id,
    };

    next();
  } catch (error) {
    console.error("Authentication error:", error); // Log the error for debugging
    return apiResponse(res, 401, false, "Invalid or expired Token");
  }
};

export default authMiddleware;