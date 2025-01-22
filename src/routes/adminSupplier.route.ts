import { Router } from "express";
import {
  getAllSuppliers,
  deleteSupplierById,
  updateSupplierById,
  approveSupplier,
  rejectSupplier,
} from "../controllers/adminSupplier.controller";
import adminAuthMiddleware from "../middlewares/adminMiddleware";
import {
  updateSupplierSchema,
  supplierIdParamSchema,
  approveSupplierSchema,
  rejectSupplierSchema,
  deleteSupplierSchema,
} from "../Schema/adminSupplier.schema";
import validateRequest from "../middlewares/validateSchema";

const adminSupplierRoute = Router();

adminSupplierRoute.get("/", adminAuthMiddleware, getAllSuppliers);
adminSupplierRoute.delete(
<<<<<<< HEAD
  "/:userId",
=======
  "/:supplierId",
>>>>>>> ravichandra/main
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
