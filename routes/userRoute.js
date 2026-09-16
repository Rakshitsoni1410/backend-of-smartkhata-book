import express from "express";

import {
  registerUser,
  loginUser,
  forgotPassword,
  resetPasswordWithOtp,
  getWholesalersByBusiness,
} from "../controllers/userController.js";

import loginRateLimiter from "../middlewares/loginRateLimiter.js";

const router = express.Router();

// ==========================================
// REGISTER
// ==========================================

router.post(
  "/register",
  registerUser
);

// ==========================================
// LOGIN
// ==========================================

// 5 failed attempts -> temporary block
router.post(
  "/login",
  loginRateLimiter,
  loginUser
);

// ==========================================
// FORGOT PASSWORD - SEND 6 DIGIT OTP
// ==========================================

router.post(
  "/forgot-password",
  forgotPassword
);

// ==========================================
// RESET PASSWORD USING OTP
// ==========================================

router.post(
  "/reset-password-otp",
  resetPasswordWithOtp
);

// ==========================================
// GET WHOLESALERS
// ==========================================

router.get(
  "/wholesalers/:businessType",
  getWholesalersByBusiness
);

export default router;