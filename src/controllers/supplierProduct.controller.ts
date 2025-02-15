import { Response } from "express";
import mongoose from "mongoose";
import categoryModel from "../models/Category.model";
import productModel from "../models/Product.model";
import supplierModel from "../models/Supplier.model";
import apiResponse from "../utils/ApiResponse";

// Supplier Product Management
const addProductBySupplier = async (req: any, res: Response) => {
  try {
    // const { supplierId } = req.params;
    const supplierId = req?.user?.id;
    // Validate JSON and parse it
    if (!req.body.data || typeof req.body.data !== "string") {
      return apiResponse(res, 400, false, "Invalid or missing 'data' field");
    }

    const {
      name,
      description,
      price,
      stock,
      category_id,
      subcategory_id,
      skuParameters,
      brand,
      weight,
      dimensions,
      sku,
    } = JSON.parse(req.body.data);

    // Ensure image URLs are added from the upload middleware
    let imageUrls: string[] = [];
    if (req.body.imageUrls && Array.isArray(req.body.imageUrls)) {
      imageUrls = req.body.imageUrls;
    } else if (req.body.imageUrl) {
      imageUrls = [req.body.imageUrl];
    }

    console.log(imageUrls);

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
      // !skuParameters ||
      !brand ||
      !weight ||
      !dimensions ||
      !sku ||
      !imageUrls.length
    ) {
      return apiResponse(
        res,
        400,
        false,
        "Please fill all the required fields"
      );
    }

    // Validate SKU parameters
    // if (
    //   !Object.keys(skuParameters).length ||
    //   Object.values(skuParameters).some((param: any) => !Array.isArray(param))
    // ) {
    //   return apiResponse(res, 400, false, "Invalid SKU parameters format");
    // }

    // Check if SKU already exists
    const skuExists = await productModel.findOne({ sku });
    if (skuExists) {
      return apiResponse(res, 400, false, "SKU must be unique");
    }

    // Validate supplier existence and approval status
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
    if (subcategory_id) {
      if (!mongoose.isValidObjectId(subcategory_id)) {
        return apiResponse(res, 400, false, "Invalid subcategory ID");
      }

      const subCategory = await categoryModel.findOne({
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

    // Create a new product with the uploaded images
    const newProduct = new productModel({
      supplier_id: supplierId,
      category_id,
      subcategory_id: subcategory_id || null,
      name,
      description,
      price: mongoose.Types.Decimal128.fromString(price.toString()),
      stock,
      images: imageUrls, // Store the uploaded image URLs here
      reviews: [],
      rating: 0,
      // skuParameters,
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

const updateProductBySupplier = async (req: any, res: Response) => {
  try {
    const supplierId = req?.user?.id;
    const { productId } = req.params;

    let updateData: { [key: string]: any } = req.body;

    // Validate productId
    if (!productId) {
      return apiResponse(res, 400, false, "Product ID is required");
    }

    // Find the product
    const product = await productModel.findById(productId);

    if (!product) {
      return apiResponse(res, 404, false, "Product not found");
    }

    // Check if the product belongs to the supplier
    if (product.supplier_id.toString() !== supplierId) {
      return apiResponse(
        res,
        403,
        false,
        "Access Denied: You can only update your own products"
      );
    }

    // Prepare update data
    updateData = {}; // Reinitialize `updateData` if necessary

    // Extract and parse additional data from 'data'
    if (req.body.data) {
      try {
        const parsedData = JSON.parse(req.body.data);

        // Update basic fields
        updateData.name = parsedData.name || product.name;
        updateData.description = parsedData.description || product.description;
        updateData.price = parsedData.price || product.price;
        updateData.stock = parsedData.stock || product.stock;
        updateData.category_id = parsedData.category_id || product.category_id;
        updateData.subcategory_id =
          parsedData.subcategory_id || product.subcategory_id;

        // Update SKU parameters
        updateData.skuParameters =
          parsedData.skuParameters || product.skuParameters;

        // Update brand, weight, and dimensions
        updateData.brand = parsedData.brand || product.brand;
        updateData.weight = parsedData.weight || product.weight;
        updateData.dimensions = parsedData.dimensions || product.dimensions;

        // Update SKU
        updateData.sku = parsedData.sku || product.sku;

        // Handle imageUrls update
        if (
          parsedData.imageUrls &&
          Array.isArray(parsedData.imageUrls) &&
          parsedData.imageUrls.length > 0
        ) {
          updateData.images = parsedData.imageUrls; // Update with new image URLs
        } else {
          updateData.images = product.images; // Preserve existing images
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

    // Handle uploaded images (if files are present in form-data)
    if (req.files && Array.isArray(req.files)) {
      const uploadedImageUrls = (req.files as any[]).map(
        (file) => file.location
      );
      updateData.images = uploadedImageUrls; // Overwrite with uploaded images
    }

    // Update the product
    const updatedProduct = await productModel.findByIdAndUpdate(
      productId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      return apiResponse(res, 404, false, "Failed to update product");
    }

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

const getAllSupplierProducts = async (req: any, res: Response) => {
  try {
    const supplierId = req?.user?.id;

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

const deleteProductBySupplier = async (req: any, res: Response) => {
  try {
    const { productId } = req.params;
    const supplierId = req?.user?.id;

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

const getProductById = async (req: any, res: Response) => {
  const { productId } = req.params;
  const supplierId = req?.user?.id;

  console.log("supplierId, productId", supplierId, productId);
  try {
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

    return apiResponse(res, 200, true, "Product fetched successfully", product);
  } catch (error) {
    console.error("Error fetched product by supplier:", error);
    return apiResponse(res, 500, false, "Internal server error");
  }
};

export {
  addProductBySupplier,
  deleteProductBySupplier,
  getAllSupplierProducts,
  getProductById,
  updateProductBySupplier
};

