import jwt from "jsonwebtoken";
import userModel from "../models/userModel.js";

// ==========================================
// USER AUTHENTICATION MIDDLEWARE
// ==========================================

const authUser = async (req, res, next) => {
  try {
    // ========================================
    // GET TOKEN
    // ========================================

    let token = req.headers.token;

    // Also support:
    // Authorization: Bearer <token>
    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;

      if (authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
      }
    }

    // ========================================
    // TOKEN NOT PROVIDED
    // ========================================

    if (!token) {
      return res.status(401).json({
        success: false,
        code: "NO_TOKEN",
        message: "Not authorized. Please login again.",
      });
    }

    // ========================================
    // VERIFY JWT
    // ========================================

    const token_decode = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    // ========================================
    // FIND CURRENT USER
    // ========================================

    const user = await userModel
      .findById(token_decode.id)
      .select("sessionVersion");

    if (!user) {
      return res.status(401).json({
        success: false,
        code: "USER_NOT_FOUND",
        message: "User not found. Please login again.",
      });
    }

    // ========================================
    // CHECK SESSION VERSION
    // ========================================
    //
    // JWT:
    // sessionVersion = 1
    //
    // Database after another login:
    // sessionVersion = 2
    //
    // 1 !== 2
    // Therefore old session is rejected.
    // ========================================

    if (
      Number(token_decode.sessionVersion) !==
      Number(user.sessionVersion)
    ) {
      return res.status(401).json({
        success: false,
        code: "SESSION_EXPIRED",
        message:
          "Your account was logged in on another device. Please login again.",
      });
    }

    // ========================================
    // ATTACH USER ID
    // ========================================

    req.userId = token_decode.id;

    // Keep compatibility with your existing code
    if (req.body) {
      req.body.userId = token_decode.id;
    }

    req.user = {
      id: token_decode.id,
      role: token_decode.role,
      sessionVersion: token_decode.sessionVersion,
    };

    // ========================================
    // CONTINUE
    // ========================================

    next();
  } catch (error) {
    console.log("AUTH ERROR:", error.message);

    // JWT expired
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        code: "TOKEN_EXPIRED",
        message: "Session expired. Please login again.",
      });
    }

    // Bad/modified JWT
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        code: "INVALID_TOKEN",
        message: "Invalid session. Please login again.",
      });
    }

    return res.status(401).json({
      success: false,
      code: "AUTH_FAILED",
      message: "Authentication failed. Please login again.",
    });
  }
};

export default authUser;