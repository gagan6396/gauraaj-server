import { Request, Response } from "express";
import ContactModel from "../models/contact.modal";
import apiResponse from "../utils/ApiResponse";

/**
 * @desc Create a new contact request
 * @route POST /api/contact
 */
export const createContact = async (req: Request, res: Response) => {
  try {
    const { name, phone, category, message } = req.body;

    // Validate required fields
    if (!name || !phone || !category || !message) {
      return apiResponse(res, 400, false, "All fields are required.");
    }

    const contact: any = await ContactModel.create({
      name,
      phone,
      category,
      message,
    });

    return apiResponse(
      res,
      201,
      true,
      "Contact request submitted successfully",
      contact
    );
  } catch (error) {
    console.error("Error creating contact request", error);
    return apiResponse(res, 500, false, "Error creating contact request");
  }
};

/**
 * @desc Fetch all contact requests
 * @route GET /api/contacts
 */
export const getContacts = async (req: Request, res: Response) => {
  try {
    const contacts = await ContactModel.find().sort({ createdAt: -1 });
    return apiResponse(
      res,
      200,
      true,
      "Contacts fetched successfully",
      contacts
    );
  } catch (error) {
    console.error("Error fetching contacts", error);
    return apiResponse(res, 500, false, "Error fetching contacts");
  }
};

/**
 * @desc Fetch a single contact request by ID
 * @route GET /api/contact/:id
 */
export const getContactById = async (req: Request, res: Response) => {
  try {
    const contact: any = await ContactModel.findById(req.params.id);
    if (!contact) {
      return apiResponse(res, 404, false, "Contact not found.");
    }
    return apiResponse(res, 200, true, "Contact fetched successfully", contact);
  } catch (error) {
    console.error("Error fetching contact details", error);
    return apiResponse(res, 500, false, "Error fetching contact details");
  }
};

/**
 * @desc Delete a contact request
 * @route DELETE /api/contact/:id
 */
export const deleteContact = async (req: Request, res: Response) => {
  try {
    const contact = await ContactModel.findByIdAndDelete(req.params.id);
    if (!contact) {
      return apiResponse(res, 404, false, "Contact not found.");
    }
    return apiResponse(res, 200, true, "Contact deleted successfully");
  } catch (error) {
    console.error("Error deleting contact", error);
    return apiResponse(res, 500, false, "Error deleting contact");
  }
};
