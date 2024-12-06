import { Response, Request } from "express";
import mongoose from "mongoose";
import moment from "moment";
import orderModel from "../models/Order.model";
import productModel from "../models/Product.model";
import reviewModel from "../models/Review.model";
import apiResponse from "../utils/ApiResponse";

const getDateRange = (range: string) => {
  const today = moment().startOf("day");
  let startDate: Date;
  let endDate: Date;

  switch (range) {
    case "daily":
      startDate = today.toDate();
      endDate = today.endOf("day").toDate();
      break;
    case "weekly":
      startDate = today.startOf("week").toDate();
      endDate = today.endOf("week").toDate();
      break;
    case "monthly":
      startDate = today.startOf("month").toDate();
      endDate = today.endOf("month").toDate();
      break;
    case "yearly":
      startDate = today.startOf("year").toDate();
      endDate = today.endOf("year").toDate();
      break;
    default:
      startDate = moment().subtract(1, "year").startOf("year").toDate();
      endDate = today.endOf("day").toDate();
      break;
  }

  return { startDate, endDate };
};

const getSupplierAnalytics = async (req: Request, res: Response) => {
  try {
    const { supplierId } = req.params;
    const { range = "monthly" } = req.query;

    // Validate Supplier ID
    if (!mongoose.Types.ObjectId.isValid(supplierId)) {
      return apiResponse(res, 400, false, "Invalid Supplier ID.");
    }

    // Validate range input
    const validRanges = ["daily", "weekly", "monthly", "yearly"];
    if (!validRanges.includes(range as string)) {
      return apiResponse(
        res,
        400,
        false,
        `Invalid range. Choose from ${validRanges.join(", ")}.`
      );
    }

    // Get the date range
    const { startDate, endDate } = getDateRange(range as string);

    // Fetch and aggregate sales data
    const salesData = await orderModel.aggregate([
      // Filter orders by supplier ID and date range
      {
        $match: {
          "products.supplierId": new mongoose.Types.ObjectId(supplierId),
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      // Deconstruct the products array
      { $unwind: "$products" },
      // Match again to ensure we only analyze products for this supplier
      {
        $match: {
          "products.supplierId": new mongoose.Types.ObjectId(supplierId),
        },
      },
      // Group by product ID to calculate total sales
      {
        $group: {
          _id: "$products.productId",
          totalSales: {
            $sum: { $multiply: ["$products.price", "$products.quantity"] },
          },
          productName: { $first: "$products.name" },
        },
      },
      // Sort products by total sales in descending order
      { $sort: { totalSales: -1 } },
    ]);

    // Calculate overall total sales
    const totalSales = salesData.reduce(
      (sum, product) => sum + product.totalSales,
      0
    );

    // Prepare response
    const salesAnalytics = {
      totalSales,
      salesPerProduct: salesData.map((product) => ({
        productId: product._id,
        productName: product.productName,
        totalSales: product.totalSales,
      })),
      timeRange: range,
      startDate,
      endDate,
    };

    return apiResponse(
      res,
      200,
      true,
      "Sales analytics fetched successfully.",
      salesAnalytics
    );
  } catch (error) {
    console.error("Error fetching supplier analytics:", error);
    return apiResponse(res, 500, false, "Error fetching supplier analytics.");
  }
};

const getSupplierRatingsAnalytics = async (req: Request, res: Response) => {
  try {
    const { supplierId } = req.params;

    if (!supplierId) {
      return apiResponse(res, 400, false, "Supplier ID is required");
    }

    // Fetch supplier's products
    const supplierProducts = await productModel
      .find({ supplier_id: supplierId })
      .select("_id name");
    const productIds = supplierProducts.map((product) => product._id);

    if (productIds.length === 0) {
      return apiResponse(res, 200, true, "No products found for the supplier", {
        totalProducts: 0,
        totalRatings: 0,
        totalReviews: 0,
        overallAverageRating: 0,
        analyticsPerProduct: [],
      });
    }

    // Fetch reviews for supplier's products
    const reviews = await reviewModel.find({ productId: { $in: productIds } });

    const totalReviews = reviews.length;

    if (totalReviews === 0) {
      return apiResponse(
        res,
        200,
        true,
        "No reviews found for the supplier's products",
        {
          totalProducts: supplierProducts.length,
          totalRatings: 0,
          totalReviews: 0,
          overallAverageRating: 0,
          analyticsPerProduct: [],
        }
      );
    }

    let totalRatings = 0;
    const analyticsPerProduct = supplierProducts.map((product) => {
      const productReviews = reviews.filter((review) =>
        review.productId.equals(product._id)
      );

      const totalRatingsForProduct = productReviews.length;
      totalRatings += totalRatingsForProduct;

      const totalRatingSum = productReviews.reduce(
        (sum, review) => sum + review.rating,
        0
      );
      const averageRating =
        totalRatingsForProduct > 0
          ? totalRatingSum / totalRatingsForProduct
          : 0;

      const ratingCounts = [1, 2, 3, 4, 5].reduce(
        (acc: Record<number, number>, star) => {
          acc[star] = productReviews.filter(
            (review) => review.rating === star
          ).length;
          return acc;
        },
        {}
      );

      const positiveReviews = productReviews.filter(
        (review) => review.rating >= 4
      ).length;
      const negativeReviews = productReviews.filter(
        (review) => review.rating < 3
      ).length;

      return {
        productId: product._id,
        productName: product.name,
        averageRating: parseFloat(averageRating.toFixed(1)),
        totalRatings: totalRatingsForProduct,
        totalReviews: totalRatingsForProduct, // Reviews equal total ratings in this context
        ratingCounts,
        positiveReviews,
        negativeReviews,
      };
    });

    const overallAverageRating = parseFloat(
      (
        analyticsPerProduct.reduce(
          (sum, product) => sum + product.averageRating,
          0
        ) / supplierProducts.length
      ).toFixed(1)
    );

    const analytics = {
      totalProducts: supplierProducts.length,
      totalRatings,
      totalReviews,
      overallAverageRating,
      analyticsPerProduct,
    };

    return apiResponse(
      res,
      200,
      true,
      "Ratings analytics fetched successfully.",
      analytics
    );
  } catch (error) {
    console.error("Error fetching ratings analytics:", error);
    return apiResponse(res, 500, false, "Error fetching ratings analytics");
  }
};

export { getSupplierAnalytics, getSupplierRatingsAnalytics };
