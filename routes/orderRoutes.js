import express from "express";
import {
  createOrder,
  getWholesalers,
  getOrdersForRetailer,
  getOrdersForWholesaler,
  updateOrderStatus,
} from "../controllers/orderController.js";

const router = express.Router();

router.post("/create", createOrder);
router.get("/wholesalers", getWholesalers);
router.get("/retailer/:id", getOrdersForRetailer);
router.get("/wholesaler/:id", getOrdersForWholesaler);
router.patch("/:id/status", updateOrderStatus);

export default router;