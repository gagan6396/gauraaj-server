import { Router } from "express";
import {
    addProductToReel,
    createReel,
    deleteReel,
    getReelById,
    getReels,
} from "../controllers/reel.controller";
import authMiddleware from "../middlewares/authMiddleware"; // Assuming authentication is required

const reelRoute = Router();

reelRoute.post("/", authMiddleware, createReel);
reelRoute.get("/", getReels);
reelRoute.get("/:id", getReelById);
reelRoute.delete("/:id", authMiddleware, deleteReel);
reelRoute.post("/:id/add-product", authMiddleware, addProductToReel);

export default reelRoute;
