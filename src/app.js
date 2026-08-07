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
import offerRoutes from "./features/Offer/offer.routes.js";
import adminRoutes from "./features/admin/admin.routes.js";
import referralRoutes from "./features/referral/referral.route.js";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();
app.use("/api/v1/payment/webhook", express.raw({ type: "application/json" }));
app.use(express.json());
app.use(cookieParser());

// app.use(
//   cors({
//     origin: ["http://localhost:3001", "https://subscription.wensforce.com"],
//     credentials: true,
//   }),
// );

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "https://subscription.wensforce.com",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
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
app.use("/api/v1/offer", offerRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/referral", referralRoutes);

app.get("/api/v1/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default app;
