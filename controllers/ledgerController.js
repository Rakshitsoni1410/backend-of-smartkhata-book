import Ledger from "../models/ledgerModel.js";
import connection from "../config/mongodb.js";

export const getLedgerEntries = async (req, res) => {
  try {
    await connection();
    const entries = await Ledger.find({ userId: req.params.userId })
      .sort({ createdAt: -1 })
      .populate("partyId", "name shopName");

    res.json({ success: true, entries });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};