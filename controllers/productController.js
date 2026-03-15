import productModel from "../models/productModel.js";
import userModel from "../models/userModel.js";
import { productSuggestions } from "../utils/productSuggestions.js";

export const getProductSuggestions = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await userModel.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const businessType = user.businessType || "General";
    const suggestions =
      productSuggestions[businessType] || productSuggestions["General"];

    return res.status(200).json({
      success: true,
      businessType,
      suggestions,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const addProduct = async (req, res) => {
  try {
    const {
      ownerId,
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

    const profit = Number(selling) - Number(purchase);

    const product = new productModel({
      ownerId,
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

    return res.status(201).json({
      success: true,
      message: "Product added successfully",
      product,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getProductsByOwner = async (req, res) => {
  try {
    const { userId } = req.params;

    const products = await productModel
      .find({ ownerId: userId })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      products,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const data = req.body;

    data.profit = Number(data.selling || 0) - Number(data.purchase || 0);

    const updated = await productModel.findByIdAndUpdate(productId, data, {
      new: true,
    });

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product: updated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    await productModel.findByIdAndDelete(productId);

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};