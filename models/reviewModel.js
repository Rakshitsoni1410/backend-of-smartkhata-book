import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    targetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },

    // ✅ OPTIONAL NOW
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: false,
    },

    author: {
      type: String,
      required: true,
      trim: true,
    },

    title: {
      type: String,
      default: "Review",
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

    shopName: String,
    businessType: String,
    role: String,

    reply: {
      text: {
        type: String,
        default: "",
      },
      repliedBy: {
        type: String,
        default: "",
      },
      createdAt: Date,
    },
  },
  { timestamps: true }
);

const Review =
  mongoose.models.review || mongoose.model("review", reviewSchema);

export default Review;