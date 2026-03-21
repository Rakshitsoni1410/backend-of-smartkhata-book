import Review from "../models/reviewModel.js";

export const addReview = async (req, res) => {
  try {
    const {
      targetUserId,
      author,
      title,
      comment,
      rating,
      shopName,
      businessType,
      role,
    } = req.body;

    if (!targetUserId || !author || !comment || !rating) {
      return res.status(400).json({
        message: "targetUserId, author, comment and rating are required",
      });
    }

    const review = await Review.create({
      targetUserId,
      author,
      title: title || "Review",
      comment,
      rating,
      shopName: shopName || "",
      businessType: businessType || "",
      role: role || "",
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

export const getReviewsByUser = async (req, res) => {
  try {
    const reviews = await Review.find({
      targetUserId: req.params.userId,
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