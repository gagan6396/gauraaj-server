import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import userRoute from "./routes/user.route";
import profileRoute from "./routes/userProfile.route";
import productRoute from "./routes/product.route";
import orderRoute from "./routes/order.route";
import cartRoute from "./routes/cart.route";
import supplierRoute from "./routes/supplierauth.route";
import adminRoute from "./routes/adminAuth.route";
import adminSupplierRoute from "./routes/adminSupplier.route";
import supplierProductRoute from "./routes/supplierProduct.route";
import supplierProfileRoute from "./routes/supplierProfile.route";
import supplierAnalyticsRoute from "./routes/supplierAnalytics.route";
import router from "./routes/adminProduct.route";
import categoryRoute from "./routes/category.route";
import adminAnalyticsRoute from "./routes/adminAnalytics.route";
import adminProductRoute from "./routes/adminProduct.route";
import reviewRoute from "./routes/review.route";
import checkoutRoute from "./routes/checkout.route";
import couponRoute from "./routes/coupon.route";
import googleRoute from "./routes/googleAuth.route";
import salesRoute from "./routes/sales.route";
import shipRocketRoute from "./routes/shipRocket.route";
import paymentRoute from "./routes/payment.route";

const app = express();

// middleware uses
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(cookieParser());

// Define the routes here
app.use("/api/v1/user", userRoute);
app.use("/api/v1/users", profileRoute);
app.use("/api/v1/products", productRoute);
app.use("/api/v1/orders", orderRoute);
app.use("/api/v1/cart", cartRoute);
app.use("/api/v1/supplier", supplierRoute);
app.use("/api/v1/admin", adminRoute);
app.use("/api/v1/admin/supplier", adminSupplierRoute);
app.use("/api/v1/supplier/products", supplierProductRoute);
app.use("/api/v1/supplier/profile", supplierProfileRoute);
app.use("/api/v1/supplier/analytics", supplierAnalyticsRoute);
app.use("/api/v1/admin", router);
app.use("/api/v1/categories", categoryRoute);
app.use("/api/v1/admin", adminAnalyticsRoute);
app.use("/api/v1/admin/products", adminProductRoute);
app.use("/api/v1/reviews", reviewRoute);
app.use("/api/v1/checkout", checkoutRoute);
app.use("/api/v1/supplier/coupons", couponRoute);
app.use("/api/v1/auth", googleRoute);
app.use("/api/v1/sales", salesRoute);
app.use("/api/v1/shiprocket", shipRocketRoute);
app.use("/api/v1/payment", paymentRoute);

export default app;
