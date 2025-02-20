import { Router } from "express";
import {
    createContact,
    deleteContact,
    getContactById,
    getContacts,
} from "../controllers/contact.controller";
import authMiddleware from "../middlewares/authMiddleware"; // Assuming authentication is required

const contactRoute = Router();

contactRoute.post("/contact", createContact);
contactRoute.get("/contacts", authMiddleware, getContacts);
contactRoute.get("/contact/:id", authMiddleware, getContactById);
contactRoute.delete("/contact/:id", authMiddleware, deleteContact);

// TODO: Implement update contact logic if needed

export default contactRoute;
