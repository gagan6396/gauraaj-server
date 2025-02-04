import bcrypt from "bcrypt";
import mongoose, { Document, Schema } from "mongoose";

const password = process.env.ADMIN_PASSWORD;
if (!password) {
  throw new Error("ADMIN_PASSWORD environment variable is not set");
}

const saltRounds = 10;

const hashPassword = async () => {
  return await bcrypt.hash(password, saltRounds);
};

// Define Admin interface and schema
export interface Admin extends Document {
  username: "admin";
  email: "ravichandraofficial121@gmail.com";
  password: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
  permission: {
    manageUser: boolean;
    manageOrders: boolean;
    manageProducts: boolean;
    manageCategory: boolean;
    manageSuppliers: boolean;
    viewAnalytics: boolean;
    manageMarketing: boolean;
  };
}

// Admin Schema
const adminSchema: Schema<Admin> = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      default: "Admin",
    },
    permission: {
      manageUser: {
        type: Boolean,
        default: false,
      },
      manageOrders: {
        type: Boolean,
        default: false,
      },
      manageProducts: {
        type: Boolean,
        default: false,
      },
      manageCategory: {
        type: Boolean,
        default: false,
      },
      manageSuppliers: {
        type: Boolean,
        default: false,
      },
      viewAnalytics: {
        type: Boolean,
        default: false,
      },
      manageMarketing: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    timestamps: true,
  }
);

const adminModel =
  mongoose.models.Admin || mongoose.model<Admin>("Admin", adminSchema);

export default adminModel;

// const insertAdmin = async () => {
//   try {
//     const hashedPassword = await hashPassword();

//     const newAdmin = new adminModel({
//       username: "admin",
//       email: "ravichandraofficial121@gmail.com",
//       password: hashedPassword,
//       role: "Admin",
//       permission: {
//         manageUser: true,
//         manageOrders: true,
//         manageProducts: true,
//         manageCategory: true,
//         manageSuppliers: true,
//         viewAnalytics: true,
//         manageMarketing: true,
//       },
//     });

//     await newAdmin.save();
//     console.log("Admin inserted successfully");
//   } catch (error) {
//     console.error("Error inserting admin:", error);
//   }
// };

// insertAdmin();
