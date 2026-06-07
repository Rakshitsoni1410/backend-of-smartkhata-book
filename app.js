import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connection from "./config/mongodb.js";
import connectCloudinary from "./config/cloudinary.js";

import userRouter from "./routes/userRoute.js";
import productRouter from "./routes/productRoute.js";
import orderRoutes from "./routes/orderRoutes.js";
import reviewRouter from "./routes/reviewRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import employeeRoutes from "./routes/employeeRoutes.js";
import ledgerRoutes from "./routes/ledgerRoutes.js";
import customerPortalRoutes from "./routes/customerPortalRoutes.js"; // ✅ NEW

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

connectCloudinary();

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "https://smartkhatabooks.netlify.app");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") return res.status(200).end();
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(async (req, res, next) => {
  try {
    await connection();
    next();
  } catch (error) {
    console.error("DB connection failed:", error.message);
    res.status(500).json({ success: false, message: "Database connection failed" });
  }
});

app.get("/ping", (req, res) => {
  res.status(200).json({ success: true, message: "Server awake" });
});

app.use("/api/user", userRouter);
app.use("/api/product", productRouter);
app.use("/api/orders", orderRoutes);
app.use("/api/reviews", reviewRouter);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/ledger", ledgerRoutes);
app.use("/api/customer-portal", customerPortalRoutes); // ✅ NEW

app.get("/api", (req, res) => {
  res.status(200).json({ success: true, message: "API Working" });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: "Internal Server Error" });
});

app.listen(port, () => {
  console.log(`✅ Server running on http://localhost:${port}`);
});

export default app;