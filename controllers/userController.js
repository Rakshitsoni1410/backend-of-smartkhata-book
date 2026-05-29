import userModel from "../models/userModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import sendEmail from "../utils/sendEmail.js";
import connection from "../config/mongodb.js"; // ← ADDED

// ───────────────── REGISTER ─────────────────
export const registerUser = async (req, res) => {
  try {
    await connection(); // ← ADDED
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

    if (!name || !phone || !email || !role || !address || !password) {
      return res.status(400).json({
        success: false,
        message: "Please fill all required fields",
      });
    }

    if (role !== "Customer") {
      if (!shopName || !businessType) {
        return res.status(400).json({
          success: false,
          message: "Shop name and business type are required",
        });
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email",
      });
    }

    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const userExist = await userModel.findOne({
      $or: [{ phone }, { email: email.toLowerCase() }],
    });

    if (userExist) {
      return res.status(409).json({
        success: false,
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await userModel.create({
      name,
      phone,
      email: email.toLowerCase(),
      role,
      shopName: role === "Customer" ? "" : shopName,
      businessType: role === "Customer" ? "" : businessType,
      address,
      password: hashedPassword,
    });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    try {
      await sendEmail({
        to: email,
        subject: "Welcome to Smart Khata 🎉",
        html: `
          <div style="font-family:sans-serif;padding:20px">
            <h2>Hello ${name}</h2>
            <p>Your Smart Khata account has been created successfully.</p>
            <p>Welcome to Smart Khata 🚀</p>
          </div>
        `,
      });
    } catch (emailError) {
      console.log(emailError.message);
    }

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
      user: {
        _id: user._id,
        name: user.name,
        role: user.role,
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

// ───────────────── LOGIN ─────────────────
export const loginUser = async (req, res) => {
  try {
    await connection(); // ← ALREADY HERE
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        message: "Phone and password required",
      });
    }

    const user = await userModel.findOne({ phone });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        _id: user._id,
        name: user.name,
        role: user.role,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.log("LOGIN ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

// ───────────────── FORGOT PASSWORD ─────────────────
export const forgotPassword = async (req, res) => {
  try {
    await connection(); // ← ADDED
    const { email } = req.body;

    const user = await userModel.findOne({
      email: email.toLowerCase(),
    });

    if (!user) {
      return res.json({
        success: true,
        message: "If email exists, reset link sent",
      });
    }

    const token = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
    await user.save();

    const resetLink = `${process.env.CLIENT_URL}/#/reset-password/${token}`;

    try {
      await sendEmail({
        to: email,
        subject: "Reset Password",
        html: `
          <h2>Password Reset</h2>
          <p>Click the link below to reset your password:</p>
          <a href="${resetLink}">${resetLink}</a>
        `,
      });
    } catch (emailErr) {
      console.error("Email failed:", emailErr.message);
    }

    res.json({
      success: true,
      message: "Reset link sent",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ───────────────── RESET PASSWORD ─────────────────
export const resetPassword = async (req, res) => {
  try {
    await connection(); // ← ADDED
    const { token } = req.params;
    const { password } = req.body;

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

    const user = await userModel.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Token invalid or expired",
      });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: "Password reset successful",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ───────────────── GET WHOLESALERS ─────────────────
export const getWholesalersByBusiness = async (req, res) => {
  try {
    await connection(); // ← ADDED
    const { businessType } = req.params;

    const wholesalers = await userModel
      .find({ role: "Wholesaler", businessType })
      .select("-password -__v");

    res.status(200).json({
      success: true,
      users: wholesalers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch wholesalers",
    });
  }
};