import express from "express";

import {
  createOrder,
  getWholesalers,
  getOrdersForRetailer,
  getOrdersForWholesaler,
  updateOrderStatus,
  payAdvance,
  completePayment,
  requestAdvancePayment,
  requestFinalPayment,
  sendBillToRetailer,
  getBillingForRetailer, // ← ADDED
  getBillingForWholesaler, // ← ADDED
} from "../controllers/orderController.js";
import authUser from "../middlewares/authUser.js";

const router = express.Router();

// CREATE ORDER

router.post("/create", authUser, createOrder);

// GET ORDERS

router.get("/wholesalers", authUser, getWholesalers);

router.get("/retailer/:id", authUser, getOrdersForRetailer);

router.get("/wholesaler/:id", authUser, getOrdersForWholesaler);

// BILLING ← ADDED

router.get("/billing/retailer/:id", authUser, getBillingForRetailer);

router.get("/billing/wholesaler/:id", authUser, getBillingForWholesaler);

// UPDATE STATUS

router.patch("/:id/status", authUser, updateOrderStatus);

// ADVANCE PAYMENT

router.patch("/:id/pay-advance", authUser, payAdvance);

// COMPLETE PAYMENT
router.patch("/:id/request-advance", authUser, requestAdvancePayment);

router.patch("/:id/request-final-payment", authUser, requestFinalPayment);
router.patch("/:id/complete-payment", authUser, completePayment);
router.patch("/:id/send-bill", authUser, sendBillToRetailer);
export default router;