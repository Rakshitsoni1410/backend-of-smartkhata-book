import Review from "../models/reviewModel.js";
import userModel from "../models/userModel.js";

// ======================================================
// ✅ ADD REVIEW (Retailer → Wholesaler, Same Category)
// ======================================================
export const addReview = async (req, res) => {
  try {
    const {
      targetUserId,
      comment,
      rating,
      author,
      role,
      businessType,
      shopName,
    } = req.body;

    // ✅ Validation
    if (!targetUserId || !comment || !rating || !author || !role) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    // ✅ Find wholesaler (target user)
    const targetUser = await userModel.findById(targetUserId);

    if (!targetUser) {
      return res.status(404).json({
        message: "Target user not found",
      });
    }

    // ✅ Rule 1: Only Retailer can add review
    if (role !== "Retailer") {
      return res.status(400).json({
        message: "Only Retailer can add review",
      });
    }

    // ✅ Rule 2: Target must be Wholesaler
    if (targetUser.role !== "Wholesaler") {
      return res.status(400).json({
        message: "You can only review Wholesalers",
      });
    }

    // ✅ Rule 3: Same category (businessType)
    if (targetUser.businessType !== businessType) {
      return res.status(400).json({
        message: "Business category must match",
      });
    }

    // ✅ Create review
    const review = await Review.create({
      targetUserId,
      reviewerId: null, // no auth

      author,
      role,
      shopName,
      businessType,

      title: "New review",
      comment,
      rating,

      reply: {
        text: "",
        repliedBy: "",
      },
    });

    res.status(201).json({
      success: true,
      message: "Review added successfully",
      review,
    });

  } catch (error) {
    res.status(500).json({
      message: error.message || "Failed to add review",
    });
  }
};

// ======================================================
// ✅ GET REVIEWS (for wholesaler screen)
// ======================================================
export const getReviewsByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const reviews = await Review.find({
      targetUserId: userId,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      reviews,
    });

  } catch (error) {
    res.status(500).json({
      message: error.message || "Failed to fetch reviews",
    });
  }
};

// ======================================================
// ✅ REPLY TO REVIEW (Only Wholesaler)
// ======================================================
export const replyToReview = async (req, res) => {
  try {
    const { text, role, businessType } = req.body;

    if (!text || !role) {
      return res.status(400).json({
        message: "Reply text and role are required",
      });
    }

    const review = await Review.findById(req.params.reviewId);

    if (!review) {
      return res.status(404).json({
        message: "Review not found",
      });
    }

    // ✅ Find wholesaler (target user)
    const targetUser = await userModel.findById(review.targetUserId);

    if (!targetUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // ✅ Rule 1: Only Wholesaler can reply
    if (role !== "Wholesaler") {
      return res.status(400).json({
        message: "Only Wholesaler can reply",
      });
    }

    // ✅ Rule 2: Same category
    if (targetUser.businessType !== businessType) {
      return res.status(400).json({
        message: "Business category must match",
      });
    }

    // ✅ Save reply
    review.reply = {
      text,
      repliedBy: targetUser.shopName || "Wholesaler",
      createdAt: new Date(),
    };

    await review.save();

    res.status(200).json({
      success: true,
      message: "Reply added successfully",
      review,
    });

  } catch (error) {
    res.status(500).json({
      message: error.message || "Failed to reply",
    });
  }
};