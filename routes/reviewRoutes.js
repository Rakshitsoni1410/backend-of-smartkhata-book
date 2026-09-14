import express from "express";
import {
  addReview,
  getReviewsByUser,
  replyToReview,
  getReviewSuggestions,
} from "../controllers/reviewController.js";
import authUser from "../middlewares/authUser.js";

const router = express.Router();

// ✅ Add review (NO AUTH)
router.post("/add", authUser, addReview);

// ✅ Reply
router.post("/reply/:reviewId", authUser, replyToReview);
router.get(
  "/suggestions/:retailerId",
  authUser,
  getReviewSuggestions
);
// ✅ Get reviews
router.get("/:userId", authUser, getReviewsByUser);


export default router;