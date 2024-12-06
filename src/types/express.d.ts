// src/types/express.d.ts
import { JwtPayload } from "jsonwebtoken";
import Admin from "../models/Admin.model";

declare global {
  namespace Express {
    interface Request {
      user?: string | JwtPayload;
      admin?: Admin;
    }
  }
}
