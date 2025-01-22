<<<<<<< HEAD
import dotenv from "dotenv";
import mongoose from "mongoose";
import app from "./src/app";
=======
import mongoose from "mongoose";
import dotenv from "dotenv";
import app from "./src/app";
import { connectRedis } from "./src/config/redisClient";
>>>>>>> ravichandra/main

dotenv.config();

const PORT = process.env.PORT || 4001;
const DbURL = process.env.DATABASE_URL;

const startServer = async () => {
  try {
    // Validate DB URL
    if (!DbURL) {
      throw new Error(
        "DATABASE_URL is not defined in the environment variables."
      );
    }

    // Connect to the database
    await mongoose.connect(DbURL);
    console.log("🚀 Connected to MongoDB successfully!");

<<<<<<< HEAD
    // Connecting with redis
    // await connectRedis();
=======
    await connectRedis();
>>>>>>> ravichandra/main

    // Start the server
    app
      .listen(PORT, () => {
        console.log(`🚀 Server is running on http://localhost:${PORT}`);
      })
      .on("error", (err) => {
        console.error("❌ Error starting the server:", err.message);
        process.exit(1);
      });
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

startServer();
