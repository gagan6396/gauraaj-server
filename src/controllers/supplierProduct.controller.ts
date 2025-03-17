import { Response } from "express";
import mongoose from "mongoose";
import categoryModel from "../models/Category.model";
import productModel from "../models/Product.model";
import supplierModel from "../models/Supplier.model";
import apiResponse from "../utils/ApiResponse";

interface VariantDiscount {
  type?: "percentage" | "flat";
  value?: number;
  active?: boolean;
  startDate?: Date;
  endDate?: Date;
}

interface VariantData {
  name: string;
  price: number;
  stock: number;
  weight: number;
  dimensions: {
    height: number;
    length: number;
    width: number;
  };
  sku: string;
  images?: string[];
  discount?: VariantDiscount;
}

interface UpdateProductData {
  name?: string;
  description?: string;
  variants?: VariantData[];
  category_id?: string;
  subcategory_id?: string;
  brand?: string;
  images?: { url: string; sequence: number }[];
  video?: string;
  isBestSeller?: boolean;
}

const addProductBySupplier = async (req: any, res: Response) => {
  try {
    const supplierId = req?.user?.id;

    if (!req.body.data || typeof req.body.data !== "string") {
      return apiResponse(res, 400, false, "Invalid or missing 'data' field");
    }

    const {
      name,
      description,
      variants,
      category_id,
      subcategory_id,
      brand,
      video,
      isBestSeller,
    } = JSON.parse(req.body.data);

    const videoUrl = req.body.videoUrl || video;
    let imageData: { url: string; sequence: number }[] = [];
    if (req.body.imageUrls && Array.isArray(req.body.imageUrls)) {
      imageData = req.body.imageUrls.map((url: string, index: number) => ({
        url,
        sequence: index,
      }));
    } else if (req.body.imageUrl) {
      imageData = [{ url: req.body.imageUrl, sequence: 0 }];
    }

    if (!mongoose.isValidObjectId(supplierId)) {
      return apiResponse(res, 400, false, "Invalid supplier ID format");
    }

    // Validate required fields
    if (
      !name ||
      !description ||
      !variants ||
      !category_id ||
      !brand ||
      !imageData.length
    ) {
      return apiResponse(res, 400, false, "Please fill all required fields");
    }

    // Validate variants
    if (!Array.isArray(variants) || variants.length === 0) {
      return apiResponse(res, 400, false, "At least one variant is required");
    }

    for (const variant of variants) {
      if (
        !variant.name ||
        !variant.price ||
        !variant.stock ||
        !variant.weight ||
        !variant.dimensions ||
        !variant.sku
      ) {
        return apiResponse(res, 400, false, "All variant fields are required");
      }

      if (variant.discount) {
        if (!variant.discount.type || !variant.discount.value) {
          return apiResponse(
            res,
            400,
            false,
            "Discount type and value are required"
          );
        }
        if (
          variant.discount.type === "percentage" &&
          variant.discount.value > 100
        ) {
          return apiResponse(
            res,
            400,
            false,
            "Percentage discount cannot exceed 100"
          );
        }
      }

      const skuExists = await productModel.findOne({
        "variants.sku": variant.sku,
      });
      if (skuExists) {
        return apiResponse(
          res,
          400,
          false,
          `SKU ${variant.sku} must be unique`
        );
      }
    }

    const supplier = await supplierModel.findById(supplierId);
    if (!supplier || supplier.approval_status !== "Approved") {
      return apiResponse(res, 403, false, "Supplier not found or not approved");
    }

    const category = await categoryModel.findById(category_id);
    if (!category) {
      return apiResponse(res, 404, false, "Category not found");
    }

    if (subcategory_id) {
      const subCategory = await categoryModel.findOne({
        _id: subcategory_id,
        parentCategoryId: category_id,
      });
      if (!subCategory) {
        return apiResponse(res, 404, false, "Invalid subcategory");
      }
    }

    const newProduct = new productModel({
      supplier_id: supplierId,
      category_id,
      subcategory_id: subcategory_id || null,
      name,
      description,
      variants: variants.map((v: VariantData) => ({
        ...v,
        price: mongoose.Types.Decimal128.fromString(v.price.toString()),
        images: v.images || [],
        discount: v.discount
          ? {
              type: v.discount.type,
              value: v.discount.value,
              active: v.discount.active || false,
              startDate: v.discount.startDate,
              endDate: v.discount.endDate,
            }
          : undefined,
      })),
      images: imageData,
      reviews: [],
      rating: 0,
      video: videoUrl,
      brand,
      isBestSeller: isBestSeller || false,
    });

    const savedProduct = await newProduct.save();
    supplier.products.push(savedProduct._id);
    await supplier.save();

    return apiResponse(res, 201, true, "Product added successfully", {
      product: savedProduct,
    });
  } catch (error) {
    console.error("Error adding product:", error);
    return apiResponse(res, 500, false, "Internal Server Error");
  }
};

const updateProductBySupplier = async (req: any, res: Response) => {
  try {
    const supplierId = req?.user?.id;
    const { productId } = req.params;

    const product = await productModel.findById(productId);
    if (!product || product.supplier_id.toString() !== supplierId) {
      return apiResponse(res, 403, false, "Product not found or access denied");
    }

    let updateData: UpdateProductData = {};
    let imageData: { url: string; sequence: number }[] = [];
    if (req.body.imageUrls && Array.isArray(req.body.imageUrls)) {
      imageData = req.body.imageUrls.map((url: string, index: number) => ({
        url,
        sequence: index,
      }));
    } else if (req.body.imageUrl) {
      imageData = [{ url: req.body.imageUrl, sequence: 0 }];
    }

    const videoUrl = req.body.videoUrl;

    if (req.body.data) {
      const parsedData = JSON.parse(req.body.data);

      updateData = {
        name: parsedData.name || product.name,
        description: parsedData.description || product.description,
        category_id: parsedData.category_id || product.category_id,
        subcategory_id: parsedData.subcategory_id || product.subcategory_id,
        brand: parsedData.brand || product.brand,
        video: videoUrl || parsedData.video || product.video,
        isBestSeller: parsedData.isBestSeller ?? product.isBestSeller,
      };

      if (parsedData.variants) {
        for (const variant of parsedData.variants) {
          if (variant.sku) {
            const existingProduct = await productModel.findOne({
              "variants.sku": variant.sku,
              _id: { $ne: productId },
            });
            if (existingProduct) {
              return apiResponse(
                res,
                400,
                false,
                `SKU ${variant.sku} must be unique`
              );
            }
          }
          if (variant.discount) {
            if (!variant.discount.type || !variant.discount.value) {
              return apiResponse(
                res,
                400,
                false,
                "Discount type and value are required"
              );
            }
            if (
              variant.discount.type === "percentage" &&
              variant.discount.value > 100
            ) {
              return apiResponse(
                res,
                400,
                false,
                "Percentage discount cannot exceed 100"
              );
            }
          }
        }

        updateData.variants = parsedData.variants.map((v: VariantData) => ({
          ...v,
          price: mongoose.Types.Decimal128.fromString(v.price.toString()),
          images: v.images || [],
          discount: v.discount
            ? {
                type: v.discount.type,
                value: v.discount.value,
                active: v.discount.active || false,
                startDate: v.discount.startDate,
                endDate: v.discount.endDate,
              }
            : undefined,
        }));
      }

      updateData.images = [
        ...(Array.isArray(imageData)
          ? imageData.map((img, index) => ({
              url: img,
              sequence: index,
            }))
          : []),
        ...(Array.isArray(parsedData?.oldImages)
          ? parsedData.oldImages.map((img: string, index: number) => ({
              url: img,
              sequence: imageData.length + index,
            }))
          : []),
      ];
    }

    const updatedProduct = await productModel.findByIdAndUpdate(
      productId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    return apiResponse(
      res,
      200,
      true,
      "Product updated successfully",
      updatedProduct
    );
  } catch (error) {
    console.error("Error updating product:", error);
    return apiResponse(res, 500, false, "Internal server error");
  }
};

const getAllSupplierProducts = async (req: any, res: Response) => {
  try {
    const supplierId = req?.user?.id;

    if (!supplierId) {
      return apiResponse(res, 400, false, "Supplier ID is required.");
    }

    const products = await productModel
      .find({ supplier_id: supplierId })
      .sort({ isBestSeller: -1 }); // Sort best sellers first

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

