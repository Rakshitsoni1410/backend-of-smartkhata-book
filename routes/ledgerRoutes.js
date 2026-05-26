import express from "express";

import {
  getLedgerEntries,
} from "../controllers/ledgerController.js";

const router =
  express.Router();

router.get(
  "/:userId",
  getLedgerEntries
);

export default router;