import { Request, Response } from "express";
import orderModel from "../models/Order.model";
import userModel from "../models/User.model";
import productModel from "../models/Product.model";
import apiResponse from "../utils/ApiResponse";

const getGeneralAnalytics = async (req: Request, res: Response) => {
  try {
    // Get total sales, total users, and total orders
    const totalSales = await orderModel.aggregate([
      { $match: { status: "Completed" } },
      { $group: { _id: null, totalSales: { $sum: "$totalAmount" } } },
    ]);

    const totalUsers = await userModel.countDocuments();
    const totalOrders = await orderModel.countDocuments();

    return apiResponse(
      res,
      200,
      true,
      "General Analytics fetched successfully",
      {
        totalSales: totalSales[0]?.totalSales || 0,
        totalUsers,
        totalOrders,
      }
    );
  } catch (error) {
    console.error("Error fetching general analytics:", error);
    return apiResponse(res, 500, false, "Error fetching general analytics");
  }
};

const getUserAnalytics = async (req: Request, res: Response) => {
  try {
    const totalUsers = await userModel.countDocuments();
    const newUsers30Days = await userModel.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    });

    return apiResponse(res, 200, true, "User Analytics fetched successfully", {
      totalUsers,
      newUsers30Days,
    });
  } catch (error) {
    console.error("Error fetching user analytics:", error);
    return apiResponse(res, 500, false, "Error fetching user analytics");
  }
};

// Order Analytics
const getOrderAnalytics = async (req: Request, res: Response) => {
  try {
    const totalOrders = await orderModel.countDocuments();
    const completedOrders = await orderModel.countDocuments({
      status: "Completed",
    });
    const pendingOrders = await orderModel.countDocuments({
      status: "Pending",
    });

    return apiResponse(res, 200, true, "Order Analytics fetched successfully", {
      totalOrders,
      completedOrders,
      pendingOrders,
    });
  } catch (error) {
    console.error("Error fetching order analytics:", error);
    return apiResponse(res, 500, false, "Error fetching order analytics");
  }
};

const getTotalSalesAnalytics = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return apiResponse(
        res,
        400,
        false,
        "Both startDate and endDate are required."
      );
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return apiResponse(res, 400, false, "Invalid date format.");
    }

    const salesData = await orderModel.aggregate([
      { $match: { status: "Completed" } },
      { $match: { createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: null, totalSales: { $sum: "$totalAmount" } } },
    ]);

    return apiResponse(
      res,
      200,
      true,
      "Total Sales Analytics fetched successfully",
      {
        totalSales: salesData[0]?.totalSales || 0,
      }
    );
  } catch (error) {
    console.error("Error fetching total sales analytics:", error);
    return apiResponse(res, 500, false, "Error fetching total sales analytics");
  }
};

const adminDashboard = async (req: Request, res: Response) => {
  try {
    const generalAnalytics = await getGeneralAnalytics(req, res);
    const userAnalytics = await getUserAnalytics(req, res);
    const orderAnalytics = await getOrderAnalytics(req, res);
    const salesAnalytics = await getTotalSalesAnalytics(req, res);

    return apiResponse(
      res,
      200,
      true,
      "Dashboard Analytics fetched successfully",
      {
        general: generalAnalytics,
        user: userAnalytics,
        order: orderAnalytics,
        sales: salesAnalytics,
      }
    );
  } catch (error) {
    console.error("Error while fetching admin dashboard", error);
    return apiResponse(res, 500, false, "Error while fetching admin dashboard");
  }
};

export {
  getGeneralAnalytics,
  getOrderAnalytics,
  getTotalSalesAnalytics,
  getUserAnalytics,
  adminDashboard,
};
