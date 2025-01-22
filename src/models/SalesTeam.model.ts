import mongoose, { Schema, Document } from "mongoose";

// Interface defining the SalesTeam document structure
export interface SalesTeam extends Document {
<<<<<<< HEAD
  userId: mongoose.Types.ObjectId;
=======
>>>>>>> ravichandra/main
  name: string;
  email: string;
  phone: string;
  passwordResetOTP: number;
  passwordResetOTPExpiration: Date;
  assignedTerritories: string[];
  salesTargets: SalesTarget[];
  performanceMetrics: PerformanceMetrics;
  resourcesAccess: string[];
  reportingManager: mongoose.Types.ObjectId | null;
  joinedAt: Date;
  lastActivity: Date;
}

interface SalesTarget {
  targetAmount: mongoose.Types.Decimal128;
  achievedAmount: mongoose.Types.Decimal128;
  period: string;
  status: "Pending" | "Achieved" | "Overachieved";
}

interface PerformanceMetrics {
  totalSales: mongoose.Types.Decimal128;
  numberOfClients: number;
  incentivesEarned: mongoose.Types.Decimal128;
  conversionRate: mongoose.Types.Decimal128;
}

// Mongoose schema for SalesTeam
const salesSchema: Schema<SalesTeam> = new Schema(
  {
<<<<<<< HEAD
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
=======
>>>>>>> ravichandra/main
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
    },
    assignedTerritories: {
      type: [String],
      default: [],
    },
    salesTargets: [
      {
        targetAmount: {
          type: mongoose.Schema.Types.Decimal128,
          required: true,
        },
        achievedAmount: {
          type: mongoose.Schema.Types.Decimal128,
          default: 0.0,
        },
        period: {
          type: String,
          required: true,
        },
        status: {
          type: String,
          enum: ["Pending", "Achieved", "Overachieved"],
          default: "Pending",
        },
      },
    ],
    performanceMetrics: {
      totalSales: {
        type: mongoose.Types.Decimal128,
        default: 0.0,
      },
      numberOfClients: {
        type: Number,
        default: 0,
      },
      incentivesEarned: {
        type: mongoose.Types.Decimal128,
        default: 0.0,
      },
      conversionRate: {
        type: mongoose.Types.Decimal128,
        default: 0.0,
      },
    },
    resourcesAccess: {
      type: [String],
      default: [],
    },
    reportingManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const SalesTeamModel =
  mongoose.models.SalesTeam ||
  mongoose.model<SalesTeam>("SalesTeam", salesSchema);

export default SalesTeamModel;
