import userModel from "../models/userModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";

import sendEmail from "../utils/sendEmail.js";
import connection from "../config/mongodb.js";

import {
  recordFailedLogin,
  resetLoginAttempts,
} from "../middlewares/loginRateLimiter.js";

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

// FORGOT PASSWORD

export const forgotPassword = async (req, res) => {
  try {
    await connection();

    const { email } = req.body;

    // VALIDATE EMAIL
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const normalizedEmail = String(email)
      .trim()
      .toLowerCase();

    // Basic format check
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        normalizedEmail
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid email address",
      });
    }

    // FIND USER
    const user = await userModel.findOne({
      email: normalizedEmail,
    });

    /*
      Do not reveal whether the email exists.

      Always return the same type of successful response
      when the account does not exist.
    */
    if (!user) {
      return res.status(200).json({
        success: true,
        message:
          "If this email is registered, an OTP has been sent.",
      });
    }

    // RESEND COOLDOWN - 60 SECONDS
    if (user.resetPasswordOtpLastSentAt) {
      const lastSentAt = new Date(
        user.resetPasswordOtpLastSentAt
      ).getTime();

      if (Number.isFinite(lastSentAt)) {
        const elapsed =
          Date.now() - lastSentAt;

        const cooldown =
          60 * 1000;

        if (elapsed < cooldown) {
          const remainingSeconds =
            Math.ceil(
              (cooldown - elapsed) /
                1000
            );

          return res.status(429).json({
            success: false,
            message: `Please wait ${remainingSeconds} seconds before requesting another OTP.`,
          });
        }
      }
    }

    // GENERATE SECURE 6-DIGIT OTP

    const otp = crypto
      .randomInt(
        100000,
        1000000
      )
      .toString();

    // HASH OTP

    const otpHash = crypto
      .createHash("sha256")
      .update(otp)
      .digest("hex");

    // STORE OTP DATA

    user.resetPasswordOtpHash =
      otpHash;

    user.resetPasswordOtpExpires =
      new Date(
        Date.now() +
          10 * 60 * 1000
      );

    user.resetPasswordOtpAttempts =
      0;

    user.resetPasswordOtpLastSentAt =
      new Date();

    await user.save();

    // SEND EMAIL

    try {
      await sendEmail({
        to: normalizedEmail,

        subject:
          "SmartKhataBook Password Reset OTP",

        html: `
          <div
            style="
              font-family: Arial, sans-serif;
              max-width: 520px;
              margin: 0 auto;
              background: #ffffff;
              border: 1px solid #e5e7eb;
              border-radius: 16px;
              overflow: hidden;
            "
          >

            <div
              style="
                background: #4f46e5;
                padding: 30px;
                text-align: center;
              "
            >
              <h1
                style="
                  color: #ffffff;
                  margin: 0;
                  font-size: 24px;
                "
              >
                SmartKhataBook
              </h1>

              <p
                style="
                  color: rgba(255,255,255,0.8);
                  margin: 7px 0 0;
                  font-size: 13px;
                "
              >
                Password Reset Verification
              </p>
            </div>

            <div
              style="
                padding: 32px;
              "
            >
              <h2
                style="
                  color: #111827;
                  margin: 0 0 10px;
                  font-size: 20px;
                "
              >
                Hi ${user.name || "there"},
              </h2>

              <p
                style="
                  color: #6b7280;
                  font-size: 14px;
                  line-height: 1.7;
                "
              >
                We received a request to reset your
                SmartKhataBook password.
                Use the OTP below to continue.
              </p>

              <div
                style="
                  margin: 28px 0;
                  padding: 22px;
                  background: #eef2ff;
                  border: 1px solid #c7d2fe;
                  border-radius: 14px;
                  text-align: center;
                "
              >
                <div
                  style="
                    color: #4f46e5;
                    font-size: 34px;
                    font-weight: 800;
                    letter-spacing: 8px;
                  "
                >
                  ${otp}
                </div>
              </div>

              <p
                style="
                  color: #6b7280;
                  font-size: 13px;
                  line-height: 1.6;
                "
              >
                This OTP is valid for
                <strong>10 minutes</strong>.
              </p>

              <p
                style="
                  color: #dc2626;
                  font-size: 13px;
                  line-height: 1.6;
                "
              >
                Never share this OTP with anyone.
              </p>

              <p
                style="
                  margin-top: 28px;
                  color: #9ca3af;
                  font-size: 12px;
                  line-height: 1.6;
                "
              >
                If you did not request a password
                reset, you can safely ignore this email.
              </p>
            </div>

          </div>
        `,
      });
    } catch (emailError) {
      // IMPORTANT SERVER LOGS
      console.error(
        "========== RESET OTP EMAIL ERROR =========="
      );

      console.error(
        "MESSAGE:",
        emailError?.message
      );

      console.error(
        "CODE:",
        emailError?.code
      );

      console.error(
        "COMMAND:",
        emailError?.command
      );

      console.error(
        "RESPONSE:",
        emailError?.response
      );

      console.error(
        "RESPONSE CODE:",
        emailError?.responseCode
      );

      console.error(
        "==========================================="
      );

      // REMOVE FAILED OTP
      user.resetPasswordOtpHash =
        null;

      user.resetPasswordOtpExpires =
        null;

      user.resetPasswordOtpAttempts =
        0;

      // IMPORTANT FIX:
      // email was not sent, so do not keep cooldown.
      user.resetPasswordOtpLastSentAt =
        null;

      try {
        await user.save();
      } catch (
        cleanupError
      ) {
        console.error(
          "OTP CLEANUP ERROR:",
          cleanupError
        );
      }

      return res.status(500).json({
        success: false,
        message:
          "Unable to send OTP. Please try again.",
      });
    }

    // SUCCESS

    return res.status(200).json({
      success: true,

      /*
        Keep this generic so account existence
        isn't unnecessarily exposed.
      */
      message:
        "If this email is registered, an OTP has been sent.",
    });
  } catch (error) {
    console.error(
      "========== FORGOT PASSWORD ERROR =========="
    );

    console.error(
      "MESSAGE:",
      error?.message
    );

    console.error(
      "CODE:",
      error?.code
    );

    console.error(
      "STACK:",
      error?.stack
    );

    console.error(
      "==========================================="
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to process password reset request.",
    });
  }
};
// RESET PASSWORD

export const resetPasswordWithOtp = async (
  req,
  res
) => {
  try {
    await connection();

    const {
      email,
      otp,
      password,
    } = req.body;

    if (
      !email ||
      !otp ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Email, OTP and new password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 6 characters",
      });
    }

    if (!/^\d{6}$/.test(String(otp))) {
      return res.status(400).json({
        success: false,
        message:
          "OTP must be a 6-digit number",
      });
    }

    const normalizedEmail =
      String(email)
        .trim()
        .toLowerCase();

    const user =
      await userModel.findOne({
        email:
          normalizedEmail,
      });

    if (
      !user ||
      !user.resetPasswordOtpHash ||
      !user.resetPasswordOtpExpires
    ) {
      return res.status(400).json({
        success: false,
        message:
          "OTP is invalid or expired",
      });
    }

    // ==========================================
    // CHECK EXPIRY
    // ==========================================

    if (
      new Date(
        user.resetPasswordOtpExpires
      ).getTime() <= Date.now()
    ) {
      user.resetPasswordOtpHash =
        null;

      user.resetPasswordOtpExpires =
        null;

      user.resetPasswordOtpAttempts =
        0;

      await user.save();

      return res.status(400).json({
        success: false,
        message:
          "OTP has expired. Please request a new OTP.",
      });
    }

    // ==========================================
    // LIMIT OTP ATTEMPTS
    // ==========================================

    if (
      Number(
        user.resetPasswordOtpAttempts ||
          0
      ) >= 5
    ) {
      user.resetPasswordOtpHash =
        null;

      user.resetPasswordOtpExpires =
        null;

      user.resetPasswordOtpAttempts =
        0;

      await user.save();

      return res.status(429).json({
        success: false,
        message:
          "Too many incorrect attempts. Please request a new OTP.",
      });
    }

    // ==========================================
    // HASH ENTERED OTP
    // ==========================================

    const enteredOtpHash =
      crypto
        .createHash("sha256")
        .update(String(otp))
        .digest("hex");

    if (
      enteredOtpHash !==
      user.resetPasswordOtpHash
    ) {
      user.resetPasswordOtpAttempts =
        Number(
          user.resetPasswordOtpAttempts ||
            0
        ) + 1;

      await user.save();

      const attemptsLeft =
        Math.max(
          5 -
            user.resetPasswordOtpAttempts,
          0
        );

      return res.status(400).json({
        success: false,
        message: `Incorrect OTP. ${attemptsLeft} attempt(s) remaining.`,
      });
    }

    // NEW PASSWORD

    const samePassword =
      await bcrypt.compare(
        password,
        user.password
      );

    if (samePassword) {
      return res.status(400).json({
        success: false,
        message:
          "New password must be different from your current password",
      });
    }

    user.password =
      await bcrypt.hash(
        password,
        10
      );

    // Clear OTP
    user.resetPasswordOtpHash =
      null;

    user.resetPasswordOtpExpires =
      null;

    user.resetPasswordOtpAttempts =
      0;

    user.resetPasswordOtpLastSentAt =
      null;

    // Logout all existing sessions
    user.sessionVersion =
      Number(
        user.sessionVersion || 0
      ) + 1;

    await user.save();

    return res.status(200).json({
      success: true,
      message:
        "Password reset successfully. Please login with your new password.",
    });
  } catch (error) {
    console.error(
      "RESET PASSWORD OTP ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to reset password.",
    });
  }
};
// GET WHOLESALERS

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
