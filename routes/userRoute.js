import express from "express";

import {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
  getWholesalersByBusiness,
} from "../controllers/userController.js";

import loginRateLimiter from "../middlewares/loginRateLimiter.js";

const router = express.Router();

// REGISTER
router.post("/register", registerUser);

// LOGIN
// 5 failed attempts -> temporary block
router.post("/login", loginRateLimiter, loginUser);

// FORGOT PASSWORD
router.post("/forgot-password", forgotPassword);

// RESET PASSWORD
router.post("/reset-password/:token", resetPassword);

// GET WHOLESALERS
router.get("/wholesalers/:businessType", getWholesalersByBusiness);

export default router;
