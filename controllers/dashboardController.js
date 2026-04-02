import mongoose from "mongoose";
import Order from "../models/orderModel.js";
import Review from "../models/reviewModel.js";

export const getDashboardData = async (req, res) => {
  try {
    const { role } = req.params;
    const { userId } = req.query;

    console.log("Role:", role);
    console.log("UserId from API:", userId);

    if (!userId) {
      return res.status(400).json({ message: "UserId required" });
    }

    const objectId = new mongoose.Types.ObjectId(userId);

    if (role.toLowerCase() === "retailer") {
      const ordersList = await Order.find({ retailerId: objectId });
     

      const orders = ordersList.length;

      const reviews = await Review.countDocuments({
        targetUserId: objectId,
      });

      return res.json({
        stock: 5,
        employees: 2,
        orders,
        reviews,
      });
    }

    if (role.toLowerCase() === "wholesaler") {
      const orders = await Order.countDocuments({
        wholesalerId: objectId,
      });

      const reviews = await Review.countDocuments({
        targetUserId: objectId,
      });

      return res.json({
        stock: 20,
        employees: 5,
        orders,
        reviews,
      });
    }

    res.json({ stock: 0, employees: 0, orders: 0, reviews: 0 });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};