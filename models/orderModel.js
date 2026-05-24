import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
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

  productId: String,

  productName: String,

  category: String,

  businessType: String,

  quantity: Number,

  unit: String,

  pricePerUnit: Number,

  totalAmount: Number,

  // ADVANCE PAYMENT

  advanceAmount: {
    type: Number,
    default: 0,
  },

  remainingAmount: {
    type: Number,
    default: 0,
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

    enum: ["unpaid", "advancePaid", "partial", "paid"],

    default: "unpaid",
  },
  advanceRequested: {
    type: Boolean,
    default: false,
  },

  finalPaymentRequested: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

orderSchema.index({
  retailerId: 1,
  wholesalerId: 1,
  createdAt: -1,
});

const Order = mongoose.models.order || mongoose.model("order", orderSchema);

export default Order;
