import express from "express";
import authMiddleware from "../middlewares/authUser.js"

import {
  getDashboard,
  getMyRetailers,
  getRetailerProducts,
  placeOrder,
  getMyOrders,
  getMyBills,
  createBill,
  getSentBills,
  updateOrderStatus,
  getIncomingOrders,
} from "../controllers/customerPortalController.js";

const router = express.Router();

// ── Customer routes ──────────────────────────────────────
router.get("/dashboard",                     authMiddleware, getDashboard);
router.get("/my-retailers",                  authMiddleware, getMyRetailers);
router.get("/retailer/:retailerId/products", authMiddleware, getRetailerProducts);
router.post("/orders",                       authMiddleware, placeOrder);
router.get("/orders",                        authMiddleware, getMyOrders);
router.get("/bills",                         authMiddleware, getMyBills);

// ── Retailer routes ──────────────────────────────────────
router.post("/bills",                        authMiddleware, createBill);
router.get("/bills/sent",                    authMiddleware, getSentBills);
router.get("/orders/incoming",               authMiddleware, getIncomingOrders);
router.patch("/orders/:id/status",           authMiddleware, updateOrderStatus);

export default router;