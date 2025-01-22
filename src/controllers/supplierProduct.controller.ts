import productModel from "../models/Product.model";
import supplierModel from "../models/Supplier.model";
import { Response, Request } from "express";
import apiResponse from "../utils/ApiResponse";
import mongoose from "mongoose";
import categoryModel from "../models/Category.model";

// Supplier Product Management
<<<<<<< HEAD

const addProductBySupplier = async (req: Request, res: Response) => {
  try {
    const { supplierId } = req.params;
=======
const addProductBySupplier = async (req: Request, res: Response) => {
  try {
    const { supplierId } = req.params;

    // Validate JSON and parse it
    if (!req.body.data || typeof req.body.data !== "string") {
      return apiResponse(res, 400, false, "Invalid or missing 'data' field");
    }

>>>>>>> ravichandra/main
    const {
      name,
      description,
      price,
      stock,
      category_id,
      subcategory_id,
<<<<<<< HEAD
      imageUrls,
      colors,
      sizes,
=======
      skuParameters,
>>>>>>> ravichandra/main
      brand,
      weight,
      dimensions,
      sku,
<<<<<<< HEAD
    } = req.body;

    // Validate supplierId
=======
    } = JSON.parse(req.body.data);

    // Ensure image URLs are added from the upload middleware
    let imageUrls: string[] = [];
    if (req.body.imageUrls && Array.isArray(req.body.imageUrls)) {
      imageUrls = req.body.imageUrls;
    } else if (req.body.imageUrl) {
      imageUrls = [req.body.imageUrl];
    }

    console.log(imageUrls);

>>>>>>> ravichandra/main
    if (!mongoose.isValidObjectId(supplierId)) {
      return apiResponse(res, 400, false, "Invalid supplier ID format");
    }

    // Validate required fields
    if (
      !name ||
      !description ||
      !price ||
      !stock ||
      !category_id ||
<<<<<<< HEAD
      !imageUrls ||
      !colors ||
      !sizes ||
      !brand ||
      !weight ||
      !dimensions ||
      !sku
=======
      !skuParameters ||
      !brand ||
      !weight ||
      !dimensions ||
      !sku ||
      !imageUrls.length
>>>>>>> ravichandra/main
    ) {
      return apiResponse(
        res,
        400,
        false,
        "Please fill all the required fields"
      );
    }

<<<<<<< HEAD
    // Validate colors and sizes as arrays
    if (!Array.isArray(colors) || !Array.isArray(sizes)) {
      return apiResponse(res, 400, false, "Colors and Sizes must be arrays");
    }

    // Validate each color object
    if (
      colors.some(
        (color: any) =>
          !color.name ||
          typeof color.name !== "string" ||
          !color.stock ||
          typeof color.stock !== "number"
      )
    ) {
      return apiResponse(res, 400, false, "Invalid color format");
    }

    // Validate each size object
    if (
      sizes.some(
        (size: any) =>
          !size.name ||
          typeof size.name !== "string" ||
          !size.stock ||
          typeof size.stock !== "number"
      )
    ) {
      return apiResponse(
        res,
        400,
        false,
        "Each size must have a 'name' (string) and 'stock' (number)"
      );
    }

    // Validate weight
    if (typeof weight !== "number" || weight <= 0) {
      return apiResponse(res, 400, false, "Invalid weight value");
    }

    // Validate dimensions
    if (
      !dimensions.height ||
      !dimensions.length ||
      !dimensions.width ||
      typeof dimensions.height !== "number" ||
      typeof dimensions.length !== "number" ||
      typeof dimensions.width !== "number" ||
      dimensions.height <= 0 ||
      dimensions.length <= 0 ||
      dimensions.width <= 0
    ) {
      return apiResponse(
        res,
        400,
        false,
        "Dimensions must include valid height, length, and width (positive numbers)"
      );
    }

    // Validate SKU uniqueness
=======
    // Validate SKU parameters
    if (
      !Object.keys(skuParameters).length ||
      Object.values(skuParameters).some((param: any) => !Array.isArray(param))
    ) {
      return apiResponse(res, 400, false, "Invalid SKU parameters format");
    }

    // Check if SKU already exists
>>>>>>> ravichandra/main
    const skuExists = await productModel.findOne({ sku });
    if (skuExists) {
      return apiResponse(res, 400, false, "SKU must be unique");
    }

<<<<<<< HEAD
    // Check supplier existence and approval status
=======
    // Validate supplier existence and approval status
>>>>>>> ravichandra/main
    const supplier = await supplierModel.findById(supplierId);
    if (!supplier) {
      return apiResponse(res, 404, false, "Supplier not found");
    }

    if (supplier.approval_status !== "Approved") {
      return apiResponse(res, 403, false, "Supplier is not approved");
    }

    // Validate category existence
    const category = await categoryModel.findById(category_id);
    if (!category) {
      return apiResponse(res, 404, false, "Category not found");
    }

    // Validate subcategory existence (if provided)
<<<<<<< HEAD
    let subCategory = null;
=======
>>>>>>> ravichandra/main
    if (subcategory_id) {
      if (!mongoose.isValidObjectId(subcategory_id)) {
        return apiResponse(res, 400, false, "Invalid subcategory ID");
      }

<<<<<<< HEAD
      subCategory = await categoryModel.findOne({
=======
      const subCategory = await categoryModel.findOne({
>>>>>>> ravichandra/main
        _id: subcategory_id,
        parentCategoryId: category_id,
      });

      if (!subCategory) {
        return apiResponse(
          res,
          404,
          false,
          "Subcategory not found or does not belong to the specified category"
        );
      }
    }

    // Check for duplicate product
    const existingProduct = await productModel.findOne({
      supplier_id: supplierId,
      name,
      category_id,
      subcategory_id: subcategory_id || null,
      brand,
    });

    if (existingProduct) {
      return apiResponse(res, 400, false, "Product already exists");
    }

<<<<<<< HEAD
    // Create a new product
=======
    // Create a new product with the uploaded images
>>>>>>> ravichandra/main
    const newProduct = new productModel({
      supplier_id: supplierId,
      category_id,
      subcategory_id: subcategory_id || null,
      name,
      description,
      price: mongoose.Types.Decimal128.fromString(price.toString()),
      stock,
<<<<<<< HEAD
      images: Array.isArray(imageUrls) ? imageUrls : [imageUrls],
      reviews: [],
      rating: 0,
      color: colors,
      size: sizes,
=======
      images: imageUrls, // Store the uploaded image URLs here
      reviews: [],
      rating: 0,
      skuParameters,
>>>>>>> ravichandra/main
      brand,
      weight,
      dimensions,
      sku,
    });

    // Save the product to the database
    const savedProduct = await newProduct.save();

    // Add the product to the supplier's product list
    supplier.products.push(savedProduct._id);
    await supplier.save();

    return apiResponse(res, 201, true, "Product added successfully", {
      product: savedProduct,
    });
  } catch (error) {
    console.error("Error while adding product by supplier:", error);
    return apiResponse(res, 500, false, "Internal Server Error");
  }
};

const updateProductBySupplier = async (req: Request, res: Response) => {
  try {
    const { supplierId } = req.params;
    const productId = req.body.productId;
    const updateData = req.body;

    if (!productId) {
      return apiResponse(res, 400, false, "Product ID is required");
    }

    const product = await productModel.findById({
      _id: productId,
    });

    if (!product) {
      return apiResponse(res, 404, false, "Product not found");
    }

    if (product.supplier_id.toString() !== supplierId) {
      return apiResponse(
        res,
        403,
        false,
        "Access Denied: You can only update your own products"
      );
    }

    // Handle images upload
    if (req.files && Array.isArray(req.files)) {
      const imageUrls = (req.files as any[]).map((file) => file.location);
      updateData.images = imageUrls; // Store image URLs
    }

    const updatedProduct = await productModel.findByIdAndUpdate(
      productId,
      updateData,
      { new: true }
    );

    return apiResponse(
      res,
      200,
      true,
      "Product updated successfully",
      updatedProduct
    );
  } catch (error) {
    console.error("Error updating product by supplier:", error);
    return apiResponse(res, 500, false, "Internal server error");
  }
};

const getAllSupplierProducts = async (req: Request, res: Response) => {
  try {
    const { supplierId } = req.params;

    if (!supplierId) {
      return apiResponse(res, 400, false, "Supplier ID is required.");
    }

    const products = await productModel.find({ supplier_id: supplierId });

    if (!products || products.length === 0) {
      return apiResponse(
        res,
        404,
        false,
        "No products found for this supplier."
      );
    }

    return apiResponse(
      res,
      200,
      true,
      "Products retrieved successfully",
      products
    );
  } catch (error) {
    console.error("Error fetching supplier products", error);
    return apiResponse(res, 500, false, "Internal server error.");
  }
};

const deleteProductBySupplier = async (req: Request, res: Response) => {
  try {
    const { supplierId, productId } = req.params;

    if (!supplierId || !productId) {
      return apiResponse(
        res,
        400,
        false,
        "Supplier ID and Product ID are required."
      );
    }

    const product = await productModel.findOne({
      _id: productId,
      supplier_id: supplierId,
    });

    if (!product) {
      return apiResponse(
        res,
        404,
        false,
        "Product not found or doesn't belong to this supplier."
      );
    }

    // Delete the product
    await productModel.deleteOne({ _id: productId });

    return apiResponse(res, 200, true, "Product deleted successfully");
  } catch (error) {
    console.error("Error deleting product by supplier:", error);
    return apiResponse(res, 500, false, "Internal server error");
  }
};

// TODO: Compelete this after project complition
const addBulkProductsBySupplier = async (req: Request, res: Response) => {};

export {
  addProductBySupplier,
  updateProductBySupplier,
  getAllSupplierProducts,
  deleteProductBySupplier,
};
