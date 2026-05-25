import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    // USERS

    retailerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },

    wholesalerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },

    // PRODUCT DETAILS

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "product",
    },

    productName: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      default: "",
    },

    businessType: {
      type: String,
      default: "",
    },

    quantity: {
      type: Number,
      required: true,
      default: 1,
    },

    unit: {
      type: String,
      default: "pcs",
    },

    // PRICING

    pricePerUnit: {
      type: Number,
      required: true,
      default: 0,
    },

    totalAmount: {
      type: Number,
      default: 0,
    },

    // ADVANCE PAYMENT

    advancePercentage: {
      type: Number,
      default: 0,
    },

    advanceAmount: {
      type: Number,
      default: 0,
    },

    remainingAmount: {
      type: Number,
      default: 0,
    },

    advanceRequested: {
      type: Boolean,
      default: false,
    },

    finalPaymentRequested: {
      type: Boolean,
      default: false,
    },

    advancePaid: {
      type: Boolean,
      default: false,
    },

    fullPaymentDone: {
      type: Boolean,
      default: false,
    },

    // DELIVERY

    deliveryDate: {
      type: Date,
    },

    deliveredAt: {
      type: Date,
    },

    // ORDER STATUS

    orderStatus: {
      type: String,

      enum: [
        "pending",
        "approved",
        "advancePending",
        "processing",
        "onTheWay",
        "delivered",
        "completed",
        "rejected",
      ],

      default: "pending",
    },

    // PAYMENT STATUS

    paymentStatus: {
      type: String,

      enum: ["unpaid", "advanceRequested", "advancePaid", "partial", "paid"],

      default: "unpaid",
    },

    // TIMESTAMPS

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

// INDEXES

orderSchema.index({
  retailerId: 1,
  wholesalerId: 1,
  createdAt: -1,
});

// MODEL
const Order = mongoose.models.order || mongoose.model("order", orderSchema);

export default Order;
