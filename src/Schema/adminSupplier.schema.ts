import { z } from "zod";

export const updateSupplierSchema = z.object({
  username: z.string().min(1, "Username cannot be empty.").optional(),
  email: z.string().email("Invalid email format.").optional(),
  phone_number: z
    .string()
    .min(10, "Phone number should be at least 10 characters.")
    .optional(),
  address: z.string().min(1, "Address cannot be empty.").optional(),
});


export const supplierIdParamSchema = z.object({
  supplierId: z.string().min(1, "Supplier ID is required."),
});

export const approveSupplierSchema = supplierIdParamSchema;
export const rejectSupplierSchema = supplierIdParamSchema;
export const deleteSupplierSchema = supplierIdParamSchema;
