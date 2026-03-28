import Review from "../models/reviewModel.js";
import Order from "../models/orderModel.js";

export const getDashboardData = async (req, res) => {
  try {
    const { role } = req.params;

    if (role === "wholesaler") {
      const orders = await Order.countDocuments();
      const reviews = await Review.countDocuments();

      res.json({
        stock: 20, // static for now
        employees: 5,
        orders,
        reviews,
      });
    } else {
      res.json({
        stock: 0,
        employees: 0,
        orders: 0,
        reviews: 0,
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};