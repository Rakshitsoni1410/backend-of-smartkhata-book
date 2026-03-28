import express from "express";
import {
  addReview,
  getReviewsByUser,
  replyToReview,
} from "../controllers/reviewController.js";

const router = express.Router();

// ✅ Add review (NO AUTH)
router.post("/add", addReview);

// ✅ Get reviews
router.get("/:userId", getReviewsByUser);

// ✅ Reply
router.post("/reply/:reviewId", replyToReview);

export default router;