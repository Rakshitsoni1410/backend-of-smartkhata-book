import Order from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import productModel from "../models/productModel.js";

export const createOrder = async (req, res) => {
  try {
    const { retailerId, productName, quantity, unit } = req.body;

    // CLEAN PRODUCT NAME

    const cleanProductName = productName.trim();

    // FIND WHOLESALERS

    const wholesalerUsers = await userModel.find({
      role: {
        $regex: /^wholesaler$/i,
      },
    });

    const wholesalerIds = wholesalerUsers.map((user) => user._id);

    // FIND PRODUCTS

    const products = await productModel.find({
      name: {
        $regex: new RegExp(cleanProductName, "i"),
      },

      ownerId: {
        $in: wholesalerIds,
      },

      // ONLY AVAILABLE STOCK
      stockQty: {
        $gte: Number(quantity),
      },

      inStock: true,
    });

    // NO PRODUCT FOUND

    if (products.length === 0) {
      return res.status(404).json({
        success: false,

        message: "No wholesaler found with enough stock",
      });
    }

    // AI SCORING

    const scoredProducts = products.map((product) => {
      const rating = Number(product.rating || 0);

      const reviews = Number(product.reviews || 0);

      const selling = Number(product.selling || 0);

      const stockQty = Number(product.stockQty || 0);

      // SMART AI SCORE

      let aiScore = 0;

      // LOWER PRICE = BETTER
      aiScore += 1000 - selling;

      // STOCK BONUS
      const stockBonus = stockQty * 0.2;

      aiScore += stockBonus;

      // RATING BONUS
      if (rating > 0) {
        aiScore += rating * 50;
      }

      // REVIEW BONUS
      if (reviews > 0) {
        aiScore += reviews * 0.5;
      }

      return {
        product,

        aiScore,
      };
    });

    // SORT BEST SCORE

    scoredProducts.sort((a, b) => b.aiScore - a.aiScore);

    // BEST PRODUCT

    const bestProduct = scoredProducts[0].product;

    // PAYMENT CALCULATION

    const totalAmount = Number(bestProduct.selling) * Number(quantity);

    // WHOLESALER POLICY

    const wholesaler = await userModel.findById(bestProduct.ownerId);

    const advancePercentage = Number(wholesaler?.advancePercentage || 0);

    const advanceAmount = totalAmount * (advancePercentage / 100);

    const remainingAmount = totalAmount - advanceAmount;

    // CREATE ORDER

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

      // ADVANCE PAYMENT

      advancePercentage,

      advanceAmount,

      remainingAmount,

      advancePaid: false,

      fullPaymentDone: false,

      // STATUS

      paymentStatus: "unpaid",

      orderStatus: "pending",
    });

    // REDUCE STOCK

    bestProduct.stockQty = bestProduct.stockQty - Number(quantity);

    // AUTO OUT OF STOCK

    if (bestProduct.stockQty <= 0) {
      bestProduct.inStock = false;
    }

    await bestProduct.save();

    // SAVE ORDER

    await order.save();

    // RESPONSE

    res.status(201).json({
      success: true,

      message: "AI selected wholesaler successfully",

      selectedWholesaler: bestProduct.ownerId,

      order,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,

      message: error.message,
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

    // =========================
    // FIND ORDER
    // =========================

    const existingOrder = await Order.findById(req.params.id);

    if (!existingOrder) {
      return res.status(404).json({
        success: false,

        message: "Order not found",
      });
    }

    // =========================
    // UPDATE OBJECT
    // =========================

    const updateData = {
      orderStatus: status,
    };

    // =========================
    // APPROVED
    // =========================

    if (status === "approved") {
      // DELIVERY DATE
      updateData.deliveryDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

      // =====================
      // ADVANCE REQUIRED
      // =====================

      if (existingOrder.advancePercentage > 0) {
        updateData.orderStatus = "advancePending";

        updateData.paymentStatus = "unpaid";
      }

      // =====================
      // NO ADVANCE REQUIRED
      // =====================
      else {
        updateData.orderStatus = "processing";

        updateData.paymentStatus = "partial";
      }
    }

    // =========================
    // ON THE WAY
    // =========================

    if (status === "onTheWay") {
      updateData.orderStatus = "onTheWay";
    }

    // =========================
    // DELIVERED
    // =========================

    if (status === "delivered") {
      updateData.orderStatus = "delivered";

      updateData.deliveredAt = new Date();
    }

    // =========================
    // REJECTED
    // =========================

    if (status === "rejected") {
      updateData.orderStatus = "rejected";
    }

    // =========================
    // UPDATE ORDER
    // =========================

    const order = await Order.findByIdAndUpdate(
      req.params.id,

      updateData,

      { new: true },
    );

    // =========================
    // RESPONSE
    // =========================

    res.json({
      success: true,

      message: "Order status updated",

      order,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,

      message: error.message,
    });
  }
};

// pay advance
export const payAdvance = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,

        message: "Order not found",
      });
    }

    order.advancePaid = true;

    order.paymentStatus = "advancePaid";

    order.orderStatus = "processing";

    await order.save();

    res.json({
      success: true,

      message: "Advance payment successful",

      order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,

      message: error.message,
    });
  }
};
//COMPLETE PAYMENT
export const completePayment = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,

        message: "Order not found",
      });
    }

    order.fullPaymentDone = true;

    order.paymentStatus = "paid";

    order.orderStatus = "completed";

    await order.save();

    res.json({
      success: true,

      message: "Full payment completed",

      order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,

      message: error.message,
    });
  }
};
export const requestAdvancePayment = async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,

      {
        advanceRequested: true,

        paymentStatus: "advanceRequested",
      },

      { new: true },
    );

    res.json({
      success: true,

      order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,

      message: error.message,
    });
  }
};
export const requestFinalPayment = async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,

      {
        finalPaymentRequested: true,
      },

      { new: true },
    );

    res.json({
      success: true,

      message: "Final payment requested",

      order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,

      message: error.message,
    });
  }
};
