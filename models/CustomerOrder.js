import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "product" },
  name:      { type: String, required: true },
  price:     { type: Number, required: true },
  quantity:  { type: Number, required: true },
});

const customerOrderSchema = new mongoose.Schema(
  {
    customerId:   { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    retailerId:   { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    retailerName: { type: String },
    customerName: { type: String },
    items:        [orderItemSchema],
    totalAmount:  { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "confirmed", "delivered", "cancelled"],
      default: "pending",
    },
    note: { type: String },
  },
  { timestamps: true }
);

const CustomerOrder = mongoose.models.customerorder ||
  mongoose.model("customerorder", customerOrderSchema);

export default CustomerOrder;