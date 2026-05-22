import express from "express";
import {
  addReview,
  getReviewsByUser,
  replyToReview,
  getReviewSuggestions,
} from "../controllers/reviewController.js";

const router = express.Router();

// ✅ Add review (NO AUTH)
router.post("/add", addReview);

// ✅ Reply
router.post("/reply/:reviewId", replyToReview);
router.get(
  "/suggestions/:retailerId",
  getReviewSuggestions
);
// ✅ Get reviews
router.get("/:userId", getReviewsByUser);


export default router;