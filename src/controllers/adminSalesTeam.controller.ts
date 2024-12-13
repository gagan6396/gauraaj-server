import { Request, Response } from "express";
import SalesTeamModel from "../models/SalesTeam.model";
import apiResponse from "../utils/ApiResponse";
import mongoose from "mongoose";

const getAllSalesTeamMember = async (req: Request, res: Response) => {
  try {
    const salesMember = await SalesTeamModel.find().populate(
      "userId reportingManager"
    );
    if (!salesMember) {
      return apiResponse(res, 400, false, "No sales team member found");
    }

    return apiResponse(
      res,
      200,
      true,
      "Sales team members fetched successfully",
      salesMember
    );
  } catch (error) {
    console.error("Error fetching all salesTeam member", error);
    return apiResponse(res, 500, true, "Error fetching salesTeam Member");
  }
};

const getSalesTeamMemberById = async (req: Request, res: Response) => {
  try {
    const { memberId } = req.params;
    if (!memberId) {
      return apiResponse(res, 400, false, "Member ID is required");
    }

    const member = await SalesTeamModel.findById({
      _id: memberId,
    }).populate("userId reportingManager");

    if (!member) {
      return apiResponse(res, 400, false, "Member not found");
    }

    return apiResponse(
      res,
      200,
      true,
      "Sales team member fetched successfully",
      member
    );
  } catch (error) {
    console.error("Error fetching sales team member", error);
    return apiResponse(res, 500, false, "Error fetching sales team member");
  }
};

const updateSalesTeamMember = async (req: Request, res: Response) => {
  try {
    const { memberId } = req.params;
    const {
      name,
      email,
      phone,
      assignedTerritories,
      salesTargets,
      performanceMetrics,
      resourcesAccess,
      reportingManager,
    } = req.body;

    if (!memberId) {
      return apiResponse(res, 400, false, "Member ID is required");
    }

    const updatedMember = await SalesTeamModel.findByIdAndUpdate(
      memberId,
      {
        name,
        email,
        phone,
        assignedTerritories,
        salesTargets,
        performanceMetrics,
        resourcesAccess,
        reportingManager,
      },
      { new: true }
    ).populate("userId reportingManager");

    if (!updatedMember) {
      return apiResponse(res, 404, false, "Sales team member not found");
    }

    return apiResponse(
      res,
      200,
      true,
      "Sales team member updated successfully",
      updatedMember
    );
  } catch (error) {
    console.error("Error updating sales team member", error);
    return apiResponse(res, 500, false, "Error updating sales team member");
  }
};

const deleteSalesTeamMember = async (req: Request, res: Response) => {
  try {
    const { memberId } = req.params;

    if (!memberId) {
      return apiResponse(res, 400, false, "Member ID is required");
    }

    const deletedMember = await SalesTeamModel.findByIdAndDelete({
      _id: memberId,
    });

    if (!deletedMember) {
      return apiResponse(res, 404, false, "Sales team member not found");
    }

    return apiResponse(
      res,
      200,
      true,
      "Sales team member deleted successfully",
      deletedMember
    );
  } catch (error) {
    console.error("Error deleting sales team member", error);
    return apiResponse(res, 500, false, "Error deleting sales team member");
  }
};

// update salesPerformance
const updateSalesPerformance = async (req: Request, res: Response) => {
  try {
    const { memberId } = req.params;
    const { totalSales, numberOfClients, incentivesEarned, conversionRate } =
      req.body;

    if (!memberId) {
      return apiResponse(res, 400, false, "Member ID is required");
    }

    const updatedPerformance = await SalesTeamModel.findByIdAndUpdate(
      memberId,
      {
        "performanceMetrics.totalSales": totalSales,
        "performanceMetrics.numberOfClients": numberOfClients,
        "performanceMetrics.incentivesEarned": incentivesEarned,
        "performanceMetrics.conversionRate": conversionRate,
      },
      { new: true }
    ).populate("userId reportingManager");

    if (!updatedPerformance) {
      return apiResponse(res, 404, false, "Sales team member not found");
    }

    return apiResponse(
      res,
      200,
      true,
      "Sales performance updated successfully",
      updatedPerformance
    );
  } catch (error) {
    console.error("Error updating sales performance", error);
    return apiResponse(res, 500, false, "Error updating sales performance");
  }
};

const assignRoleToSalesMember = async (req: Request, res: Response) => {
  try {
    const { memberId } = req.params;
    const { role } = req.body; // Expecting the role to be passed in the request body

    if (!role) {
      return apiResponse(res, 400, false, "Role is required");
    }

    if (!memberId) {
      return apiResponse(res, 400, false, "Member ID is required");
    }

    // Update the member's role
    const updatedMember = await SalesTeamModel.findByIdAndUpdate(
      memberId,
      { role: role },
      { new: true }
    ).populate("userId reportingManager");

    if (!updatedMember) {
      return apiResponse(res, 404, false, "Sales team member not found");
    }

    return apiResponse(
      res,
      200,
      true,
      "Sales team member role assigned successfully",
      updatedMember
    );
  } catch (error) {
    console.error("Error assigning role to sales team member", error);
    return apiResponse(
      res,
      500,
      false,
      "Error assigning role to sales team member"
    );
  }
};

const assignTerritoryToSalesMember = async (req: Request, res: Response) => {
  try {
    const { memberId } = req.params;
    const { territories } = req.body;

    if (!territories || territories.length === 0) {
      return apiResponse(res, 400, false, "At least one territory is required");
    }

    if (!memberId) {
      return apiResponse(res, 400, false, "Member ID is required");
    }

    // Update the member's territories
    const updatedMember = await SalesTeamModel.findByIdAndUpdate(
      memberId,
      { $addToSet: { assignedTerritories: { $each: territories } } }, // Add territories (avoiding duplicates)
      { new: true }
    ).populate("userId reportingManager");

    if (!updatedMember) {
      return apiResponse(res, 404, false, "Sales team member not found");
    }

    return apiResponse(
      res,
      200,
      true,
      "Sales team member territories assigned successfully",
      updatedMember
    );
  } catch (error) {
    console.error("Error assigning territory to sales team member", error);
    return apiResponse(
      res,
      500,
      false,
      "Error assigning territory to sales team member"
    );
  }
};

// assign sales target api
const assignSalesTarget = async (req: Request, res: Response) => {
  try {
    const { memberId } = req.params;
    const { targetAmount, period } = req.body;

    if (!memberId) {
      return apiResponse(res, 400, false, "Member ID is required");
    }

    const updatedMember = await SalesTeamModel.findByIdAndUpdate(
      memberId,
      {
        $push: {
          salesTargets: {
            targetAmount: targetAmount,
            period: period,
            status: "Pending", // Default status when target is assigned
          },
        },
      },
      { new: true }
    ).populate("userId reportingManager");

    if (!updatedMember) {
      return apiResponse(res, 404, false, "Sales team member not found");
    }

    return apiResponse(
      res,
      200,
      true,
      "Sales target assigned successfully",
      updatedMember
    );
  } catch (error) {
    console.error("Error assigning sales target", error);
    return apiResponse(res, 500, false, "Error assigning sales target");
  }
};

// Fetching sales team leadrbord

const getSalesTeamLeaderboard = async (req: Request, res: Response) => {
  try {
    const leaderboard = await SalesTeamModel.find()
      .sort({ "performanceMetrics.totalSales": -1 }) // Sort by total sales in descending order
      .populate("userId reportingManager");

    if (!leaderboard) {
      return apiResponse(res, 400, false, "No sales team members found");
    }

    return apiResponse(
      res,
      200,
      true,
      "Sales team leaderboard fetched successfully",
      leaderboard
    );
  } catch (error) {
    console.error("Error fetching sales team leaderboard", error);
    return apiResponse(
      res,
      500,
      false,
      "Error fetching sales team leaderboard"
    );
  }
};

const getTeamOverview = async (req: Request, res: Response) => {
  try {
    const salesTeam = await SalesTeamModel.find()
      .populate("assignedTerritories")
      .populate("reportingManager");

    if (!salesTeam || salesTeam.length === 0) {
      return apiResponse(res, 404, false, "No sales team members found");
    }

    return apiResponse(
      res,
      200,
      true,
      "Sales team overview fetched successfully",
      salesTeam
    );
  } catch (error) {
    console.error("Error fetching team overview:", error);
    return apiResponse(
      res,
      500,
      false,
      "Server error during team overview retrieval"
    );
  }
};

// Updating performance metrics for memberId
const updatedPerformanceMetrics = async (req: Request, res: Response) => {
  try {
    const { memberId } = req.params;
    const { performanceMetrics } = req.body;

    if (!mongoose.Types.ObjectId.isValid(memberId)) {
      return apiResponse(res, 400, false, "Invalid member ID");
    }

    if (!performanceMetrics) {
      return apiResponse(res, 400, false, "Performance metrics are required");
    }

    const updatedMetrics = await SalesTeamModel.findByIdAndUpdate(
      memberId,
      { performanceMetrics },
      { new: true }
    ).select("performanceMetrics name");

    if (!updatedMetrics) {
      return apiResponse(res, 404, false, "Sales member not found");
    }

    return apiResponse(
      res,
      200,
      true,
      "Performance metrics updated successfully",
      updatedMetrics
    );
  } catch (error) {
    console.error("Error while updating performance metrics", error);
    return apiResponse(res, 500, false, "Error updating metrics");
  }
};

export {
  getAllSalesTeamMember,
  getSalesTeamMemberById,
  updateSalesTeamMember,
  deleteSalesTeamMember,
  updateSalesPerformance,
  assignSalesTarget,
  getSalesTeamLeaderboard,
  assignRoleToSalesMember,
  assignTerritoryToSalesMember,
  getTeamOverview,
  updatedPerformanceMetrics,
};
