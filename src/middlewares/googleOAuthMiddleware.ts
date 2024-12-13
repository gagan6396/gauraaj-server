import { Request, Response } from "express";
import apiResponse from "../utils/ApiResponse";
import { generateToken } from "../utils/jwtHelper";
import { generateRefreshToken } from "../utils/jwtHelper";

export const googleAuthSuccess = (req: Request, res: Response) => {
  if (!req.user) {
    return apiResponse(res, 401, false, "Google OAuth failed");
  }

  const user = req.user as any;
  const token = generateToken({ id: user._id, role: user.role });
  const refreshToken = generateRefreshToken({ id: user._id, role: user.role });

  return apiResponse(res, 200, true, "Authentication successful", {
    token,
    refreshToken,
    user: {
      id: user._id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      role: user.role,
    },
  });
};
