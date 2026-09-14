import mongoose from "mongoose";

const paymentHistorySchema = new mongoose.Schema(
  {
    // Fake gateway transaction ID
    transactionId: {
      type: String,
      required: true,
      trim: true,
    },

    // advance payment or final payment
    paymentType: {
      type: String,
      enum: ["advance", "final"],
      required: true,
    },

    // Fake payment method selected by retailer
    paymentMethod: {
      type: String,
      enum: ["upi", "card", "netbanking"],
      required: true,
    },

    // Amount paid in this transaction
    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    // Payment status
    status: {
      type: String,
      enum: ["success", "failed"],
      default: "success",
    },

    // Marks this clearly as a demo/fake payment
    isMockPayment: {
      type: Boolean,
      default: true,
    },

    // Payment date/time
    paidAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: true,
  }
);

const orderSchema = new mongoose.Schema(
  {
    // ==========================================
    // USERS
    // ==========================================

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

    // ==========================================
    // PRODUCT DETAILS
    // ==========================================

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

    // ==========================================
    // PRICING
    // ==========================================

    pricePerUnit: {
      type: Number,
      required: true,
      default: 0,
    },

    totalAmount: {
      type: Number,
      default: 0,
    },

    // ==========================================
    // BILLING
    // ==========================================

    invoiceNumber: {
      type: String,
      default: null,
    },

    billSentToRetailer: {
      type: Boolean,
      default: false,
    },

    billSentAt: {
      type: Date,
      default: null,
    },

    // ==========================================
    // ADVANCE PAYMENT
    // ==========================================

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

    // ==========================================
    // FAKE / DEMO PAYMENT RECORDS
    // ==========================================

    paymentHistory: {
      type: [paymentHistorySchema],
      default: [],
    },

    // Latest successful transaction
    lastPaymentTransactionId: {
      type: String,
      default: null,
      trim: true,
    },

    lastPaymentMethod: {
      type: String,
      enum: ["upi", "card", "netbanking", null],
      default: null,
    },

    lastPaymentType: {
      type: String,
      enum: ["advance", "final", null],
      default: null,
    },

    lastPaymentAmount: {
      type: Number,
      default: 0,
    },

    lastPaymentAt: {
      type: Date,
      default: null,
    },

    // ==========================================
    // DELIVERY
    // ==========================================

    deliveryDate: {
      type: Date,
    },

    deliveredAt: {
      type: Date,
    },

    // ==========================================
    // ORDER STATUS
    // ==========================================

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

    // ==========================================
    // PAYMENT STATUS
    // ==========================================

    paymentStatus: {
      type: String,

      enum: [
        "unpaid",
        "advanceRequested",
        "advancePaid",
        "partial",
        "paid",
      ],

      default: "unpaid",
    },

    // ==========================================
    // CREATED DATE
    // ==========================================

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// ==========================================
// INDEXES
// ==========================================

orderSchema.index({
  retailerId: 1,
  wholesalerId: 1,
  createdAt: -1,
});

orderSchema.index({
  "paymentHistory.transactionId": 1,
});

// ==========================================
// MODEL
// ==========================================

const Order =
  mongoose.models.order ||
  mongoose.model("order", orderSchema);

export default Order;