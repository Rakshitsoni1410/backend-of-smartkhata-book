import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cron from "node-cron";
import connection from "./config/mongodb.js";
import connectCloudinary from "./config/cloudinary.js";

import userRouter from "./routes/userRoute.js";
import productRouter from "./routes/productRoute.js";
import orderRoutes from "./routes/orderRoutes.js";
import reviewRouter from "./routes/reviewRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import employeeRoutes from "./routes/employeeRoutes.js";
import ledgerRoutes from "./routes/ledgerRoutes.js";

// LOAD ENV
dotenv.config();

// APP CONFIG
const app = express();
const port = process.env.PORT || 4000;

// CLOUDINARY CONNECTION
connectCloudinary();

// ==========================
// CORS OPTIONS
// ==========================

const corsOptions = {
  origin: [
    "https://smartkhatabooks.netlify.app",
    "http://localhost:5173",
    "http://localhost:3000",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// ==========================
// MIDDLEWARES
// ==========================

// HANDLE PREFLIGHT (must be first)
app.options("*", cors(corsOptions));

// CORS
app.use(cors(corsOptions));

// JSON PARSER
app.use(express.json());

// URL ENCODED
app.use(express.urlencoded({ extended: true }));

// DB CONNECTION MIDDLEWARE
app.use(async (req, res, next) => {
  try {
    await connection();
    next();
  } catch (error) {
    console.error("DB connection failed:", error.message);
    res.status(500).json({ success: false, message: "Database connection failed" });
  }
});

// ==========================
// KEEP DB ALIVE (every 30 min)
// ==========================

cron.schedule("*/30 * * * *", async () => {
  try {
    await connection();
    console.log("✅ DB keep-alive ping");
  } catch (error) {
    console.log("❌ DB keep-alive failed:", error.message);
  }
});

// ==========================
// API ROUTES
// ==========================

app.get("/ping", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server awake",
  });
});

app.use("/api/user", userRouter);
app.use("/api/product", productRouter);
app.use("/api/orders", orderRoutes);
app.use("/api/reviews", reviewRouter);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/ledger", ledgerRoutes);

// ==========================
// TEST ROUTE
// ==========================

app.get("/api", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API Working",
  });
});

// ==========================
// 404 ROUTE
// ==========================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// ==========================
// GLOBAL ERROR HANDLER
// ==========================

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
});

// ==========================
// SERVER
// ==========================

app.listen(port, () => {
  console.log(`✅ Server running on http://localhost:${port}`);
});

export default app;