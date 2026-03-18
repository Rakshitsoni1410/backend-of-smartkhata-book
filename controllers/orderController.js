import Order from "../models/orderModel.js";
import userModel from "../models/userModel.js";

export const createOrder = async (req, res) => {
  try {
    const order = new Order(req.body);
    await order.save();

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      order,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getWholesalers = async (req, res) => {
  try {
    const { businessType } = req.query;

    const wholesalers = await userModel.find({
      role: "Wholesaler",
      businessType,
    });

    res.json(wholesalers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getOrdersForRetailer = async (req, res) => {
  try {
    const orders = await Order.find({
      retailerId: req.params.id,
    }).populate("wholesalerId", "name shopName");

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getOrdersForWholesaler = async (req, res) => {
  try {
    const orders = await Order.find({
      wholesalerId: req.params.id,
    }).populate("retailerId", "name shopName");

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { orderStatus: status },
      { new: true }
    );

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};