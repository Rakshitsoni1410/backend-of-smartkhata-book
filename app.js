import express from "express";
import cors from "cors";
import "dotenv/config";

import connection from "./config/mongodb.js";
import connectCloudinary from "./config/cloudinary.js";

import userRouter from "./routes/userRoute.js";
import productRouter from "./routes/productRoute.js";
import orderRoutes from "./routes/orderRoutes.js";
import reviewRouter from "./routes/reviewRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import employeeRoutes from "./routes/employeeRoutes.js";


// APP CONFIG
const app = express();

const port = process.env.PORT || 4000;


// DATABASE CONNECTION
connection();


// CLOUDINARY
connectCloudinary();


// MIDDLEWARES
app.use(express.json());

app.use(cors());


// ==========================
// API ROUTES
// ==========================

app.use("/api/user", userRouter);

app.use("/api/product", productRouter);

app.use("/api/orders", orderRoutes);

app.use("/api/reviews", reviewRouter);

app.use("/api/dashboard", dashboardRoutes);

app.use("/api/employees", employeeRoutes);


// ==========================
// TEST API
// ==========================

app.get("/api", (req, res) => {
  res.send("API Working");
});


// ==========================
// SERVER
// ==========================

app.listen(port, () => {
  console.log(
    `Server running on http://localhost:${port}`
  );
});