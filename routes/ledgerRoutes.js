import express from "express";

import {
  getLedgerEntries,
} from "../controllers/ledgerController.js";
import authUser from "../middlewares/authUser.js";

const router =
  express.Router();

router.get(
  "/:userId",
  authUser,
  getLedgerEntries
);

export default router;