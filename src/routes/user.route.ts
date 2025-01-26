import { Router } from "express";
import {
  LoginUser,
  logOut,
  RegisterUser,
  reset_password,
} from "../controllers/userauth.controller";
const userRoute = Router();

userRoute.post(
  "/auth/register",
  // validateRequest({ body: registerSchema }),
  RegisterUser
);
userRoute.post(
  "/auth/login",
  // validateRequest({ body: loginSchema }),
  LoginUser
);
userRoute.post(
  "/auth/reset_password",
  // validateRequest({ body: resetPasswordSchema }),
  reset_password
);
userRoute.post("/auth/logout", logOut);

export default userRoute;
