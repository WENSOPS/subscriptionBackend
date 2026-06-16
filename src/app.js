import express from "express";
import authRoutes from "./features/auth/auth.routes.js";
import serviceRoutes from "./features/service/service.routes.js";
import packageRoutes from "./features/packages/package.routes.js";
import couponRoutes from "./features/coupon/coupon.route.js";
import paymentRoutes from "./features/payment/payment.routes.js";
import subscriptionRoutes from "./features/subscription/subscription.route.js";
import tripRoutes from "./features/trip/trip.route.js";
import userRoutes from "./features/user/user.route.js";
import dashboardRoutes from "./features/dashboard/dashboard.routes.js";
import storageRoutes from "./features/storage/storage.routes.js";
import bookingRoutes from "./features/booking/booking.routes.js";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: ["http://localhost:3001", "https://subscription.wensforce.com"],
    credentials: true,
  }),
);

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/service", serviceRoutes);
app.use("/api/v1/package", packageRoutes);
app.use("/api/v1/coupon", couponRoutes);
app.use("/api/v1/payment", paymentRoutes);
app.use("/api/v1/subscription", subscriptionRoutes);
app.use("/api/v1/trip", tripRoutes);
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/upload", storageRoutes);
app.use("/api/v1/booking", bookingRoutes);

app.get("/api/v1/health", (req, res) => {
  res.send("Hello, World!");
});

export default app;
