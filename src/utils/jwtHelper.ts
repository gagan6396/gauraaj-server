import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "BoostEngineIsAmazing";
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "BoostEngineIsSuperSecure";

// Maximum expiration set to 50 years (in seconds)
const MAX_ACCESS_TOKEN_EXPIRY = 50 * 365 * 24 * 60 * 60; // 50 years in seconds
const MAX_REFRESH_TOKEN_EXPIRY = 50 * 365 * 24 * 60 * 60; // 50 years in seconds

// Generate access token with maximum expiration
export const generateToken = (payload: object) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: MAX_ACCESS_TOKEN_EXPIRY });
};

// Generate refresh token with maximum expiration
export const generateRefreshToken = (payload: object) => {
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: MAX_REFRESH_TOKEN_EXPIRY,
  });
};

// Optional: Verify token (for completeness)
export const verifyToken = (token: string, isRefreshToken: boolean = false) => {
  const secret = isRefreshToken ? JWT_REFRESH_SECRET : JWT_SECRET;
  try {
    const decoded = jwt.verify(token, secret);
    return { valid: true, decoded };
  } catch (error) {
    return { valid: false, error: (error as Error).message };
  }
};
