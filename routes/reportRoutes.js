import express from "express";
import { getReportData } from "../controllers/reportController.js";
import authUser from "../middlewares/authUser.js";

const router = express.Router();

router.get("/:role/:userId", authUser, getReportData);

export default router;