import productModel from "../models/productModel.js";
import userModel from "../models/userModel.js";
import { productSuggestions } from "../utils/productSuggestions.js";
import connection from "../config/mongodb.js";

export const getProductSuggestions = async (req, res) => {
  try {
    await connection();
    const { userId } = req.params;
    if (String(userId) !== String(req.userId)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    const user = await userModel.findById(userId);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const businessType = user.businessType || "General";
    const suggestions =
      productSuggestions[businessType] || productSuggestions["General"];
    return res.status(200).json({ success: true, businessType, suggestions });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const addProduct = async (req, res) => {
  try {
    await connection();
    const {
      name,
      category,
      description,
      purchase,
      selling,
      stockQty,
      inStock,
      inWeight,
      weightUnit,
      weight,
      businessType,
    } = req.body;
    if (!name?.trim() || !category?.trim()) {
      return res.status(400).json({ success: false, message: "Name and category are required" });
    }
    if (![purchase, selling, stockQty, weight].every((value) => value === undefined || Number.isFinite(Number(value)))) {
      return res.status(400).json({ success: false, message: "Product numeric values are invalid" });
    }
    const profit = Number(selling) - Number(purchase);

    const product = new productModel({
      ownerId: req.userId,
      name,
      category,
      description,
      purchase,
      selling,
      profit,
      stockQty,
      inStock,
      inWeight,
      weightUnit,
      weight,
      businessType,
    });
    await product.save();

    return res
      .status(201)
      .json({ success: true, message: "Product added successfully", product });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getProductsByOwner = async (req, res) => {
  try {
    await connection();
    const { userId } = req.params;
    if (String(userId) !== String(req.userId)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    const products = await productModel
      .find({ ownerId: req.userId })
      .sort({ createdAt: -1 });
    return res.status(200).json({ success: true, products });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    await connection();
    const { productId } = req.params;
    const allowedFields = [
      "name", "category", "description", "purchase", "selling", "stockQty",
      "inStock", "inWeight", "weightUnit", "weight", "businessType",
    ];
    const data = Object.fromEntries(
      allowedFields
        .filter((field) => Object.prototype.hasOwnProperty.call(req.body, field))
        .map((field) => [field, req.body[field]]),
    );
    if (data.name !== undefined && !String(data.name).trim()) {
      return res.status(400).json({ success: false, message: "Product name is required" });
    }
    const current = await productModel.findOne({ _id: productId, ownerId: req.userId });
    if (!current) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    const purchase = data.purchase ?? current.purchase;
    const selling = data.selling ?? current.selling;
    if (![purchase, selling, data.stockQty, data.weight].every((value) => value === undefined || Number.isFinite(Number(value)))) {
      return res.status(400).json({ success: false, message: "Product numeric values are invalid" });
    }
    data.profit = Number(selling) - Number(purchase);

    const updated = await productModel.findOneAndUpdate({ _id: productId, ownerId: req.userId }, data, {
      new: true,
      runValidators: true,
    });
    return res
      .status(200)
      .json({
        success: true,
        message: "Product updated successfully",
        product: updated,
      });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    await connection();
    const { productId } = req.params;
    const deleted = await productModel.findOneAndDelete({ _id: productId, ownerId: req.userId });
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    return res
      .status(200)
      .json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
