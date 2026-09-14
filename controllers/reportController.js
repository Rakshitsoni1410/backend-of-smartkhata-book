import mongoose from "mongoose";
import Order from "../models/orderModel.js";
import Product from "../models/productModel.js";
import Review from "../models/reviewModel.js";
import Ledger from "../models/ledgerModel.js";
import connection from "../config/mongodb.js";

export const getReportData = async (req, res) => {
  try {
    await connection();

    const { role, userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    if (String(userId) !== String(req.userId) || role?.toLowerCase() !== String(req.user.role).toLowerCase()) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const objectId = new mongoose.Types.ObjectId(userId);
    const userRole = role?.toLowerCase();

    if (!["retailer", "wholesaler"].includes(userRole)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role",
      });
    }

    // -----------------------------------
    // ORDERS
    // -----------------------------------

    const orderFilter =
      userRole === "retailer"
        ? { retailerId: objectId }
        : { wholesalerId: objectId };

    const orders = await Order.find(orderFilter)
      .populate("retailerId", "name shopName phone")
      .populate("wholesalerId", "name shopName phone")
      .sort({ createdAt: -1 });

    const totalOrders = orders.length;

    const pendingOrders = orders.filter(
      (order) => order.orderStatus === "pending",
    ).length;

    const approvedOrders = orders.filter(
      (order) => order.orderStatus === "approved",
    ).length;

    const processingOrders = orders.filter(
      (order) =>
        order.orderStatus === "processing" ||
        order.orderStatus === "advancePending",
    ).length;

    const onTheWayOrders = orders.filter(
      (order) => order.orderStatus === "onTheWay",
    ).length;

    const deliveredOrders = orders.filter(
      (order) => order.orderStatus === "delivered",
    ).length;

    const completedOrders = orders.filter(
      (order) => order.orderStatus === "completed",
    ).length;

    const rejectedOrders = orders.filter(
      (order) => order.orderStatus === "rejected",
    ).length;

    // -----------------------------------
    // MONEY / PAYMENT
    // -----------------------------------

    const totalOrderValue = orders.reduce(
      (total, order) => total + Number(order.totalAmount || 0),
      0,
    );

    const totalAdvancePaid = orders.reduce((total, order) => {
      if (order.advancePaid) {
        return total + Number(order.advanceAmount || 0);
      }

      return total;
    }, 0);

    const fullyPaidAmount = orders.reduce((total, order) => {
      if (order.fullPaymentDone || order.paymentStatus === "paid") {
        return total + Number(order.totalAmount || 0);
      }

      return total;
    }, 0);

    const totalPaidAmount = orders.reduce((total, order) => {
      // Fully paid order
      if (order.fullPaymentDone || order.paymentStatus === "paid") {
        return total + Number(order.totalAmount || 0);
      }

      // Only advance paid
      if (order.advancePaid) {
        return total + Number(order.advanceAmount || 0);
      }

      return total;
    }, 0);

    const totalPendingAmount = Math.max(
      totalOrderValue - totalPaidAmount,
      0,
    );

    const unpaidOrders = orders.filter(
      (order) => order.paymentStatus === "unpaid",
    ).length;

    const partiallyPaidOrders = orders.filter(
      (order) =>
        order.paymentStatus === "partial" ||
        order.paymentStatus === "advancePaid",
    ).length;

    const paidOrders = orders.filter(
      (order) =>
        order.paymentStatus === "paid" ||
        order.fullPaymentDone === true,
    ).length;

    // -----------------------------------
    // PRODUCTS / STOCK
    // -----------------------------------

    const products = await Product.find({
      ownerId: objectId,
    });

    const totalProducts = products.length;

    const totalStockQuantity = products.reduce(
      (total, product) => total + Number(product.stockQty || 0),
      0,
    );

    const lowStockProducts = products.filter(
      (product) =>
        Number(product.stockQty || 0) > 0 &&
        Number(product.stockQty || 0) <= 5,
    ).length;

    const outOfStockProducts = products.filter(
      (product) =>
        Number(product.stockQty || 0) <= 0 ||
        product.inStock === false,
    ).length;

    const totalStockPurchaseValue = products.reduce(
      (total, product) =>
        total +
        Number(product.purchase || 0) *
          Number(product.stockQty || 0),
      0,
    );

    const totalStockSellingValue = products.reduce(
      (total, product) =>
        total +
        Number(product.selling || 0) *
          Number(product.stockQty || 0),
      0,
    );

    const estimatedStockProfit =
      totalStockSellingValue - totalStockPurchaseValue;

    // -----------------------------------
    // REVIEWS
    // -----------------------------------

    const reviews = await Review.find({
      targetUserId: objectId,
    });

    const totalReviews = reviews.length;

    // Works if your Review model contains `rating`
    const ratingReviews = reviews.filter(
      (review) => typeof review.rating === "number",
    );

    const averageRating =
      ratingReviews.length > 0
        ? ratingReviews.reduce(
            (total, review) => total + Number(review.rating || 0),
            0,
          ) / ratingReviews.length
        : 0;

    // -----------------------------------
    // LEDGER
    // -----------------------------------

    const ledgerEntries = await Ledger.countDocuments({
      userId: objectId,
    });

    // -----------------------------------
    // RECENT ORDERS
    // -----------------------------------

    const recentOrders = orders.slice(0, 10).map((order) => ({
      _id: order._id,

      invoiceNumber: order.invoiceNumber,

      productName: order.productName,

      quantity: order.quantity,

      unit: order.unit,

      pricePerUnit: order.pricePerUnit,

      totalAmount: order.totalAmount,

      orderStatus: order.orderStatus,

      paymentStatus: order.paymentStatus,

      createdAt: order.createdAt,

      retailer:
        order.retailerId?.shopName ||
        order.retailerId?.name ||
        "Retailer",

      wholesaler:
        order.wholesalerId?.shopName ||
        order.wholesalerId?.name ||
        "Wholesaler",
    }));

    // -----------------------------------
    // RESPONSE
    // -----------------------------------

    return res.status(200).json({
      success: true,

      report: {
        role: userRole,

        orders: {
          total: totalOrders,
          pending: pendingOrders,
          approved: approvedOrders,
          processing: processingOrders,
          onTheWay: onTheWayOrders,
          delivered: deliveredOrders,
          completed: completedOrders,
          rejected: rejectedOrders,
        },

        payments: {
          totalOrderValue,
          totalPaidAmount,
          totalPendingAmount,
          totalAdvancePaid,
          fullyPaidAmount,
          unpaidOrders,
          partiallyPaidOrders,
          paidOrders,
        },

        stock: {
          totalProducts,
          totalStockQuantity,
          lowStockProducts,
          outOfStockProducts,
          purchaseValue: totalStockPurchaseValue,
          sellingValue: totalStockSellingValue,
          estimatedProfit: estimatedStockProfit,
        },

        reviews: {
          total: totalReviews,
          averageRating: Number(averageRating.toFixed(1)),
        },

        ledger: {
          totalEntries: ledgerEntries,
        },

        recentOrders,
      },
    });
  } catch (error) {
    console.error("REPORT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate report",
      error: error.message,
    });
  }
};