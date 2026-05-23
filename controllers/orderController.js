import Order from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import productModel from "../models/productModel.js";
export const createOrder = async (req, res) => {
  try {

    const {
      retailerId,
      productName,
      quantity,
      unit,
    } = req.body;

    // find all wholesalers selling same product
    const wholesalerUsers = await userModel.find({
      role: { $regex: /^wholesaler$/i },
    });

    const wholesalerIds = wholesalerUsers.map(
      (user) => user._id
    );

    const products = await productModel.find({
      name: productName,
      ownerId: { $in: wholesalerIds },
    });

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No wholesaler found"
      });
    }

    // AI scoring
    const scoredProducts = products.map(product => {

      const aiScore =
        (product.rating * 50) +
        (product.reviews * 0.5) -
        (product.selling * 0.1);

      return {
        product,
        aiScore
      };
    });

    // sort highest score first
    scoredProducts.sort((a, b) => b.aiScore - a.aiScore);

    // best wholesaler selected by AI
    const bestProduct = scoredProducts[0].product;

    const totalAmount =
      Number(bestProduct.selling) * Number(quantity);

    const order = new Order({
      retailerId,
      wholesalerId: bestProduct.ownerId,

      productId: bestProduct._id,
      productName: bestProduct.name,
      category: bestProduct.category,
      businessType: bestProduct.businessType,

      quantity,
      unit,

      pricePerUnit: bestProduct.selling,
      totalAmount,
    });

    await order.save();

    res.status(201).json({
      success: true,
      message: "AI selected wholesaler successfully",
      selectedWholesaler: bestProduct.ownerId,
      order,
    });

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
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