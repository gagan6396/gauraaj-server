import express, { Router } from "express";
import { AdminLogin, AdminLogout,AdminRegister } from "../controllers/adminAuth.controller";
import validateRequest from "../middlewares/validateSchema";
import { adminLoginSchema } from "../Schema/admin.schema";

const adminRoute = Router();

adminRoute.post(
  "/auth/login",
  // validateRequest({ body: adminLoginSchema }),
  AdminLogin
);
adminRoute.post("/auth/logout", AdminLogout);
adminRoute.post("/auth/register", AdminRegister);


export default adminRoute;
