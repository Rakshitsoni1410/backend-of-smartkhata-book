import Review from "../models/reviewModel.js";
import userModel from "../models/userModel.js";
import Order from "../models/orderModel.js";
import connection from "../config/mongodb.js";

export const addReview = async (req, res) => {
  try {
    await connection();
    const {
      targetUserId,
      comment,
      rating,
    } = req.body;

    if (!targetUserId || !comment || rating === undefined) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (req.user.role !== "Retailer") {
      return res.status(403).json({ message: "Only retailers can add reviews" });
    }

    const targetUser = await userModel.findById(targetUserId);
    if (!targetUser)
      return res.status(404).json({ message: "Target user not found" });

    if (targetUser.role !== "Wholesaler")
      return res
        .status(400)
        .json({ message: "You can only review Wholesalers" });
    const hasOrder = await Order.exists({
      retailerId: req.userId,
      wholesalerId: targetUserId,
    });
    if (!hasOrder)
      return res.status(403).json({ message: "You can only review a wholesaler you ordered from" });

    const reviewer = await userModel.findById(req.userId).select("name shopName businessType role");
    if (!reviewer)
      return res.status(401).json({ message: "Reviewer not found" });

    const review = await Review.create({
      targetUserId,
      reviewerId: req.userId,
      author: reviewer.name,
      role: reviewer.role,
      shopName: reviewer.shopName,
      businessType: reviewer.businessType,
      title: "New review",
      comment,
      rating,
      reply: { text: "", repliedBy: "" },
    });

    res
      .status(201)
      .json({ success: true, message: "Review added successfully", review });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to add review" });
  }
};

export const getReviewsByUser = async (req, res) => {
  try {
    await connection();
    const { userId } = req.params;
    const reviews = await Review.find({ targetUserId: userId }).sort({
      createdAt: -1,
    });
    res.status(200).json({ success: true, reviews });
  } catch (error) {
    res
      .status(500)
      .json({ message: error.message || "Failed to fetch reviews" });
  }
};

export const getReviewSuggestions = async (req, res) => {
  try {
    await connection();
    const { retailerId } = req.params;
    if (req.user.role !== "Retailer" || String(retailerId) !== String(req.userId)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    const orders = await Order.find({ retailerId: req.userId });
    const wholesalerIds = [
      ...new Set(orders.map((o) => o.wholesalerId.toString())),
    ];
    const wholesalers = await userModel.find({
      _id: { $in: wholesalerIds },
      role: "Wholesaler",
    });
    res.status(200).json({ success: true, users: wholesalers });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({
        success: false,
        message: error.message || "Failed to fetch suggestions",
      });
  }
};

export const replyToReview = async (req, res) => {
  try {
    await connection();
    const { text } = req.body;

    if (!text)
      return res
        .status(400)
        .json({ message: "Reply text and role are required" });

    const review = await Review.findById(req.params.reviewId);
    if (!review) return res.status(404).json({ message: "Review not found" });

    const targetUser = await userModel.findById(review.targetUserId);
    if (!targetUser) return res.status(404).json({ message: "User not found" });

    if (req.user.role !== "Wholesaler" || String(review.targetUserId) !== String(req.userId))
      return res.status(403).json({ message: "Only the reviewed wholesaler can reply" });

    review.reply = {
      text,
      repliedBy: targetUser.shopName || "Wholesaler",
      createdAt: new Date(),
    };
    await review.save();

    res
      .status(200)
      .json({ success: true, message: "Reply added successfully", review });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to reply" });
  }
};
