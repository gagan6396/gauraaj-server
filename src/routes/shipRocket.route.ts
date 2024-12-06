import express from "express";
import {
  createOrder,
  cancelOrder,
  returnOrderController,
} from "../controllers/shipRocket.controller";

const shipRocketRoute = express.Router();

// Define endpoints
shipRocketRoute.post("/order", createOrder);
shipRocketRoute.post("/cancel", cancelOrder);
shipRocketRoute.post("/return", returnOrderController);

export default shipRocketRoute;
