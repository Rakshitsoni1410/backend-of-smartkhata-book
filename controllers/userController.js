import userModel from "../models/userModel.js";
import bcrypt from "bcrypt";

export const registerUser = async (req, res) => {
  try {
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

    const userExist = await userModel.findOne({ phone });

    if (userExist) {
      return res.status(409).json({
        success: false,
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new userModel({
      name,
      phone,
      email,
      role,
      shopName: role === "Customer" ? "" : shopName,
      businessType: role === "Customer" ? "" : businessType,
      address,
      password: hashedPassword,
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: "User Registered",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        message: "Phone and password are required",
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

    const { password: _pwd, __v, ...userData } = user.toObject();

    res.json({
      success: true,
      message: "Login successful",
      user: userData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};