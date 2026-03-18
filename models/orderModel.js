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

  orderStatus: {
    type: String,
    enum: ["pending", "approved", "rejected", "onTheWay", "delivered"],
    default: "pending",
  },

  paymentStatus: {
    type: String,
    enum: ["unpaid", "partial", "paid"],
    default: "unpaid",
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Order =
  mongoose.models.order || mongoose.model("order", orderSchema);

export default Order;