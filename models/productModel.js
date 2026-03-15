import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },

  name: {
    type: String,
    required: true,
    trim: true,
  },

  category: {
    type: String,
    required: true,
    trim: true,
  },

  description: {
    type: String,
    default: "",
    trim: true,
  },

  purchase: {
    type: Number,
    default: 0,
  },

  selling: {
    type: Number,
    default: 0,
  },

  profit: {
    type: Number,
    default: 0,
  },

  stockQty: {
    type: Number,
    default: 0,
  },

  inStock: {
    type: Boolean,
    default: true,
  },

  inWeight: {
    type: Boolean,
    default: false,
  },

  weightUnit: {
    type: String,
    default: "piece",
  },

  weight: {
    type: Number,
    default: 0,
  },

  businessType: {
    type: String,
    default: "",
    trim: true,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const productModel =
  mongoose.models.product || mongoose.model("product", productSchema);

export default productModel;