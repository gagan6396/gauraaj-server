import { Response, Request, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import apiResponse from "../utils/ApiResponse";

const JWT_SECRET = process.env.JWT_SECRET || "BoostEngineIsFutureStickCompany";

interface DecodedUser extends JwtPayload {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return apiResponse(res, 401, false, "Access Denied: No token provided");
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as DecodedUser;

    (req as Request & { user: DecodedUser }).user = {
      id: decoded.id,
      first_name: decoded.first_name,
      last_name: decoded.last_name,
      email: decoded.email,
    };

    next();
  } catch (error) {
    return apiResponse(res, 401, false, "Invalid or expired Token");
  }
};

export default authMiddleware;
