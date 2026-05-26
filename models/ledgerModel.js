import mongoose from "mongoose";

const ledgerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,

      ref: "user",

      required: true,
    },

    partyId: {
      type: mongoose.Schema.Types.ObjectId,

      ref: "user",
    },

    orderId: {
      type: mongoose.Schema.Types.ObjectId,

      ref: "order",
    },

    type: {
      type: String,

      enum: ["credit", "debit"],

      required: true,
    },

    amount: {
      type: Number,

      required: true,
    },

    note: {
      type: String,

      default: "",
    },

    source: {
      type: String,

      default: "Order",
    },
  },

  {
    timestamps: true,
  },
);

const Ledger = mongoose.models.ledger || mongoose.model("ledger", ledgerSchema);

export default Ledger;
