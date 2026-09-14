import express from "express";
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
import customerPortalRoutes from "./routes/customerPortalRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

connectCloudinary();

/* =========================================
   CORS
========================================= */

app.use((req, res, next) => {
  res.setHeader(
    "Access-Control-Allow-Origin",
    "https://smartkhatabooks.netlify.app",
  );

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, token",
  );

  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  next();
});

/* =========================================
   BODY PARSERS
========================================= */

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  }),
);

/* =========================================
   DATABASE CONNECTION
========================================= */

app.use(async (req, res, next) => {
  try {
    await connection();

    next();
  } catch (error) {
    console.error("DB connection failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
});

/* =========================================
   HEALTH CHECK
========================================= */

app.get("/ping", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Server awake",
  });
});

/* =========================================
   API ROUTES
========================================= */

app.use("/api/user", userRouter);

app.use("/api/product", productRouter);

app.use("/api/orders", orderRoutes);

app.use("/api/reviews", reviewRouter);

app.use("/api/dashboard", dashboardRoutes);

app.use("/api/employees", employeeRoutes);

app.use("/api/ledger", ledgerRoutes);

app.use("/api/customer-portal", customerPortalRoutes);

app.use("/api/reports", reportRoutes);

/* =========================================
   API TEST ROUTE
========================================= */

app.get("/api", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "API Working",
  });
});

/* =========================================
   404
========================================= */

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

/* =========================================
   GLOBAL ERROR HANDLER
========================================= */

app.use((err, req, res, next) => {
  console.error(err.stack);

  return res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
});

/* =========================================
   START SERVER
========================================= */

app.listen(port, () => {
  console.log(`✅ Server running on http://localhost:${port}`);
});

export default app;
