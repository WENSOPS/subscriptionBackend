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
import cors from "cors";
import cookieParser from "cookie-parser";
import axios from "axios";

const app = express();

app.use(express.json());
app.use(cookieParser());

// app.use(
//   cors({
//     origin: ["http://localhost:3001", "https://subscription.wensforce.com"],
//     credentials: true,
//   }),
// );

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', '*'],   // ✅ exact frontend origin, no trailing slash
  credentials: true,                  // ✅ allow cookies/auth headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

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

app.get("/api/v1/health", async (req, res) => {
  // console.log('HIT:', new Date().toISOString(), req.query);
 const response = await axios.get('https://data-storage.doubletick.io/org_Tl3NjkA3qK/chat-messages/51f5892c-977f-4f21-b8f2-415f410459bd/call-recordings/wacid.IhggMDA3QkM2MEVBMUZDMTA1Qzg1RkE3RDkxMDM1NUYwNTUcGAw5MTczMDQ2MDc5NTQVAgAVFgA=.mp3',{
    headers: {
      'Authorization': 'key_t1POnzbYPdiMAOxeHskabaTArW6tx7RpSQY4NQoVpxWzTW1hVzOGZ6IyRp72LD2CqxMwORRT8vhMZtGQVWFRFbXAoiVXGRxKUcuSjUdPIdeS2iFpCZOGpKrhddmMx9dR5AJ2hnhdIhGznco8uORYTljtwKTt7zEyWg2WeikJ2qWZ7m1f47M5VycchWI2u3e0p7HuqG19X9PcKyYsLW6DwEuOgrNTqM9bwzRo8DxpzGv2l7tAQ6WfrWIH6pmy'
    }
  })
  console.log('response:', response.data);
  res.send("Hello, World!", response.data);
});

export default app;
