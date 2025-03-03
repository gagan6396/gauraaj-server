import { Request, Response } from "express";
import mongoose from "mongoose";
import slugify from "slugify";
import categoryModel, { ICategory } from "../models/Category.model";
import productModel from "../models/Product.model";
import apiResponse from "../utils/ApiResponse";

// Create the category
const createCategory = async (req: Request, res: Response) => {
  try {
    const { name, description, parentCategoryId } = JSON.parse(req.body.data);
    const images = req.body.imageUrls || [];

    // Validate required fields
    if (!name || !description) {
      return apiResponse(res, 400, false, "Name and description are required.");
    }

    // Validate images
    if (images.length === 0) {
      return apiResponse(res, 400, false, "At least one image is required.");
    }
    if (images.length > 5) {
      return apiResponse(
        res,
        400,
        false,
        "A category can have up to 5 images."
      );
    }

    const slug = slugify(name, { lower: true });

    const newCategory = new categoryModel({
      name,
      description,
      slug,
      images,
      parentCategoryId,
    });

    // Save the category
    await newCategory.save();

    return apiResponse(res, 201, true, "Category created successfully", {
      ...newCategory.toObject(),
    });
  } catch (error: any) {
    console.error("Error creating category:", error);

    // Handle duplicate key error
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyValue)[0];
      const duplicateValue = error.keyValue[duplicateField];
      return apiResponse(
        res,
        400,
        false,
        `Category with ${duplicateField} "${duplicateValue}" already exists.`
      );
    }

    // Handle other errors
    return apiResponse(res, 500, false, "Internal server error");
  }
};

// Get all category
const getAllCategory = async (req: Request, res: Response) => {
  try {
    const category = await categoryModel
      .find({ parentCategoryId: null })
      .populate("parentCategoryId", "name")
      .sort({ name: 1 });

    if (category.length === 0 || !category) {
      return apiResponse(res, 404, false, "Category is Empty");
    }

    return apiResponse(
      res,
      200,
      true,
      "Category fetched successfully",
      category
    );
  } catch (error) {
    console.error("Error while fetching category", error);
    return apiResponse(res, 500, false, "Error while fetching category");
  }
};

const fetchCategoryById = async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.params;

    // Fetch the category by ID
    const category = await categoryModel.findById(categoryId);

    if (!category) {
      return apiResponse(res, 404, false, "Category not found");
    }

    return apiResponse(
      res,
      200,
      true,
      "Category fetched successfully",
      category
    );
  } catch (error) {
    console.error("Error fetching category:", error);
    return apiResponse(res, 500, false, "Internal server error");
  }
};

const updateCategory = async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return apiResponse(res, 404, false, "Invalid Category Id");
    }

    let updates: { [key: string]: any } = {};

    if (req.body.data) {
      try {
        const parsedData = JSON.parse(req.body.data);
        updates.name = parsedData.name || undefined;
        updates.description = parsedData.description || undefined;

        if (updates.name) {
          updates.slug = slugify(updates.name, { lower: true });
        }
      } catch (error) {
        return apiResponse(
          res,
          400,
          false,
          "Invalid data format in 'data' field"
        );
      }
    }

    // if (req.body.imageUrls !== undefined && req.body.imageUrls !== null ) {
    //   updates.images = req.body.imageUrls;
    // }

    if (req.body.imageUrls.length !== 0) {
      updates.images = req.body.imageUrls;
    }

    const updatedCategory = await categoryModel.findByIdAndUpdate(
      categoryId,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!updatedCategory) {
      return apiResponse(res, 404, false, "Category not found");
    }

    return apiResponse(
      res,
      200,
      true,
      "Category updated successfully",
      updatedCategory
    );
  } catch (error) {
    console.error("Error while updating category:", error);
    return apiResponse(res, 500, false, "Error while updating category");
  }
};

const deleteCategory = async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return apiResponse(res, 404, false, "Invalid Category Id");
    }

    const subCategory = await categoryModel.find({
      parentCategoryId: categoryId,
    });
    if (subCategory.length > 0) {
      return apiResponse(
        res,
        400,
        false,
        "Can't delete category with subCategory"
      );
    }

    const deletedCategory = await categoryModel.findByIdAndDelete(categoryId);
    if (!deletedCategory) {
      return apiResponse(res, 404, false, "Category not found");
    }

    return apiResponse(res, 200, true, "Category deleted successfully");
  } catch (error) {
    console.error("Error while deleting category", error);
    return apiResponse(res, 500, false, "Error while deleting category");
  }
};

// SubCategory Inserting
const fetchSubCategoryById = async (req: Request, res: Response) => {
  try {
    const { categoryId, subCategoryId } = req.params;

    const subCategory = await categoryModel.findOne({
      _id: subCategoryId,
      parentCategoryId: categoryId,
    });

    if (!subCategory) {
      return apiResponse(res, 404, false, "Subcategory not found");
    }

    return apiResponse(
      res,
      200,
      true,
      "Subcategory fetched successfully",
      subCategory
    );
  } catch (error) {
    console.error("Error fetching subcategory:", error);
    return apiResponse(res, 500, false, "Internal server error");
  }
};

// Fetching SubCategory of Category
const subCategoryFetching = async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.params;
    const subCategory = await categoryModel.find({
      parentCategoryId: categoryId,
    });

    if (!subCategory || subCategory.length === 0) {
      return apiResponse(res, 404, false, "Sub Category is Empty");
    }

    return apiResponse(
      res,
      200,
      true,
      "SubCategories fetched successfully",
      subCategory
    );
  } catch (error) {
    console.error("Error while fetching sub category", error);
    return apiResponse(res, 500, false, "Error while fetching sub category");
  }
};

const createSubCategory = async (req: Request, res: Response) => {
  try {
    // Parse the incoming data
    const { name, description, imageUrls, skuParameters } = JSON.parse(
      req.body.data
    );

    // Ensure `images` are properly handled from the request
    const images = req.body.imageUrls || imageUrls || [];

    // Validate required fields
    if (!name || !description) {
      return apiResponse(res, 400, false, "Name and description are required");
    }

    // Validate images: Ensure at least one image is provided and limit to 5 images
    if (!Array.isArray(images) || images.length === 0) {
      return apiResponse(res, 400, false, "At least one image is required.");
    }
    if (images.length > 5) {
      return apiResponse(
        res,
        400,
        false,
        "A subcategory can have up to 5 images."
      );
    }

    // Generate a slug if not provided
    const slug = req.body.slug || slugify(name, { lower: true });

    // Validate the parent category
    const { categoryId } = req.params;
    const parentCategory = await categoryModel.findById(categoryId);
    if (!parentCategory) {
      return apiResponse(res, 404, false, "Parent category not found");
    }

    // Validate SKU parameters
    // if (skuParameters && !Array.isArray(skuParameters)) {
    //   return apiResponse(res, 400, false, "SKU parameters must be an array");
    // }

    // Create and save the new subcategory
    const newSubCategory = new categoryModel({
      name,
      description,
      slug,
      images, // Save the validated image URLs
      parentCategoryId: categoryId,
      // skuParameters: skuParameters || parentCategory.skuParameters, // Inherit from parent if not provided
    });

    await newSubCategory.save();

    // Respond with the newly created subcategory, including images
    return apiResponse(res, 201, true, "Subcategory created successfully", {
      ...newSubCategory.toObject(),
    });
  } catch (error: any) {
    console.error("Error creating subcategory:", error);

    // Handle duplicate key error
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyValue)[0];
      const duplicateValue = error.keyValue[duplicateField];
      return apiResponse(
        res,
        400,
        false,
        `Subcategory with ${duplicateField} "${duplicateValue}" already exists`
      );
    }

    // Handle other errors
    return apiResponse(res, 500, false, "Internal server error");
  }
};

const deleteSubCategory = async (req: Request, res: Response) => {
  try {
    const { categoryId, subCategoryId } = req.params;

    const subCategory = await categoryModel.findById(subCategoryId);
    if (!subCategory) {
      return apiResponse(res, 404, false, "Subcategory not found");
    }

    if (subCategory.parentCategoryId.toString() !== categoryId) {
      return apiResponse(
        res,
        400,
        false,
        "Subcategory does not belong to this category"
      );
    }

    // Delete subcategory
    await categoryModel.findByIdAndDelete(subCategoryId);

    return apiResponse(res, 200, true, "Subcategory deleted successfully");
  } catch (error) {
    console.error("Error deleting subcategory:", error);
    return apiResponse(res, 500, false, "Internal server error");
  }
};

const fetchProductBySubCategory = async (req: Request, res: Response) => {
  const { subCategoryId } = req.params;

  if (!mongoose.isValidObjectId(subCategoryId)) {
    return apiResponse(res, 400, false, "Invalid subcategory id");
  }

  const products = await productModel.find({
    subcategory_id: subCategoryId,
  });

  if (products.length === 0) {
    return apiResponse(
      res,
      404,
      false,
      "No products found for this subcategory"
    );
  }

  return apiResponse(res, 200, true, "Products fetched successfully", products);
};

const fetchProductByCategory = async (req: Request, res: Response) => {
  const { CategoryId } = req.params;

  if (!mongoose.isValidObjectId(CategoryId)) {
    return apiResponse(res, 400, false, "Invalid subcategory id");
  }

  const products = await productModel.find({
    category_id: CategoryId,
  });

  if (products.length === 0) {
    return apiResponse(
      res,
      404,
      false,
      "No products found for this subcategory"
    );
  }

  return apiResponse(res, 200, true, "Products fetched successfully", products);
};

const getSubcategorySkuParameters = async (req: Request, res: Response) => {
  try {
    const { categoryId, subCategoryId } = req.params;

    console.log("Category ID:", categoryId); // Log categoryId
    console.log("Subcategory ID:", subCategoryId); // Log subcategoryId

    const subcategory = await categoryModel
      .findOne({ _id: subCategoryId, parentCategoryId: categoryId })
      .lean<ICategory>();

    // Log the result to debug
    console.log("Fetched subcategory:", subcategory);

    // Check if subcategory exists and belongs to the specified categoryId
    if (!subcategory) {
      return apiResponse(
        res,
        404,
        false,
        "Subcategory not found under this category"
      );
    }

    // Retrieve SKU parameters from the subcategory (if any)
    const skuParameters = subcategory.skuParameters || [];

    return apiResponse(res, 200, true, "SKU parameters fetched successfully", {
      skuParameters,
    });
  } catch (error) {
    console.error("Error fetching SKU parameters:", error);
    return apiResponse(res, 500, false, "Internal server error");
  }
};

// Fetch All subCategories
const getAllSubcategories = async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.params;

    if (!categoryId) {
      return apiResponse(res, 400, false, "Category ID is required");
    }

    const subcategories = await categoryModel
      .find({
        parentCategoryId: categoryId,
        status: true,
      })
      .select("-__v -createdAt -updatedAt");

    if (subcategories.length === 0) {
      return apiResponse(
        res,
        404,
        false,
        "Subcategories not found under this category"
      );
    }

    return apiResponse(
      res,
      200,
      true,
      "Subcategories fetched successfully",
      subcategories
    );
  } catch (error) {
    console.error("Error ");
  }
};

const updateSubCategory = async (req: Request, res: Response) => {
  try {
    const { categoryId, subCategoryId } = req.params;

    console.log("Request Body : ", req.body);

    if (
      !mongoose.Types.ObjectId.isValid(categoryId) ||
      !mongoose.Types.ObjectId.isValid(subCategoryId)
    ) {
      return apiResponse(res, 400, false, "Invalid category or subcategory ID");
    }

    // Fetch existing subcategory
    const subCategory = await categoryModel.findById(subCategoryId);
    if (!subCategory) {
      return apiResponse(res, 404, false, "Subcategory not found");
    }

    let updateData: { [key: string]: any } = {};

    // Check if 'data' field exists and parse it
    if (req.body.data) {
      try {
        const parsedData = JSON.parse(req.body.data); // Parse JSON string in 'data'
        console.log("Parsed Data:", parsedData);

        updateData.name = parsedData.name || undefined;
        updateData.description = parsedData.description || undefined;
        // updateData.skuParameters = parsedData.skuParameters || undefined;

        if (updateData.name) {
          updateData.slug = slugify(updateData.name, { lower: true });
        }
      } catch (error) {
        return apiResponse(
          res,
          400,
          false,
          "Invalid JSON format in 'data' field"
        );
      }
    } else {
      return apiResponse(res, 400, false, "'data' field is required");
    }

    if (req.body.imageUrls) {
      updateData.images = req.body.imageUrls;
    }

    console.log("Update Data before applying:", updateData);

    // Update the subcategory in the database
    const updatedSubCategory = await categoryModel.findByIdAndUpdate(
      subCategoryId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    console.log("Updated SubCategory:", updatedSubCategory);

    if (!updatedSubCategory) {
      return apiResponse(res, 404, false, "Subcategory not found");
    }

    return apiResponse(
      res,
      200,
      true,
      "Subcategory updated successfully",
      updatedSubCategory
    );
  } catch (error) {
    console.error("Error while updating subcategory:", error);
    return apiResponse(res, 500, false, "Error while updating subcategory");
  }
};

export {
  createCategory,
  createSubCategory,
  deleteCategory,
  deleteSubCategory,
  fetchCategoryById,
  fetchProductByCategory,
  fetchProductBySubCategory,
  fetchSubCategoryById,
  getAllCategory, getAllSubcategories, getSubcategorySkuParameters, subCategoryFetching,
  updateCategory,
  updateSubCategory
};

