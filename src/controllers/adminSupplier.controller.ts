import { Request, Response } from "express";
import supplierModel from "../models/Supplier.model";
import userModel from "../models/User.model";
import apiResponse from "../utils/ApiResponse";

const updateSupplierById = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    if (!userId) {
      return apiResponse(res, 400, false, "User ID is required");
    }

    const updatedUser = await userModel.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true }
    );

    if (!updatedUser) {
      return apiResponse(res, 404, false, "User not found");
    }

    return apiResponse(
      res,
      200,
      true,
      "User updated successfully",
      updatedUser
    );
  } catch (error) {
    console.error("Error updating user:", error);
    return apiResponse(res, 500, false, "Error updating user details");
  }
};

const deleteSupplierById = async (req: Request, res: Response) => {
  try {
    // const { userId } = req.params;

    // if (!userId) {
    //   return apiResponse(res, 400, false, "User ID is required");
    // }

    // const deletedUser = await userModel.findByIdAndDelete(userId);

    // if (!deletedUser) {
    //   return apiResponse(res, 404, false, "User not found");
    // }

    const { supplierId } = req.params;
    const deletedSupplier = await supplierModel.findByIdAndDelete(supplierId);

    if (!deletedSupplier) {
      return apiResponse(res, 404, false, "Supplier not found");
    };

    return apiResponse(res, 200, true, "User deleted successfully");
  } catch (error) {
    console.error("Error deleting user:", error);
    return apiResponse(res, 500, false, "Error deleting user");
  }
};

const getAllSuppliers = async (req: Request, res: Response) => {
  try {
    const suppliers = await supplierModel.find().select("-password");
    if (!suppliers || suppliers.length === 0) {
      return apiResponse(res, 404, false, "No suppliers found");
    }

    return apiResponse(
      res,
      200,
      true,
      "Suppliers fetched successfully",
      suppliers
    );
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    return apiResponse(res, 500, false, "Error fetching suppliers");
  }
};

const approveSupplier = async (req: Request, res: Response) => {
  try {
    const { supplierId } = req.params;

    if (!supplierId) {
      return apiResponse(res, 400, false, "Supplier ID is required");
    }

    const supplier = await supplierModel.findById(supplierId);

    if (!supplier) {
      return apiResponse(res, 404, false, "Supplier not found");
    }

    supplier.approval_status = "Approved";
    await supplier.save();
    return apiResponse(res, 200, true, "Supplier approved successfully");
  } catch (error) {
    console.error("Error while approving supplier", error);
    return apiResponse(res, 500, false, "Error while approving supplier");
  }
};

const rejectSupplier = async (req: Request, res: Response) => {
  try {
    const { supplierId } = req.params;
    if (!supplierId) {
      return apiResponse(res, 400, false, "Supplier ID is required");
    }

    const supplier = await supplierModel.findById(supplierId);
    if (!supplier) {
      return apiResponse(res, 404, false, "Supplier not found");
    }

    supplier.approval_status = "Rejected";
    await supplier.save();

    return apiResponse(res, 200, true, "Supplier rejected successfully");
  } catch (error) {
    console.error("Error while rejecting supplier", error);
    return apiResponse(res, 500, false, "Error while rejecting supplier");
  }
};

export {
  approveSupplier, deleteSupplierById, getAllSuppliers, rejectSupplier, updateSupplierById
};

