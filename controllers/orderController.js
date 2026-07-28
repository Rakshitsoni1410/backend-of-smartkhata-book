import Order from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import productModel from "../models/productModel.js";
import Ledger from "../models/ledgerModel.js";
import connection from "../config/mongodb.js";

export const createOrder = async (req, res) => {
  try {
    await connection();
    const { retailerId, productName, quantity, unit } = req.body;
    const cleanProductName = productName.trim();

    const wholesalerUsers = await userModel.find({
      role: { $regex: /^wholesaler$/i },
    });
    const wholesalerIds = wholesalerUsers.map((user) => user._id);

    const products = await productModel.find({
      name: { $regex: new RegExp(cleanProductName, "i") },
      ownerId: { $in: wholesalerIds },
      stockQty: { $gte: Number(quantity) },
      inStock: true,
    });

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No wholesaler found with enough stock",
      });
    }

    const scoredProducts = products.map((product) => {
      const rating = Number(product.rating || 0);
      const reviews = Number(product.reviews || 0);
      const selling = Number(product.selling || 0);
      const stockQty = Number(product.stockQty || 0);
      let aiScore = 1000 - selling;
      aiScore += stockQty * 0.2;
      if (rating > 0) aiScore += rating * 50;
      if (reviews > 0) aiScore += reviews * 0.5;
      return { product, aiScore };
    });

    scoredProducts.sort((a, b) => b.aiScore - a.aiScore);
    const bestProduct = scoredProducts[0].product;
    const totalAmount = Number(bestProduct.selling) * Number(quantity);

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
      advancePercentage: 0,
      advanceAmount: 0,
      remainingAmount: totalAmount,
      advancePaid: false,
      fullPaymentDone: false,
      paymentStatus: "unpaid",
      orderStatus: "pending",
    });

    bestProduct.stockQty = bestProduct.stockQty - Number(quantity);
    if (bestProduct.stockQty <= 0) bestProduct.inStock = false;
    await bestProduct.save();
    await order.save();

    await Ledger.create({
      userId: retailerId,
      partyId: bestProduct.ownerId,
      orderId: order._id,
      type: "debit",
      amount: totalAmount,
      note: `Order placed for ${bestProduct.name}`,
    });

    await Ledger.create({
      userId: bestProduct.ownerId,
      partyId: retailerId,
      orderId: order._id,
      type: "credit",
      amount: totalAmount,
      note: `New order received for ${bestProduct.name}`,
    });

    res.status(201).json({
      success: true,
      message: "AI selected wholesaler successfully",
      selectedWholesaler: bestProduct.ownerId,
      order,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getWholesalers = async (req, res) => {
  try {
    await connection();
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
    await connection();
    const orders = await Order.find({ retailerId: req.params.id }).populate(
      "wholesalerId",
      "name shopName",
    );
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getOrdersForWholesaler = async (req, res) => {
  try {
    await connection();
    const orders = await Order.find({ wholesalerId: req.params.id }).populate(
      "retailerId",
      "name shopName",
    );
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export const updateOrderStatus = async (req, res) => {
  try {
    await connection();
    const { status } = req.body;
    const existingOrder = await Order.findById(req.params.id);
    if (!existingOrder)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });

    // 🔒 Lock: once delivered, status cannot be changed
    if (existingOrder.orderStatus === "delivered") {
      return res.status(400).json({
        success: false,
        message: "Order is already delivered and cannot be updated",
      });
    }

    const updateData = { orderStatus: status };

    if (status === "approved") {
      updateData.deliveryDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
      if (existingOrder.advancePercentage > 0) {
        updateData.orderStatus = "advancePending";
        updateData.paymentStatus = "unpaid";
      } else {
        updateData.orderStatus = "processing";
        updateData.paymentStatus = "partial";
      }
    }
    if (status === "onTheWay") updateData.orderStatus = "onTheWay";
    if (status === "delivered") {
      updateData.orderStatus = "delivered";
      updateData.deliveredAt = new Date();
    }
    if (status === "rejected") updateData.orderStatus = "rejected";

    const order = await Order.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    });
    res.json({ success: true, message: "Order status updated", order });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};
export const payAdvance = async (req, res) => {
  try {
    await connection();
    const order = await Order.findById(req.params.id);
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });

    order.advancePaid = true;
    order.paymentStatus = "advancePaid";
    order.orderStatus = "processing";
    await order.save();

    await Ledger.create({
      userId: order.retailerId,
      partyId: order.wholesalerId,
      orderId: order._id,
      type: "debit",
      amount: order.advanceAmount,
      note: "Advance payment paid",
    });
    await Ledger.create({
      userId: order.wholesalerId,
      partyId: order.retailerId,
      orderId: order._id,
      type: "credit",
      amount: order.advanceAmount,
      note: "Advance payment received",
    });

    res.json({ success: true, message: "Advance payment successful", order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const completePayment = async (req, res) => {
  try {
    await connection();
    const order = await Order.findById(req.params.id);
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });

    order.fullPaymentDone = true;
    order.paymentStatus = "paid";
    order.orderStatus = "completed";
    await order.save();

    await Ledger.create({
      userId: order.retailerId,
      partyId: order.wholesalerId,
      orderId: order._id,
      type: "debit",
      amount: order.remainingAmount,
      note: "Final payment completed",
    });
    await Ledger.create({
      userId: order.wholesalerId,
      partyId: order.retailerId,
      orderId: order._id,
      type: "credit",
      amount: order.remainingAmount,
      note: "Final payment received",
    });

    res.json({ success: true, message: "Full payment completed", order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const requestAdvancePayment = async (req, res) => {
  try {
    await connection();
    const { advancePercentage } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });

    const advanceAmount = order.totalAmount * (Number(advancePercentage) / 100);
    const remainingAmount = order.totalAmount - advanceAmount;

    order.advanceRequested = true;
    order.advancePercentage = Number(advancePercentage);
    order.advanceAmount = advanceAmount;
    order.remainingAmount = remainingAmount;
    order.paymentStatus = "advanceRequested";
    await order.save();

    res.json({ success: true, message: "Advance payment requested", order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const requestFinalPayment = async (req, res) => {
  try {
    await connection();
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { finalPaymentRequested: true },
      { new: true },
    );
    res.json({ success: true, message: "Final payment requested", order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
