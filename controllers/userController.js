import userModel from "../models/userModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";

import sendEmail from "../utils/sendEmail.js";
import connection from "../config/mongodb.js";

import {
  recordFailedLogin,
  resetLoginAttempts,
} from "../middleware/loginRateLimiter.js";

// ==========================================
// REGISTER USER
// ==========================================

export const registerUser = async (req, res) => {
  try {
    await connection();

    const {
      name,
      phone,
      email,
      role,
      shopName,
      businessType,
      address,
      password,
    } = req.body;

    // ======================================
    // REQUIRED FIELDS
    // ======================================

    if (!name || !phone || !email || !role || !address || !password) {
      return res.status(400).json({
        success: false,
        message: "Please fill all required fields",
      });
    }

    // ======================================
    // BUSINESS FIELDS
    // ======================================

    if (role !== "Customer") {
      if (!shopName || !businessType) {
        return res.status(400).json({
          success: false,
          message: "Shop name and business type are required",
        });
      }
    }

    // ======================================
    // EMAIL VALIDATION
    // ======================================

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email",
      });
    }

    // ======================================
    // PHONE VALIDATION
    // ======================================

    const phoneRegex = /^\d{10}$/;

    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number",
      });
    }

    // ======================================
    // PASSWORD VALIDATION
    // ======================================

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    // ======================================
    // CHECK EXISTING USER
    // ======================================

    const normalizedEmail = email.trim().toLowerCase();

    const normalizedPhone = phone.trim();

    const userExist = await userModel.findOne({
      $or: [
        {
          phone: normalizedPhone,
        },
        {
          email: normalizedEmail,
        },
      ],
    });

    if (userExist) {
      return res.status(409).json({
        success: false,
        message: "User already exists",
      });
    }

    // ======================================
    // HASH PASSWORD
    // ======================================

    const hashedPassword = await bcrypt.hash(password, 10);

    // ======================================
    // CREATE USER
    // ======================================

    const user = await userModel.create({
      name: name.trim(),

      phone: normalizedPhone,

      email: normalizedEmail,

      role,

      shopName: role === "Customer" ? "" : shopName,

      businessType: role === "Customer" ? "" : businessType,

      address,

      password: hashedPassword,

      // First active session
      sessionVersion: 1,
    });

    // ======================================
    // CREATE TOKEN
    // ======================================

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,

        // Important for single-session auth
        sessionVersion: user.sessionVersion,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      },
    );

    // ======================================
    // WELCOME EMAIL
    // ======================================

    try {
      await sendEmail({
        to: normalizedEmail,

        subject: "Welcome to Smart Khata 🎉",

        html: `
          <div style="font-family:sans-serif;padding:20px">
            <h2>Hello ${name}</h2>

            <p>
              Your Smart Khata account has been
              created successfully.
            </p>

            <p>
              Welcome to Smart Khata 🚀
            </p>
          </div>
        `,
      });
    } catch (emailError) {
      console.log("WELCOME EMAIL ERROR:", emailError.message);
    }

    // ======================================
    // RESPONSE
    // ======================================

    return res.status(201).json({
      success: true,
      message: "User registered successfully",

      token,

      user: {
        _id: user._id,
        name: user.name,
        role: user.role,
        phone: user.phone,
        email: user.email,
        shopName: user.shopName,
        businessType: user.businessType,
        address: user.address,
      },
    });
  } catch (error) {
    console.log("REGISTER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ==========================================
// LOGIN USER
// ==========================================

export const loginUser = async (req, res) => {
  try {
    await connection();

    const { phone, email, password } = req.body;

    // ======================================
    // VALIDATION
    // ======================================

    if ((!phone && !email) || !password) {
      return res.status(400).json({
        success: false,
        message: "Phone/email and password required",
      });
    }

    // ======================================
    // BUILD SEARCH
    // ======================================

    const searchConditions = [];

    if (phone) {
      searchConditions.push({
        phone: String(phone).trim(),
      });
    }

    if (email) {
      searchConditions.push({
        email: String(email).trim().toLowerCase(),
      });
    }

    // ======================================
    // FIND USER
    // ======================================

    const user = await userModel.findOne({
      $or: searchConditions,
    });

    // ======================================
    // USER NOT FOUND
    // COUNT AS FAILED LOGIN
    // ======================================

    if (!user) {
      const failed = await recordFailedLogin(req);

      // Fifth bad attempt blocks immediately
      if (failed?.blocked) {
        return res.status(429).json({
          success: false,

          code: "LOGIN_TEMPORARILY_BLOCKED",

          message:
            "Too many failed login attempts. Login has been temporarily blocked for 15 minutes.",

          retryAfter: 15 * 60,
        });
      }

      return res.status(401).json({
        success: false,

        code: "INVALID_CREDENTIALS",

        message: "Invalid credentials",
      });
    }

    // ======================================
    // CHECK PASSWORD
    // ======================================

    const isMatch = await bcrypt.compare(password, user.password);

    // ======================================
    // WRONG PASSWORD
    // COUNT AS FAILED LOGIN
    // ======================================

    if (!isMatch) {
      const failed = await recordFailedLogin(req);

      if (failed?.blocked) {
        return res.status(429).json({
          success: false,

          code: "LOGIN_TEMPORARILY_BLOCKED",

          message:
            "Too many failed login attempts. Login has been temporarily blocked for 15 minutes.",

          retryAfter: 15 * 60,
        });
      }

      return res.status(401).json({
        success: false,

        code: "INVALID_CREDENTIALS",

        message: "Invalid credentials",
      });
    }

    // ======================================
    // SUCCESSFUL LOGIN
    //
    // Reset failed login counters.
    // ======================================

    await resetLoginAttempts(req);

    // ======================================
    // CREATE NEW SESSION VERSION
    //
    // Atomic increment is safer than:
    //
    // user.sessionVersion += 1
    //
    // This guarantees concurrent logins
    // receive different session versions.
    // ======================================

    const updatedUser = await userModel.findByIdAndUpdate(
      user._id,
      {
        $inc: {
          sessionVersion: 1,
        },
      },
      {
        new: true,
      },
    );

    if (!updatedUser) {
      return res.status(500).json({
        success: false,
        message: "Unable to create login session",
      });
    }

    // ======================================
    // CREATE NEW JWT
    // ======================================

    const token = jwt.sign(
      {
        id: updatedUser._id,

        role: updatedUser.role,

        sessionVersion: updatedUser.sessionVersion,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      },
    );

    // ======================================
    // RESPONSE
    // ======================================

    return res.status(200).json({
      success: true,
      message: "Login successful",

      token,

      user: {
        _id: updatedUser._id,

        name: updatedUser.name,

        role: updatedUser.role,

        phone: updatedUser.phone,

        email: updatedUser.email,

        shopName: updatedUser.shopName,

        businessType: updatedUser.businessType,

        address: updatedUser.address,
      },
    });
  } catch (error) {
    console.log("LOGIN ERROR:", error);

    return res.status(500).json({
      success: false,

      message: error.message || "Server error",
    });
  }
};

// ==========================================
// FORGOT PASSWORD
// ==========================================

export const forgotPassword = async (req, res) => {
  try {
    await connection();

    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await userModel.findOne({
      email: normalizedEmail,
    });

    // Do not reveal whether account exists
    if (!user) {
      return res.json({
        success: true,

        message: "If email exists, reset link sent",
      });
    }

    // ======================================
    // CREATE RESET TOKEN
    // ======================================

    const token = crypto.randomBytes(32).toString("hex");

    user.resetPasswordToken = token;

    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;

    await user.save();

    // ======================================
    // RESET LINK
    // ======================================

    const resetLink = `${process.env.CLIENT_URL}/#/reset-password/${token}`;

    // ======================================
    // SEND EMAIL
    // ======================================

    try {
      await sendEmail({
        to: normalizedEmail,

        subject: "Reset Password",

        html: `
          <h2>Password Reset</h2>

          <p>
            Click the link below to reset
            your password:
          </p>

          <a href="${resetLink}">
            ${resetLink}
          </a>

          <p>
            This link expires in 15 minutes.
          </p>
        `,
      });
    } catch (emailErr) {
      console.error("RESET EMAIL ERROR:", emailErr.message);
    }

    return res.json({
      success: true,

      message: "Reset link sent",
    });
  } catch (error) {
    console.log("FORGOT PASSWORD ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ==========================================
// RESET PASSWORD
// ==========================================

export const resetPassword = async (req, res) => {
  try {
    await connection();

    const { token } = req.params;

    const { password } = req.body;

    // ======================================
    // PASSWORD VALIDATION
    // ======================================

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password is required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    // ======================================
    // FIND VALID RESET TOKEN
    // ======================================

    const user = await userModel.findOne({
      resetPasswordToken: token,

      resetPasswordExpires: {
        $gt: Date.now(),
      },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Token invalid or expired",
      });
    }

    // ======================================
    // UPDATE PASSWORD
    // ======================================

    user.password = await bcrypt.hash(password, 10);

    user.resetPasswordToken = undefined;

    user.resetPasswordExpires = undefined;

    // ======================================
    // IMPORTANT SECURITY:
    //
    // Password reset destroys any existing
    // login session on other devices.
    // ======================================

    user.sessionVersion = Number(user.sessionVersion || 0) + 1;

    await user.save();

    return res.json({
      success: true,

      message: "Password reset successful. Please login again.",
    });
  } catch (error) {
    console.log("RESET PASSWORD ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ==========================================
// GET WHOLESALERS
// ==========================================

export const getWholesalersByBusiness = async (req, res) => {
  try {
    await connection();

    const { businessType } = req.params;

    const wholesalers = await userModel
      .find({
        role: "Wholesaler",

        businessType,
      })
      .select(
        "-password -resetPasswordToken -resetPasswordExpires -sessionVersion -__v",
      );

    return res.status(200).json({
      success: true,
      users: wholesalers,
    });
  } catch (error) {
    console.error("GET WHOLESALERS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch wholesalers",
    });
  }
};
