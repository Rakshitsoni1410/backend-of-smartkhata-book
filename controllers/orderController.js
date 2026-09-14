import Order from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import productModel from "../models/productModel.js";
import Ledger from "../models/ledgerModel.js";
import connection from "../config/mongodb.js";
import { getNextInvoiceNumber } from "../utils/generateInvoiceNumber.js";

// =====================================================
// CREATE ORDER
// =====================================================

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
      name: {
        $regex: new RegExp(cleanProductName, "i"),
      },

      ownerId: {
        $in: wholesalerIds,
      },

      stockQty: {
        $gte: Number(quantity),
      },

      inStock: true,
    });

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No wholesaler found with enough stock",
      });
    }

    // ---------------------------------------
    // AI PRODUCT SELECTION
    // ---------------------------------------

    const scoredProducts = products.map((product) => {
      const rating = Number(product.rating || 0);
      const reviews = Number(product.reviews || 0);
      const selling = Number(product.selling || 0);
      const stockQty = Number(product.stockQty || 0);

      let aiScore = 1000 - selling;

      aiScore += stockQty * 0.2;

      if (rating > 0) {
        aiScore += rating * 50;
      }

      if (reviews > 0) {
        aiScore += reviews * 0.5;
      }

      return {
        product,
        aiScore,
      };
    });

    scoredProducts.sort((a, b) => b.aiScore - a.aiScore);

    const bestProduct = scoredProducts[0].product;

    const totalAmount = Number(bestProduct.selling) * Number(quantity);

    // ---------------------------------------
    // CREATE ORDER
    // ---------------------------------------

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

      billSentToRetailer: false,

      billSentAt: null,
    });

    // ---------------------------------------
    // REDUCE STOCK
    // ---------------------------------------

    bestProduct.stockQty = bestProduct.stockQty - Number(quantity);

    if (bestProduct.stockQty <= 0) {
      bestProduct.inStock = false;
    }

    await bestProduct.save();

    await order.save();

    // ---------------------------------------
    // RETAILER LEDGER
    // ---------------------------------------

    await Ledger.create({
      userId: retailerId,

      partyId: bestProduct.ownerId,

      orderId: order._id,

      type: "debit",

      amount: totalAmount,

      note: `Order placed for ${bestProduct.name}`,
    });

    // ---------------------------------------
    // WHOLESALER LEDGER
    // ---------------------------------------

    await Ledger.create({
      userId: bestProduct.ownerId,

      partyId: retailerId,

      orderId: order._id,

      type: "credit",

      amount: totalAmount,

      note: `New order received for ${bestProduct.name}`,
    });

    return res.status(201).json({
      success: true,

      message: "AI selected wholesaler successfully",

      selectedWholesaler: bestProduct.ownerId,

      order,
    });
  } catch (error) {
    console.log("CREATE ORDER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// GET WHOLESALERS
// =====================================================

export const getWholesalers = async (req, res) => {
  try {
    await connection();

    const { businessType } = req.query;

    const wholesalers = await userModel.find({
      role: {
        $regex: /^wholesaler$/i,
      },

      businessType,
    });

    return res.json(wholesalers);
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

// =====================================================
// GET RETAILER ORDERS
// =====================================================

export const getOrdersForRetailer = async (req, res) => {
  try {
    await connection();

    const orders = await Order.find({
      retailerId: req.params.id,
    })

      .populate("wholesalerId", "name shopName")

      .sort({
        createdAt: -1,
      });

    return res.json(orders);
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

// =====================================================
// GET WHOLESALER ORDERS
// =====================================================

export const getOrdersForWholesaler = async (req, res) => {
  try {
    await connection();

    const orders = await Order.find({
      wholesalerId: req.params.id,
    })

      .populate("retailerId", "name shopName")

      .sort({
        createdAt: -1,
      });

    return res.json(orders);
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

// =====================================================
// UPDATE ORDER STATUS
// =====================================================

export const updateOrderStatus = async (req, res) => {
  try {
    await connection();

    const { status } = req.body;

    const existingOrder = await Order.findById(req.params.id);

    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Once delivered, manual status cannot change.
    // Final payment can still change delivered -> completed.
    if (existingOrder.orderStatus === "delivered") {
      return res.status(400).json({
        success: false,

        message: "Order is already delivered and cannot be updated",
      });
    }

    const updateData = {
      orderStatus: status,
    };

    // ---------------------------------------
    // APPROVED
    // ---------------------------------------

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

    // ---------------------------------------
    // ON THE WAY
    // ---------------------------------------

    if (status === "onTheWay") {
      updateData.orderStatus = "onTheWay";
    }

    // ---------------------------------------
    // DELIVERED
    // ---------------------------------------

    if (status === "delivered") {
      updateData.orderStatus = "delivered";

      updateData.deliveredAt = new Date();
    }

    // ---------------------------------------
    // REJECTED
    // ---------------------------------------

    if (status === "rejected") {
      updateData.orderStatus = "rejected";
    }

    const order = await Order.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    });

    return res.json({
      success: true,

      message: "Order status updated",

      order,
    });
  } catch (error) {
    console.log("STATUS UPDATE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// PAY ADVANCE
// =====================================================

export const payAdvance = async (req, res) => {
  try {
    await connection();

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

    return res.json({
      success: true,

      message: "Advance payment successful",

      order,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// COMPLETE PAYMENT
// =====================================================

export const completePayment = async (req, res) => {
  try {
    await connection();

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

    order.remainingAmount = 0;

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

    return res.json({
      success: true,

      message: "Full payment completed",

      order,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// REQUEST ADVANCE PAYMENT
// =====================================================

export const requestAdvancePayment = async (req, res) => {
  try {
    await connection();

    const { advancePercentage } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const percentage = Number(advancePercentage);

    if (percentage < 0 || percentage > 100) {
      return res.status(400).json({
        success: false,

        message: "Advance percentage must be between 0 and 100",
      });
    }

    const advanceAmount = order.totalAmount * (percentage / 100);

    const remainingAmount = order.totalAmount - advanceAmount;

    order.advanceRequested = true;

    order.advancePercentage = percentage;

    order.advanceAmount = advanceAmount;

    order.remainingAmount = remainingAmount;

    order.paymentStatus = "advanceRequested";

    await order.save();

    return res.json({
      success: true,

      message: "Advance payment requested",

      order,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// REQUEST FINAL PAYMENT
// =====================================================

export const requestFinalPayment = async (req, res) => {
  try {
    await connection();

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.orderStatus !== "delivered") {
      return res.status(400).json({
        success: false,

        message: "Final payment can only be requested after delivery",
      });
    }

    order.finalPaymentRequested = true;

    await order.save();

    return res.json({
      success: true,

      message: "Final payment requested",

      order,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// BILLING HELPER
// =====================================================

async function ensureInvoiceNumbers(orders, fallbackWholesalerName) {
  for (const order of orders) {
    if (!order.invoiceNumber) {
      const wholesalerName =
        order.wholesalerId?.shopName ||
        order.wholesalerId?.name ||
        fallbackWholesalerName ||
        "SHOP";

      order.invoiceNumber = await getNextInvoiceNumber(
        wholesalerName,
        order.createdAt,
      );

      await order.save();
    }
  }

  return orders;
}

// =====================================================
// RETAILER BILLING
// ONLY BILLS SENT BY WHOLESALER
// =====================================================

export const getBillingForRetailer = async (req, res) => {
  try {
    await connection();

    const { id } = req.params;

    const orders = await Order.find({
      retailerId: id,

      // IMPORTANT:
      // retailer only sees bills wholesaler sent
      billSentToRetailer: true,
    })

      .populate("wholesalerId", "name shopName phone")

      .sort({
        createdAt: -1,
      });

    // Invoice should normally already exist,
    // but this keeps old records safe.
    await ensureInvoiceNumbers(orders);

    return res.status(200).json({
      success: true,

      bills: orders,
    });
  } catch (error) {
    console.log("BILLING RETAILER ERROR:", error);

    return res.status(500).json({
      success: false,

      message: "Failed to fetch billing",

      error: error.message,
    });
  }
};

// =====================================================
// WHOLESALER BILLING
// WHOLESALER CAN SEE ALL OWN ORDERS
// =====================================================

export const getBillingForWholesaler = async (req, res) => {
  try {
    await connection();

    const { id } = req.params;

    const wholesaler = await userModel.findById(id).select("name shopName");

    const wholesalerName = wholesaler?.shopName || wholesaler?.name || "SHOP";

    const orders = await Order.find({
      wholesalerId: id,
    })

      .populate("retailerId", "name shopName phone")

      .sort({
        createdAt: -1,
      });

    await ensureInvoiceNumbers(orders, wholesalerName);

    return res.status(200).json({
      success: true,

      bills: orders,
    });
  } catch (error) {
    console.log("BILLING WHOLESALER ERROR:", error);

    return res.status(500).json({
      success: false,

      message: "Failed to fetch billing",

      error: error.message,
    });
  }
};

// =====================================================
// SEND BILL TO RETAILER
// =====================================================

export const sendBillToRetailer = async (req, res) => {
  try {
    await connection();

    const { id } = req.params;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,

        message: "Order not found",
      });
    }

    // ---------------------------------------
    // MUST BE DELIVERED
    // ---------------------------------------

    if (order.orderStatus !== "delivered") {
      return res.status(400).json({
        success: false,

        message: "Bill can only be sent after the order is delivered",
      });
    }

    // ---------------------------------------
    // MUST HAVE INVOICE
    // ---------------------------------------

    if (!order.invoiceNumber) {
      const wholesaler = await userModel
        .findById(order.wholesalerId)
        .select("name shopName");

      const wholesalerName = wholesaler?.shopName || wholesaler?.name || "SHOP";

      order.invoiceNumber = await getNextInvoiceNumber(
        wholesalerName,
        order.createdAt,
      );
    }

    // ---------------------------------------
    // PREVENT DUPLICATE SEND
    // ---------------------------------------

    if (order.billSentToRetailer) {
      return res.status(400).json({
        success: false,

        message: "Bill has already been sent to retailer",
      });
    }

    // ---------------------------------------
    // SEND
    // ---------------------------------------

    order.billSentToRetailer = true;

    order.billSentAt = new Date();

    await order.save();

    return res.status(200).json({
      success: true,

      message: "Bill sent to retailer successfully",

      bill: order,
    });
  } catch (error) {
    console.error("SEND BILL ERROR:", error);

    return res.status(500).json({
      success: false,

      message: "Failed to send bill",

      error: error.message,
    });
  }
};
