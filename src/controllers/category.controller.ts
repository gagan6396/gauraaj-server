import { Request, Response } from "express";
import mongoose from "mongoose";
import slugify from "slugify";
import categoryModel, { ICategory } from "../models/Category.model";
import productModel from "../models/Product.model";
import apiResponse from "../utils/ApiResponse";

// Create the category
const createCategory = async (req: Request, res: Response) => {
  try {
    const { name, description, image, parentCategoryId, imageUrls, imageUrl } =
      req.body;

    console.log("imageUrl", req.file);
    console.log("imageUrls", req.files);

    return apiResponse(res, 201, true, "Category created successfully", {
      imageUrl: req.file,
      imageUrls: req.files,
    });

    if (!name || !description) {
      return apiResponse(res, 400, false, "Name and description are required");
    }

    let slug = req.body.slug;
    if (!slug) {
      slug = slugify(name, { lower: true });
    }

    const newCategory = new categoryModel({
      name,
      description,
      slug,
      image,
      parentCategoryId,
    });

    await newCategory.save();

    return apiResponse(
      res,
      201,
      true,
      "Category created successfully",
      newCategory
    );
  } catch (error) {
    console.error("Error creating category:", error);
    return apiResponse(res, 500, false, "Internal server error");
  }
};
// Get all category

const getAllCategory = async (req: Request, res: Response) => {
  try {
    const category = await categoryModel
      .find()
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

// getSubCategories

const updateCategory = async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.params;
    const updates = req.body;

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return apiResponse(res, 404, false, "Invalid Category Id");
    }

    const updatedCategory = await categoryModel.findByIdAndUpdate(
      categoryId,
      { $set: updates },
      { new: true }
    );

    if (!updatedCategory) {
      return apiResponse(res, 404, false, "Category not found");
    }

    return apiResponse(
      res,
      200,
      true,
      "Category Updates Successfully",
      updatedCategory
    );
  } catch (error) {
    console.error("Error while updating category", error);
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

// const createSubCategory = async (req: Request, res: Response) => {
//   try {
//     const { categoryId } = req.params; // Parent category ID (e.g., Electronics)
//     const { name, description, image } = req.body;

//     // Check if required fields are provided
//     if (!name || !description) {
//       return apiResponse(res, 400, false, "Name and description are required");
//     }

//     let slug = req.body.slug;
//     if (!slug) {
//       slug = slugify(name, { lower: true });
//     }

//     // Check if parent category exists
//     const parentCategory = await categoryModel.findById(categoryId);
//     if (!parentCategory) {
//       return apiResponse(res, 404, false, "Parent category not found");
//     }

//     // Create new subcategory and link to the parent category
//     const newSubCategory = new categoryModel({
//       name,
//       description,
//       slug,
//       image,
//       parentCategoryId: categoryId, // Link to the parent category
//     });

//     await newSubCategory.save();

//     return apiResponse(
//       res,
//       201,
//       true,
//       "Subcategory created successfully",
//       newSubCategory
//     );
//   } catch (error) {
//     console.error("Error creating subcategory:", error);
//     return apiResponse(res, 500, false, "Internal server error");
//   }
// };

const createSubCategory = async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.params;
    const { name, description, image, skuParameters } = req.body;

    // Validate required fields
    if (!name || !description) {
      return apiResponse(res, 400, false, "Name and description are required");
    }

    // Generate slug if not provided
    let slug = req.body.slug || slugify(name, { lower: true });

    // Validate parent category existence
    const parentCategory = await categoryModel.findById(categoryId);
    if (!parentCategory) {
      return apiResponse(res, 404, false, "Parent category not found");
    }

    // Validate SKU parameters
    if (skuParameters && typeof skuParameters !== "object") {
      return apiResponse(res, 400, false, "Invalid SKU parameters format");
    }

    // Create subcategory and link it to the parent
    const newSubCategory = new categoryModel({
      name,
      description,
      slug,
      image,
      parentCategoryId: categoryId,
      skuParameters,
    });

    await newSubCategory.save();

    return apiResponse(
      res,
      201,
      true,
      "Subcategory created successfully",
      newSubCategory
    );
  } catch (error) {
    console.error("Error creating subcategory:", error);
    return apiResponse(res, 500, false, "Internal server error");
  }
};

const updateSubCategory = async (req: Request, res: Response) => {
  try {
    const { categoryId, subCategoryId } = req.params;
    if (
      !mongoose.Types.ObjectId.isValid(categoryId) ||
      !mongoose.Types.ObjectId.isValid(subCategoryId)
    ) {
      return apiResponse(res, 400, false, "Invalid category or subcategory ID");
    }

    const { name, description, image } = req.body;

    if (!name || !description) {
      return apiResponse(res, 400, false, "Name and description are required");
    }

    let slug = req.body.slug;
    const updateDate: any = {};
    if (name) {
      updateDate.name = name;
      if (!slug) {
        slug = slugify(name, { lower: true });
      }
    }
    if (description) {
      updateDate.description = description;
    }
    if (image) {
      updateDate.image = image;
    }

    const updatedSubCategory = await categoryModel.findByIdAndUpdate(
      subCategoryId,
      updateDate,
      { new: true }
    );

    return apiResponse(
      res,
      200,
      true,
      "SubCategory updated",
      updatedSubCategory
    );
  } catch (error) {
    console.error("Error updating subcategory:", error);
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

export const getSubcategorySkuParameters = async (
  req: Request,
  res: Response
) => {
  try {
    const { categoryId, subCategoryId } = req.params;

    console.log("Category ID:", categoryId); // Log categoryId
    console.log("Subcategory ID:", subCategoryId); // Log subcategoryId

    // Fetch the subcategory and check if it belongs to the provided categoryId
    const subcategory = await categoryModel
      .findOne({ _id: subCategoryId, parentCategoryId: categoryId })
      .lean<ICategory>();

    // Log the result to see if the query returns anything
    console.log("Fetched subcategory:", subcategory);

    // Check if subcategory exists and belongs to the specified parent category
    if (!subcategory) {
      return apiResponse(
        res,
        404,
        false,
        "Subcategory not found under this category"
      );
    }

    // Retrieve SKU parameters from the subcategory (if any)
    const skuParameters = subcategory.skuParameters || {};

    return apiResponse(res, 200, true, "SKU parameters fetched successfully", {
      skuParameters,
    });
  } catch (error) {
    console.error("Error fetching SKU parameters:", error);
    return apiResponse(res, 500, false, "Internal server error");
  }
};

export {
  createCategory,
  createSubCategory,
  deleteCategory,
  deleteSubCategory,
  fetchCategoryById,
  fetchProductBySubCategory,
  fetchSubCategoryById,
  getAllCategory,
  subCategoryFetching,
  updateCategory,
  updateSubCategory
};

