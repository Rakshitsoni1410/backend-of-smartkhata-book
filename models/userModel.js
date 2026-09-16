import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    role: {
      type: String,
      enum: ["Retailer", "Wholesaler", "Customer"],
      default: "Retailer",
    },

    shopName: {
      type: String,
      trim: true,
      default: "",
    },

    businessType: {
      type: String,
      trim: true,
      default: "",
    },

    address: {
      type: String,
      required: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
    },

    // ==========================================
    // SINGLE SESSION CONTROL
    // ==========================================

    sessionVersion: {
      type: Number,
      default: 0,
    },

    // ==========================================
    // RESET PASSWORD
    // ==========================================
    resetPasswordOtpHash: {
      type: String,
      default: null,
    },

    resetPasswordOtpExpires: {
      type: Date,
      default: null,
    },

    resetPasswordOtpAttempts: {
      type: Number,
      default: 0,
    },

    resetPasswordOtpLastSentAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const userModel =
  mongoose.models.user ||
  mongoose.model("user", userSchema);

export default userModel;