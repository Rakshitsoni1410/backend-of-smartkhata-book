import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    targetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    author: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      default: "Review",
      trim: true,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    shopName: {
      type: String,
      default: "",
      trim: true,
    },
    businessType: {
      type: String,
      default: "",
      trim: true,
    },
    role: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

const Review =
  mongoose.models.review || mongoose.model("review", reviewSchema);

export default Review;