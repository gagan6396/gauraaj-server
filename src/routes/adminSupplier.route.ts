import { Router } from "express";
import {
  approveSupplier,
  deleteSupplierById,
  getAllSuppliers,
  rejectSupplier,
  updateSupplierById,
} from "../controllers/adminSupplier.controller";
import adminAuthMiddleware from "../middlewares/adminMiddleware";

const adminSupplierRoute = Router();

adminSupplierRoute.get("/", adminAuthMiddleware, getAllSuppliers);
adminSupplierRoute.delete(
  "/:supplierId",
  adminAuthMiddleware,
  // validateRequest({ params: deleteSupplierSchema }),
  deleteSupplierById
);
adminSupplierRoute.put(
  "/:userId",
  adminAuthMiddleware,
  // validateRequest({
  //   params: supplierIdParamSchema,
  //   body: updateSupplierSchema,
  // }),
  updateSupplierById
);

adminSupplierRoute.patch(
  "/:supplierId/approve",
  adminAuthMiddleware,
  // validateRequest({ params: approveSupplierSchema }),
  approveSupplier
);
adminSupplierRoute.patch(
  "/:supplierId/reject",
  adminAuthMiddleware,
  // validateRequest({ params: rejectSupplierSchema }),
  rejectSupplier
);

export default adminSupplierRoute;
