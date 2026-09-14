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

    if (!retailerId || !productName || !quantity) {
      return res.status(400).json({
        success: false,
        message: "Retailer, product name and quantity are required",
      });
    }

    const cleanProductName = productName.trim();

    const wholesalerUsers = await userModel.find({
      role: {
        $regex: /^wholesaler$/i,
      },
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

    // ==========================================
    // AI PRODUCT SELECTION
    // ==========================================

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

    // ==========================================
    // CREATE ORDER
    // ==========================================

    const order = new Order({
      retailerId,

      wholesalerId: bestProduct.ownerId,

      productId: bestProduct._id,

      productName: bestProduct.name,

      category: bestProduct.category,

      businessType: bestProduct.businessType,

      quantity: Number(quantity),

      unit: unit || "pcs",

      pricePerUnit: Number(bestProduct.selling),

      totalAmount,

      advancePercentage: 0,

      advanceAmount: 0,

      remainingAmount: totalAmount,

      advanceRequested: false,

      finalPaymentRequested: false,

      advancePaid: false,

      fullPaymentDone: false,

      paymentStatus: "unpaid",

      orderStatus: "pending",

      billSentToRetailer: false,

      billSentAt: null,

      paymentHistory: [],
    });

    // ==========================================
    // REDUCE STOCK
    // ==========================================

    bestProduct.stockQty = bestProduct.stockQty - Number(quantity);

    if (bestProduct.stockQty <= 0) {
      bestProduct.inStock = false;
    }

    await bestProduct.save();

    await order.save();

    // ==========================================
    // RETAILER LEDGER
    // ==========================================

    await Ledger.create({
      userId: retailerId,

      partyId: bestProduct.ownerId,

      orderId: order._id,

      type: "debit",

      amount: totalAmount,

      note: `Order placed for ${bestProduct.name}`,
    });

    // ==========================================
    // WHOLESALER LEDGER
    // ==========================================

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

    // Delivered / completed orders
    // cannot be manually changed.
    if (["delivered", "completed"].includes(existingOrder.orderStatus)) {
      return res.status(400).json({
        success: false,

        message:
          "Order has already been delivered and cannot be manually updated",
      });
    }

    const updateData = {
      orderStatus: status,
    };

    // ======================================
    // APPROVED
    // ======================================

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

    // ======================================
    // ON THE WAY
    // ======================================

    if (status === "onTheWay") {
      updateData.orderStatus = "onTheWay";
    }

    // ======================================
    // DELIVERED
    // ======================================

    if (status === "delivered") {
      updateData.orderStatus = "delivered";

      updateData.deliveredAt = new Date();
    }

    // ======================================
    // REJECTED
    // ======================================

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
// DEMO PAYMENT HELPERS
// =====================================================

const ALLOWED_MOCK_PAYMENT_METHODS = ["upi", "card", "netbanking"];

const validateMockPaymentPayload = (req, expectedAmount) => {
  const { mockPayment, transactionId, paymentMethod, amount } = req.body || {};

  if (mockPayment !== true) {
    return {
      error: "Demo payment confirmation is required",
    };
  }

  const cleanTransactionId = String(transactionId || "").trim();

  const cleanPaymentMethod = String(paymentMethod || "")
    .trim()
    .toLowerCase();

  const clientAmount = Number(amount);

  const serverAmount = Number(expectedAmount || 0);

  if (!cleanTransactionId) {
    return {
      error: "Transaction ID is required",
    };
  }

  if (!ALLOWED_MOCK_PAYMENT_METHODS.includes(cleanPaymentMethod)) {
    return {
      error: "Invalid payment method",
    };
  }

  if (!Number.isFinite(clientAmount) || clientAmount < 0) {
    return {
      error: "Invalid payment amount",
    };
  }

  // Never trust amount from frontend.
  if (Math.abs(clientAmount - serverAmount) > 0.01) {
    return {
      error: "Payment amount does not match the order amount",
    };
  }

  return {
    transactionId: cleanTransactionId,

    paymentMethod: cleanPaymentMethod,

    amount: serverAmount,
  };
};

const transactionAlreadyExists = async (transactionId) => {
  return Boolean(
    await Order.exists({
      "paymentHistory.transactionId": transactionId,
    }),
  );
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

    // ======================================
    // ADVANCE MUST BE REQUESTED
    // ======================================

    if (!order.advanceRequested) {
      return res.status(400).json({
        success: false,

        message: "Advance payment has not been requested for this order",
      });
    }

    // ======================================
    // PREVENT DOUBLE PAYMENT
    // ======================================

    if (order.advancePaid) {
      return res.status(400).json({
        success: false,

        message: "Advance payment has already been completed",
      });
    }

    const expectedAmount = Number(order.advanceAmount || 0);

    if (expectedAmount <= 0) {
      return res.status(400).json({
        success: false,

        message: "No advance amount is due for this order",
      });
    }

    // ======================================
    // VALIDATE FAKE PAYMENT
    // ======================================

    const payment = validateMockPaymentPayload(req, expectedAmount);

    if (payment.error) {
      return res.status(400).json({
        success: false,
        message: payment.error,
      });
    }

    // ======================================
    // DUPLICATE TRANSACTION
    // ======================================

    if (await transactionAlreadyExists(payment.transactionId)) {
      return res.status(409).json({
        success: false,

        message: "This transaction ID has already been used",
      });
    }

    const paidAt = new Date();

    if (!Array.isArray(order.paymentHistory)) {
      order.paymentHistory = [];
    }

    // ======================================
    // SAVE PAYMENT HISTORY
    // ======================================

    order.paymentHistory.push({
      transactionId: payment.transactionId,

      paymentType: "advance",

      paymentMethod: payment.paymentMethod,

      amount: payment.amount,

      status: "success",

      isMockPayment: true,

      paidAt,
    });

    // ======================================
    // LATEST PAYMENT DETAILS
    // ======================================

    order.lastPaymentTransactionId = payment.transactionId;

    order.lastPaymentMethod = payment.paymentMethod;

    order.lastPaymentType = "advance";

    order.lastPaymentAmount = payment.amount;

    order.lastPaymentAt = paidAt;

    // ======================================
    // ORDER PAYMENT STATE
    // ======================================

    order.advancePaid = true;

    order.paymentStatus = "advancePaid";

    order.orderStatus = "processing";

    await order.save();

    // ======================================
    // RETAILER LEDGER
    // ======================================

    await Ledger.create({
      userId: order.retailerId,

      partyId: order.wholesalerId,

      orderId: order._id,

      type: "debit",

      amount: payment.amount,

      note: `Advance payment paid • ${payment.transactionId}`,
    });

    // ======================================
    // WHOLESALER LEDGER
    // ======================================

    await Ledger.create({
      userId: order.wholesalerId,

      partyId: order.retailerId,

      orderId: order._id,

      type: "credit",

      amount: payment.amount,

      note: `Advance payment received • ${payment.transactionId}`,
    });

    return res.json({
      success: true,

      message: "Advance payment successful",

      transaction: {
        transactionId: payment.transactionId,

        paymentType: "advance",

        paymentMethod: payment.paymentMethod,

        amount: payment.amount,

        status: "success",

        isMockPayment: true,

        paidAt,
      },

      order,
    });
  } catch (error) {
    console.error("PAY ADVANCE ERROR:", error);

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

    // ======================================
    // FINAL PAYMENT MUST BE REQUESTED
    // ======================================

    if (!order.finalPaymentRequested) {
      return res.status(400).json({
        success: false,

        message: "Final payment has not been requested for this order",
      });
    }

    // ======================================
    // PREVENT DOUBLE PAYMENT
    // ======================================

    if (order.fullPaymentDone) {
      return res.status(400).json({
        success: false,

        message: "Final payment has already been completed",
      });
    }

    // IMPORTANT:
    // Save amount BEFORE setting
    // remainingAmount to zero.

    const finalPaymentAmount = Number(order.remainingAmount || 0);

    if (finalPaymentAmount <= 0) {
      return res.status(400).json({
        success: false,

        message: "No remaining payment is due for this order",
      });
    }

    // ======================================
    // VALIDATE FAKE PAYMENT
    // ======================================

    const payment = validateMockPaymentPayload(req, finalPaymentAmount);

    if (payment.error) {
      return res.status(400).json({
        success: false,

        message: payment.error,
      });
    }

    // ======================================
    // DUPLICATE TRANSACTION
    // ======================================

    if (await transactionAlreadyExists(payment.transactionId)) {
      return res.status(409).json({
        success: false,

        message: "This transaction ID has already been used",
      });
    }

    const paidAt = new Date();

    if (!Array.isArray(order.paymentHistory)) {
      order.paymentHistory = [];
    }

    // ======================================
    // SAVE FINAL PAYMENT HISTORY
    // ======================================

    order.paymentHistory.push({
      transactionId: payment.transactionId,

      paymentType: "final",

      paymentMethod: payment.paymentMethod,

      amount: payment.amount,

      status: "success",

      isMockPayment: true,

      paidAt,
    });

    // ======================================
    // LATEST PAYMENT DETAILS
    // ======================================

    order.lastPaymentTransactionId = payment.transactionId;

    order.lastPaymentMethod = payment.paymentMethod;

    order.lastPaymentType = "final";

    order.lastPaymentAmount = payment.amount;

    order.lastPaymentAt = paidAt;

    // ======================================
    // COMPLETE ORDER
    // ======================================

    order.fullPaymentDone = true;

    order.paymentStatus = "paid";

    order.orderStatus = "completed";

    order.remainingAmount = 0;

    await order.save();

    // ======================================
    // RETAILER LEDGER
    // ======================================

    await Ledger.create({
      userId: order.retailerId,

      partyId: order.wholesalerId,

      orderId: order._id,

      type: "debit",

      amount: finalPaymentAmount,

      note: `Final payment completed • ${payment.transactionId}`,
    });

    // ======================================
    // WHOLESALER LEDGER
    // ======================================

    await Ledger.create({
      userId: order.wholesalerId,

      partyId: order.retailerId,

      orderId: order._id,

      type: "credit",

      amount: finalPaymentAmount,

      note: `Final payment received • ${payment.transactionId}`,
    });

    return res.json({
      success: true,

      message: "Full payment completed",

      transaction: {
        transactionId: payment.transactionId,

        paymentType: "final",

        paymentMethod: payment.paymentMethod,

        amount: payment.amount,

        status: "success",

        isMockPayment: true,

        paidAt,
      },

      order,
    });
  } catch (error) {
    console.error("COMPLETE PAYMENT ERROR:", error);

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

    if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
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

    if (order.fullPaymentDone) {
      return res.status(400).json({
        success: false,

        message: "Order payment is already complete",
      });
    }

    if (order.finalPaymentRequested) {
      return res.status(400).json({
        success: false,

        message: "Final payment has already been requested",
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

      billSentToRetailer: true,
    })
      .populate("wholesalerId", "name shopName phone")
      .sort({
        createdAt: -1,
      });

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

    // ======================================
    // MUST BE DELIVERED OR COMPLETED
    // ======================================

    if (!["delivered", "completed"].includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,

        message: "Bill can only be sent after the order is delivered",
      });
    }

    // ======================================
    // PREVENT DUPLICATE SEND
    // ======================================

    if (order.billSentToRetailer) {
      return res.status(400).json({
        success: false,

        message: "Bill has already been sent to retailer",
      });
    }

    // ======================================
    // GENERATE INVOICE
    // ======================================

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

    // ======================================
    // SEND BILL
    // ======================================

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
