import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "BoostEngineIsAmazing";
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "BoostEngineIsSuperSecure";

// Generate access token
export const generateToken = (payload: object) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "100y" });
};

// Generate refresh token
export const generateRefreshToken = (payload: object) => {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: "100y" });
};
