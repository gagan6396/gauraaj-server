import { Router } from "express";
import {
  registerSupplier,
  loginSupplier,
  supplierResetPassword,
  supplierLogOut,
} from "../controllers/supplierauth.controller";
import {
  supplierRegisterSchema,
  supplierLoginSchema,
  supplierForgatSchema,
  supplierResetSchema,
} from "../Schema/supplier.schema";
import validateRequest from "../middlewares/validateSchema";

const supplierRoute = Router();

// Define here all Routes
supplierRoute.post(
  "/auth/register",
  // validateRequest({ body: supplierRegisterSchema }),
  registerSupplier
);
supplierRoute.post(
  "/auth/login",
  // validateRequest({ body: supplierLoginSchema }),
  loginSupplier
);
supplierRoute.post("/auth/forgotpassword", supplierResetPassword);

supplierRoute.post("/auth/logout", supplierLogOut);

export default supplierRoute;
