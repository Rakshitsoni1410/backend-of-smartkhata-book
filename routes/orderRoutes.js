import express from "express";

import {
  createOrder,
  getOrderRecommendations,
  getWholesalers,
  getOrdersForRetailer,
  getOrdersForWholesaler,
  updateOrderStatus,
  payAdvance,
  completePayment,
  requestAdvancePayment,
  requestFinalPayment,
  sendBillToRetailer,
  getBillingForRetailer,
  getBillingForWholesaler,
} from "../controllers/orderController.js";

import authUser from "../middlewares/authUser.js";

const router = express.Router();

router.post("/recommendations", authUser, getOrderRecommendations);
router.post("/create", authUser, createOrder);
router.get("/wholesalers", authUser, getWholesalers);
router.get("/retailer/:id", authUser, getOrdersForRetailer);
router.get("/wholesaler/:id", authUser, getOrdersForWholesaler);
router.get("/billing/retailer/:id", authUser, getBillingForRetailer);
router.get("/billing/wholesaler/:id", authUser, getBillingForWholesaler);
router.patch("/:id/status", authUser, updateOrderStatus);
router.patch("/:id/pay-advance", authUser, payAdvance);
router.patch("/:id/request-advance", authUser, requestAdvancePayment);
router.patch("/:id/request-final-payment", authUser, requestFinalPayment);
router.patch("/:id/complete-payment", authUser, completePayment);
router.patch("/:id/send-bill", authUser, sendBillToRetailer);

export default router;