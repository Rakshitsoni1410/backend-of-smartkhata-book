import express from "express";
import { addReview, getReviewsByUser } from "../controllers/reviewController.js";

const reviewRouter = express.Router();

reviewRouter.post("/add", addReview);
reviewRouter.get("/:userId", getReviewsByUser);

export default reviewRouter;