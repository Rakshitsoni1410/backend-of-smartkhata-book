import express from "express";
import { getDashboardData } from "../controllers/dashboardController.js";
import authUser from "../middlewares/authUser.js";

const router = express.Router();

router.get("/:role", authUser, getDashboardData);

export default router;