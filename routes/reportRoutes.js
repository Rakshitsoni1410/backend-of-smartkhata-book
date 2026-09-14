import express from "express";
import { getReportData } from "../controllers/reportController.js";

const router = express.Router();

router.get("/:role/:userId", getReportData);

export default router;