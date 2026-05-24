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
} from "../controllers/orderController.js";

const router = express.Router();

// CREATE ORDER

router.post("/create", createOrder);

// GET ORDERS

router.get("/wholesalers", getWholesalers);

router.get("/retailer/:id", getOrdersForRetailer);

router.get("/wholesaler/:id", getOrdersForWholesaler);

// UPDATE STATUS

router.patch("/:id/status", updateOrderStatus);

// ADVANCE PAYMENT

router.patch("/:id/pay-advance", payAdvance);

// COMPLETE PAYMENT
router.patch("/:id/request-advance", requestAdvancePayment);

router.patch("/:id/request-final-payment", requestFinalPayment);
router.patch("/:id/complete-payment", completePayment);

export default router;
