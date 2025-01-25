import express, { Router } from "express";
import {
  LoginUser,
  RegisterUser,
  reset_password,
  logOut,
} from "../controllers/userauth.controller";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../Schema/userAuth.schema";
import validateRequest from "../middlewares/validateSchema";
import { register } from "module";
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
