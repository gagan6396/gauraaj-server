import { Router } from "express";
import {
  LoginUser,
  logOut,
  RegisterUser,
  requestPasswordReset,
  resetPassword,
} from "../controllers/userauth.controller";

const userRoute = Router();

userRoute.post("/auth/register", RegisterUser);
userRoute.post("/auth/login", LoginUser);
userRoute.post("/auth/request-reset-password", requestPasswordReset); // New endpoint for requesting reset
userRoute.post("/auth/reset-password", resetPassword); // Updated endpoint for resetting password
userRoute.post("/auth/logout", logOut);

export default userRoute;
