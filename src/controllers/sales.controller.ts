import { Request, Response } from "express";
import apiResponse from "../utils/ApiResponse";
import SalesTeamModel from "../models/SalesTeam.model";
import bcrypt from "bcrypt";
import { generateToken } from "../utils/jwtHelper";
import { sendOtpEmail } from "../utils/EmailHelper";

const registerSalesMember = async (req: Request, res: Response) => {
  try {
    const { name, email, password, phone } = req.body;

    // Check if all fields are provided
    if (!name || !email || !password || !phone) {
      return apiResponse(res, 400, false, "Please fill all the fields");
    }

    // Check if the email already exists
    const existMember = await SalesTeamModel.findOne({ email });
    if (existMember) {
      return apiResponse(res, 400, false, "Email already exists");
    }

    // Check if the phone number already exists
    const existingPhone = await SalesTeamModel.findOne({ phone });
    if (existingPhone) {
      return apiResponse(res, 400, false, "Phone number already in use");
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new SalesTeam member
    const newSalesTeamMember = new SalesTeamModel({
      name,
      email,
      phone,
      password: hashedPassword,
      assignedTerritories: [],
      salesTargets: [],
      performanceMetrics: {
        totalSales: 0.0,
        numberOfClients: 0,
        incentivesEarned: 0.0,
        conversionRate: 0.0,
      },
      resourcesAccess: [],
      reportingManager: null,
      joinedAt: new Date(),
      lastActivity: new Date(),
    });

    // Save the new member
    await newSalesTeamMember.save();

    // Return success response
    return apiResponse(res, 200, true, "Sales Member Registered Successfully", {
      id: newSalesTeamMember._id,
      name: newSalesTeamMember.name,
      email: newSalesTeamMember.email,
      phone: newSalesTeamMember.phone,
    });
  } catch (error) {
    console.error("Error registering sales member:", error);
    return apiResponse(res, 500, false, "Error registering sales member");
  }
};

const loginSalesMember = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Check if email and password are provided
    if (!email || !password) {
      return apiResponse(
        res,
        400,
        false,
        "Please provide both email and password"
      );
    }

    // Find the sales team member by email
    const salesMember = await SalesTeamModel.findOne({ email });
    if (!salesMember) {
      return apiResponse(res, 400, false, "Invalid email or password");
    }

    // Compare the provided password with the stored hashed password
    const isMatch = await bcrypt.compare(password, salesMember.password);
    if (!isMatch) {
      return apiResponse(res, 400, false, "Invalid email or password");
    }

    const token = generateToken({ _id: salesMember._id, role: "SalesMember" });

    // Send the response with the token
    return apiResponse(res, 200, true, "Login successful", {
      token,
      user: {
        id: salesMember._id,
        name: salesMember.name,
        email: salesMember.email,
        phone: salesMember.phone,
      },
    });
  } catch (error) {
    console.error("Error logging in sales member:", error);
    return apiResponse(res, 500, false, "Server error during login");
  }
};

const logOut = async (req: Request, res: Response) => {
  try {
    // Remove the token from the user's session

    return apiResponse(res, 200, true, "Logout succesfully");
  } catch (error) {
    console.error("Error logout salesMember", error);
    return apiResponse(res, 500, false, "Server error during logout");
  }
};

const forgotPasswordSalesMember = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return apiResponse(res, 400, false, "Please provide email");
    }

    const salesMember = await SalesTeamModel.findOne({
      email,
    });

    if (!salesMember) {
      return apiResponse(res, 400, false, "Email not found");
    }

    const otp = await sendOtpEmail(salesMember.email);

    salesMember.passwordResetOTP = otp;
    salesMember.passwordResetOTPExpiration = Date.now() + 600000;
    await salesMember.save();

    return apiResponse(res, 200, true, "Otp sent successfully");
  } catch (error) {
    console.error("Error forgating password", error);
    return apiResponse(res, 500, false, "Server error during forgot password");
  }
};

const resetSalesMemberPassword = async (req: Request, res: Response) => {
  try {
    const { email, otp, newPassword } = req.body;
    const saltRounds = 10;

    if (!email || !otp || !newPassword) {
      return apiResponse(res, 400, false, "Please provide all fields");
    }

    const salesMember = await SalesTeamModel.findOne({
      email,
    });

    if (!salesMember) {
      return apiResponse(res, 400, false, "Email not found");
    }

    if (salesMember.paasswordResetOTP !== otp) {
      return apiResponse(res, 400, false, "Invalid otp");
    }

    if (Date.now() > salesMember.passwordResetOTPExpiration) {
      return apiResponse(res, 400, false, "Otp expired");
    }

    const hashPassword = await bcrypt.hash(newPassword, saltRounds);

    salesMember.password = hashPassword;
    salesMember.passwordResetOTP = null;
    salesMember.passwordResetOTPExpiration = null;

    await salesMember.save();

    return apiResponse(res, 200, true, "Password Reset Successfully");
  } catch (error) {
    console.error("Error resetting password", error);
    return apiResponse(res, 500, false, "Server error during reset password");
  }
};

// Get assigned Territories
const getAssignedTerritories = async (req: Request, res: Response) => {
  try {
    const { memberId } = req.params;

    if (!memberId) {
      return apiResponse(res, 400, false, "Sales member ID is required");
    }

    const salesMember = await SalesTeamModel.findById(memberId).populate(
      "assignedTerritories"
    ); // Fetch the assigned territories

    if (!salesMember) {
      return apiResponse(res, 404, false, "Sales team member not found");
    }

    return apiResponse(
      res,
      200,
      true,
      "Assigned territories fetched successfully",
      salesMember.assignedTerritories
    );
  } catch (error) {
    console.error("Error fetching assigned territories:", error);
    return apiResponse(
      res,
      500,
      false,
      "Server error during territories retrieval"
    );
  }
};

// member profile management API's

const getSalesMemberProfile = async (req: Request, res: Response) => {
  try {
    const { memberId } = req.params;

    if (!memberId) {
      return apiResponse(res, 400, false, "Sales member ID is required");
    }

    const salesMember = await SalesTeamModel.findById(memberId).select(
      "-password"
    );
    if (!salesMember) {
      return apiResponse(res, 404, false, "Sales team member not found");
    }

    return apiResponse(
      res,
      200,
      true,
      "Sales member profile fetched",
      salesMember
    );
  } catch (error) {
    console.error("Error fetching sales Member profile", error);
    return apiResponse(
      res,
      500,
      false,
      "Server error during profile retrieval"
    );
  }
};

const updateSalesMemberProfile = async (req: Request, res: Response) => {
  try {
    const { memberId } = req.params;
    const { name, phone } = req.body;

    if (!memberId) {
      return apiResponse(res, 400, false, "Sales member ID is required");
    }

    const updatedProfile = await SalesTeamModel.findByIdAndUpdate(
      memberId,
      { name, phone, lastActivity: new Date() },
      { new: true }
    ).select("-password");

    if (!updatedProfile) {
      return apiResponse(res, 404, false, "Sales team member not found");
    }

    return apiResponse(
      res,
      200,
      true,
      "Sales member profile updated",
      updatedProfile
    );
  } catch (error) {
    console.error("Error updating sales member", error);
    return apiResponse(
      res,
      400,
      false,
      "Error while updating sales member profile"
    );
  }
};

const getPerformanceMetrics = async (req: Request, res: Response) => {
  try {
    const { memberId } = req.params;

    const salesMember = await SalesTeamModel.findById(memberId).select(
      "performanceMetrics name email"
    );

    if (!salesMember) {
      return apiResponse(res, 404, false, "Sales member not found");
    }

    return apiResponse(
      res,
      200,
      true,
      "Performance metrics fetched",
      salesMember.performanceMetrics
    );
  } catch (error) {
    console.error("Error while fetching performance metrics", error);
    return apiResponse(res, 500, false, "Error fetching perofrmance metrics");
  }
};
export {
  registerSalesMember,
  loginSalesMember,
  logOut,
  forgotPasswordSalesMember,
  resetSalesMemberPassword,
  getAssignedTerritories,
  getSalesMemberProfile,
  updateSalesMemberProfile,
  getPerformanceMetrics,
};
