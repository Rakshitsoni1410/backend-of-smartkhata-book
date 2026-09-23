import mongoose from "mongoose";

import Order from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import productModel from "../models/productModel.js";
import Ledger from "../models/ledgerModel.js";

import connection from "../config/mongodb.js";

import { getNextInvoiceNumber } from "../utils/generateInvoiceNumber.js";

import { safeNotify } from "../utils/createNotification.js";

// =====================================================
// HELPERS
// =====================================================

const escapeRegex = (value) =>
  String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const isUser = (value, userId) => String(value) === String(userId);

const formatNotificationMoney = (value) => {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) {
    return "₹0";
  }
  return `₹${amount.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
};

// APPLY MONGOOSE SESSION WHEN AVAILABLE

const applySession = (query, session) => {
  if (session) {
    query.session(session);
  }
  return query;
};

// BUILD HUMAN-READABLE RECOMMENDATION REASONS

const buildRecommendationReasons = ({
  price,
  stock,
  rating,
  reviews,
  minPrice,
  maxAllowedPrice,
  quantity,
  recentOrders,
}) => {
  const reasons = [];

  if (price === minPrice) {
    reasons.push("Lowest available price");
  } else if (price <= maxAllowedPrice) {
    reasons.push("Competitive price");
  } else {
    reasons.push("Price is above the smart auto-selection range");
  }

  if (rating >= 4.5) {
    reasons.push("Strong customer rating");
  } else if (rating >= 4) {
    reasons.push("Good customer rating");
  } else if (!rating) {
    reasons.push("New seller with no rating yet");
  }

  if (stock >= quantity * 3) {
    reasons.push("High stock availability");
  } else {
    reasons.push("Enough stock for this order");
  }

  if (reviews >= 20) {
    reasons.push("Good review history");
  }

  if (recentOrders === 0) {
    reasons.push("Lower recent order load");
  }

  return reasons.slice(0, 4);
};

// =====================================================
// SCORE PRODUCTS
// =====================================================

const scoreProducts = ({ products, quantity, historyMap }) => {
  if (!Array.isArray(products) || products.length === 0) {
    return [];
  }

  const prices = products.map((product) => Number(product.selling));
  const scoringMinPrice = Math.min(...prices);
  const scoringMaxPrice = Math.max(...prices);

  const maxReviews = Math.max(
    ...products.map((product) => Math.max(Number(product.reviews || 0), 0)),
    1,
  );

  return products.map((product) => {
    const price = Number(product.selling);
    const stock = Number(product.stockQty || 0);
    const rawRating = Number(product.rating || 0);
    const reviews = Math.max(Number(product.reviews || 0), 0);

    const history = historyMap.get(String(product.ownerId)) || {
      lifetimeOrders: 0,
      recentOrders: 0,
    };

    const priceScore =
      scoringMaxPrice === scoringMinPrice
        ? 1
        : Math.max(
            0,
            Math.min(
              1,
              (scoringMaxPrice - price) / (scoringMaxPrice - scoringMinPrice),
            ),
          );

    let ratingScore = 0.6;
    if (Number.isFinite(rawRating) && rawRating > 0) {
      ratingScore = Math.max(0, Math.min(1, rawRating / 5));
    }

    const idealStock = Math.max(quantity * 3, 1);
    const stockScore = Math.max(0, Math.min(1, stock / idealStock));

    let reviewScore = 0.35;
    if (reviews > 0) {
      reviewScore = Math.max(
        0,
        Math.min(1, Math.log1p(reviews) / Math.log1p(maxReviews)),
      );
    }

    const qualityScore =
      priceScore * 0.45 +
      ratingScore * 0.3 +
      stockScore * 0.2 +
      reviewScore * 0.05;

    const fairnessScore = 1 / (1 + history.recentOrders);
    const finalScore = qualityScore * 0.75 + fairnessScore * 0.25;

    return {
      product,
      price,
      stock,
      rating: rawRating,
      reviews,
      lifetimeOrders: history.lifetimeOrders,
      recentOrders: history.recentOrders,
      priceScore,
      ratingScore,
      stockScore,
      reviewScore,
      qualityScore,
      fairnessScore,
      finalScore,
    };
  });
};

// =====================================================
// LOAD ALL ELIGIBLE WHOLESALERS / PRODUCTS
// =====================================================

const loadEligibleOrderData = async ({
  productName,
  quantity,
  session = null,
}) => {
  const escapedProductName = escapeRegex(productName);
  const exactProductRegex = new RegExp(`^${escapedProductName}$`, "i");

  const wholesalerQuery = userModel
    .find({ role: { $regex: /^wholesaler$/i } })
    .select("_id name shopName")
    .lean();

  const wholesalerUsers = await applySession(wholesalerQuery, session);

  if (wholesalerUsers.length === 0) {
    const error = new Error("No wholesalers are currently available");
    error.statusCode = 404;
    throw error;
  }

  const wholesalerIds = wholesalerUsers.map((w) => w._id);

  const productQuery = productModel
    .find({
      name: { $regex: exactProductRegex },
      ownerId: { $in: wholesalerIds },
      selling: { $gt: 0 },
      stockQty: { $gte: quantity },
      inStock: true,
    })
    .lean();

  const rawProducts = await applySession(productQuery, session);

  if (rawProducts.length === 0) {
    const error = new Error(
      "No wholesaler currently has enough stock for this product",
    );
    error.statusCode = 404;
    throw error;
  }

  const productByWholesaler = new Map();

  for (const product of rawProducts) {
    const ownerKey = String(product.ownerId);
    const price = Number(product.selling);
    const stock = Number(product.stockQty);

    if (
      !Number.isFinite(price) ||
      price <= 0 ||
      !Number.isFinite(stock) ||
      stock < quantity
    ) {
      continue;
    }

    const existing = productByWholesaler.get(ownerKey);

    if (!existing) {
      productByWholesaler.set(ownerKey, product);
      continue;
    }

    const existingPrice = Number(existing.selling);
    const existingStock = Number(existing.stockQty || 0);

    if (
      price < existingPrice ||
      (price === existingPrice && stock > existingStock)
    ) {
      productByWholesaler.set(ownerKey, product);
    }
  }

  const products = Array.from(productByWholesaler.values());

  if (products.length === 0) {
    const error = new Error("No valid wholesaler product listing found");
    error.statusCode = 404;
    throw error;
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const candidateOwnerIds = products.map((p) => p.ownerId);

  let aggregate = Order.aggregate([
    {
      $match: {
        wholesalerId: { $in: candidateOwnerIds },
        orderStatus: { $ne: "rejected" },
      },
    },
    {
      $group: {
        _id: "$wholesalerId",
        lifetimeOrders: { $sum: 1 },
        recentOrders: {
          $sum: {
            $cond: [{ $gte: ["$createdAt", thirtyDaysAgo] }, 1, 0],
          },
        },
      },
    },
  ]);

  if (session) {
    aggregate = aggregate.session(session);
  }

  const orderStats = await aggregate;

  const historyMap = new Map();
  for (const stat of orderStats) {
    historyMap.set(String(stat._id), {
      lifetimeOrders: Number(stat.lifetimeOrders || 0),
      recentOrders: Number(stat.recentOrders || 0),
    });
  }

  const allPrices = products.map((p) => Number(p.selling));
  const minPrice = Math.min(...allPrices);
  const maxAllowedPrice = Number((minPrice * 1.1).toFixed(2));

  return { wholesalerUsers, products, historyMap, minPrice, maxAllowedPrice };
};

// =====================================================
// AUTO-SELECTION ENGINE
// =====================================================

const buildAutoSelection = ({
  products,
  historyMap,
  quantity,
  minPrice,
  maxAllowedPrice,
}) => {
  const candidateProducts = products.filter(
    (p) => Number(p.selling) <= maxAllowedPrice,
  );

  if (candidateProducts.length === 0) {
    const error = new Error("No competitive wholesaler found");
    error.statusCode = 404;
    throw error;
  }

  const scoredCandidates = scoreProducts({
    products: candidateProducts,
    quantity,
    historyMap,
  });

  const bestQuality = Math.max(...scoredCandidates.map((c) => c.qualityScore));

  const newWholesalerCandidates = scoredCandidates
    .filter(
      (c) => c.lifetimeOrders === 0 && c.qualityScore >= bestQuality * 0.7,
    )
    .sort((a, b) => {
      if (b.qualityScore !== a.qualityScore)
        return b.qualityScore - a.qualityScore;
      if (a.price !== b.price) return a.price - b.price;
      return b.stock - a.stock;
    });

  const normalCandidates = [...scoredCandidates].sort((a, b) => {
    if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
    if (a.recentOrders !== b.recentOrders)
      return a.recentOrders - b.recentOrders;
    if (a.price !== b.price) return a.price - b.price;
    return b.stock - a.stock;
  });

  const candidateQueue = [];
  const addedProductIds = new Set();

  const addCandidate = (candidate) => {
    const productId = String(candidate.product._id);
    if (addedProductIds.has(productId)) return;
    addedProductIds.add(productId);
    candidateQueue.push(candidate);
  };

  for (const candidate of newWholesalerCandidates) addCandidate(candidate);
  for (const candidate of normalCandidates) addCandidate(candidate);

  if (candidateQueue.length === 0) {
    const error = new Error("No suitable wholesaler found");
    error.statusCode = 404;
    throw error;
  }

  return {
    scoredCandidates,
    candidateQueue,
    bestQuality,
    minPrice,
    maxAllowedPrice,
  };
};

// WHOLESALER LOOKUP HELPER

const getWholesalerDetails = (wholesalerUsers, ownerId) =>
  wholesalerUsers.find((w) => String(w._id) === String(ownerId));

// =====================================================
// RECOMMENDATION RESPONSE
// =====================================================

const buildRecommendationPayload = ({ eligibleData, quantity }) => {
  const { wholesalerUsers, products, historyMap, minPrice, maxAllowedPrice } =
    eligibleData;

  const manualScores = scoreProducts({ products, quantity, historyMap });

  const autoSelection = buildAutoSelection({
    products,
    historyMap,
    quantity,
    minPrice,
    maxAllowedPrice,
  });

  const smartRecommended = autoSelection.candidateQueue[0];
  const recommendedProductId = String(smartRecommended.product._id);

  const recommendations = manualScores
    .map((candidate) => {
      const wholesaler = getWholesalerDetails(
        wholesalerUsers,
        candidate.product.ownerId,
      );

      return {
        wholesalerId: candidate.product.ownerId,
        productId: candidate.product._id,
        name: wholesaler?.name || "",
        shopName: wholesaler?.shopName || wholesaler?.name || "Wholesaler",
        productName: candidate.product.name,
        category: candidate.product.category || "",
        businessType: candidate.product.businessType || "",
        unit: candidate.product.weightUnit || "pcs",
        price: Number(candidate.price),
        stock: Number(candidate.stock),
        rating: Number(candidate.rating || 0),
        reviews: Number(candidate.reviews || 0),
        recentOrders: Number(candidate.recentOrders || 0),
        lifetimeOrders: Number(candidate.lifetimeOrders || 0),
        smartScore: Number(candidate.finalScore.toFixed(4)),
        qualityScore: Number(candidate.qualityScore.toFixed(4)),
        fairnessScore: Number(candidate.fairnessScore.toFixed(4)),
        withinSmartPriceRange:
          Number(candidate.price) <= Number(maxAllowedPrice),
        isSmartRecommended:
          String(candidate.product._id) === recommendedProductId,
        reasons: buildRecommendationReasons({
          price: Number(candidate.price),
          stock: Number(candidate.stock),
          rating: Number(candidate.rating || 0),
          reviews: Number(candidate.reviews || 0),
          minPrice,
          maxAllowedPrice,
          quantity,
          recentOrders: Number(candidate.recentOrders || 0),
        }),
      };
    })
    .sort((a, b) => {
      if (a.isSmartRecommended !== b.isSmartRecommended) {
        return a.isSmartRecommended ? -1 : 1;
      }
      if (b.smartScore !== a.smartScore) return b.smartScore - a.smartScore;
      return a.price - b.price;
    });

  const recommended = recommendations.find((item) => item.isSmartRecommended);

  return { recommendations, recommended, autoSelection, manualScores };
};

// CREATE ORDER

export const createOrder = async (req, res) => {
  let session = null;

  try {
    await connection();

    const role = String(req.user?.role || "")
      .trim()
      .toLowerCase();

    if (role !== "retailer") {
      return res.status(403).json({
        success: false,
        message: "Only retailers can place orders",
      });
    }

    const retailerId = req.userId || req.user?._id;

    if (!retailerId) {
      return res.status(401).json({
        success: false,
        message: "Retailer authentication required",
      });
    }

    const {
      productName,
      quantity,
      unit,
      selectionMode = "auto",
      selectedWholesalerId = null,
      selectedProductId = null,
    } = req.body || {};

    const cleanProductName = String(productName || "").trim();
    const numericQuantity = Number(quantity);
    const cleanSelectionMode = String(selectionMode || "auto")
      .trim()
      .toLowerCase();

    if (
      !cleanProductName ||
      !Number.isInteger(numericQuantity) ||
      numericQuantity <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Product name and a positive whole quantity are required",
      });
    }

    if (!["auto", "manual"].includes(cleanSelectionMode)) {
      return res.status(400).json({
        success: false,
        message: "Selection mode must be auto or manual",
      });
    }

    if (cleanSelectionMode === "manual") {
      if (!selectedWholesalerId || !selectedProductId) {
        return res.status(400).json({
          success: false,
          message: "Please select a wholesaler before placing a manual order",
        });
      }

      if (
        !mongoose.isValidObjectId(selectedWholesalerId) ||
        !mongoose.isValidObjectId(selectedProductId)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid selected wholesaler or product",
        });
      }
    }

    session = await mongoose.startSession();

    let transactionResult = null;

    await session.withTransaction(async () => {
      transactionResult = null;

      const eligibleData = await loadEligibleOrderData({
        productName: cleanProductName,
        quantity: numericQuantity,
        session,
      });

      const {
        wholesalerUsers,
        products,
        historyMap,
        minPrice,
        maxAllowedPrice,
      } = eligibleData;

      const recommendationData = buildRecommendationPayload({
        eligibleData,
        quantity: numericQuantity,
      });

      const { recommended, autoSelection, manualScores } = recommendationData;

      let selectedCandidate = null;
      let updatedProduct = null;
      let selectionStrategy = "balanced_smart_selection";

      // ==========================================
      // AUTO MODE
      // ==========================================

      if (cleanSelectionMode === "auto") {
        for (const candidate of autoSelection.candidateQueue) {
          const reserved = await productModel.findOneAndUpdate(
            {
              _id: candidate.product._id,
              ownerId: candidate.product.ownerId,
              inStock: true,
              stockQty: { $gte: numericQuantity },
              selling: Number(candidate.price),
            },
            { $inc: { stockQty: -numericQuantity } },
            { new: true, session },
          );

          if (reserved) {
            selectedCandidate = candidate;
            updatedProduct = reserved;
            break;
          }
        }

        if (!selectedCandidate || !updatedProduct) {
          const error = new Error(
            "Stock or price changed while placing the order. Please try again.",
          );
          error.statusCode = 409;
          throw error;
        }

        const wasNewOpportunity =
          selectedCandidate.lifetimeOrders === 0 &&
          selectedCandidate.qualityScore >= autoSelection.bestQuality * 0.7;

        selectionStrategy = wasNewOpportunity
          ? "new_wholesaler_opportunity"
          : "balanced_smart_selection";
      }

      // ==========================================
      // MANUAL MODE
      // ==========================================

      if (cleanSelectionMode === "manual") {
        const selectedManualCandidate = manualScores.find(
          (candidate) =>
            String(candidate.product._id) === String(selectedProductId) &&
            String(candidate.product.ownerId) === String(selectedWholesalerId),
        );

        if (!selectedManualCandidate) {
          const error = new Error(
            "The selected wholesaler is no longer available for this product and quantity",
          );
          error.statusCode = 409;
          throw error;
        }

        const reserved = await productModel.findOneAndUpdate(
          {
            _id: selectedManualCandidate.product._id,
            ownerId: selectedManualCandidate.product.ownerId,
            name: {
              $regex: new RegExp(`^${escapeRegex(cleanProductName)}$`, "i"),
            },
            inStock: true,
            stockQty: { $gte: numericQuantity },
            selling: Number(selectedManualCandidate.price),
          },
          { $inc: { stockQty: -numericQuantity } },
          { new: true, session },
        );

        if (!reserved) {
          const error = new Error(
            "The selected wholesaler's stock or price changed. Please refresh recommendations and choose again.",
          );
          error.statusCode = 409;
          throw error;
        }

        selectedCandidate = selectedManualCandidate;
        updatedProduct = reserved;
        selectionStrategy = "manual_user_choice";
      }

      // ==========================================
      // OUT OF STOCK CHECK
      // ==========================================

      if (Number(updatedProduct.stockQty) <= 0) {
        await productModel.updateOne(
          { _id: updatedProduct._id },
          { $set: { inStock: false } },
          { session },
        );
      }

      const selectedProduct = selectedCandidate.product;
      const selectedPrice = Number(selectedCandidate.price);
      const totalAmount = Number((selectedPrice * numericQuantity).toFixed(2));
      const requestedUnit = typeof unit === "string" ? unit.trim() : "";
      const selectedUnit =
        requestedUnit || String(selectedProduct.weightUnit || "pcs").trim();

      const selectedReasons = buildRecommendationReasons({
        price: selectedPrice,
        stock: Number(selectedCandidate.stock),
        rating: Number(selectedCandidate.rating || 0),
        reviews: Number(selectedCandidate.reviews || 0),
        minPrice,
        maxAllowedPrice,
        quantity: numericQuantity,
        recentOrders: Number(selectedCandidate.recentOrders || 0),
      });

      const recommendedWholesalerId =
        recommended?.wholesalerId || selectedProduct.ownerId;
      const recommendedProductId =
        recommended?.productId || selectedProduct._id;

      const userAcceptedRecommendation =
        cleanSelectionMode === "manual"
          ? String(selectedProduct._id) === String(recommendedProductId) &&
            String(selectedProduct.ownerId) === String(recommendedWholesalerId)
          : null;

      const createdOrder = new Order({
        retailerId,
        wholesalerId: selectedProduct.ownerId,
        productId: selectedProduct._id,
        productName: selectedProduct.name,
        category: selectedProduct.category || "",
        businessType: selectedProduct.businessType || "",
        quantity: numericQuantity,
        unit: selectedUnit,
        selectionMode: cleanSelectionMode,
        selectionMetadata: {
          recommendationShown: cleanSelectionMode === "manual",
          recommendedWholesalerId,
          recommendedProductId,
          recommendedScore:
            recommended?.smartScore ??
            Number(selectedCandidate.finalScore.toFixed(4)),
          recommendationReasons: recommended?.reasons || selectedReasons,
          userAcceptedRecommendation,
          selectedScore: Number(selectedCandidate.finalScore.toFixed(4)),
          selectedReasons,
          strategy: selectionStrategy,
        },
        pricePerUnit: selectedPrice,
        totalAmount,
        invoiceNumber: null,
        billSentToRetailer: false,
        billSentAt: null,
        advancePercentage: 0,
        advanceAmount: 0,
        remainingAmount: totalAmount,
        advanceRequested: false,
        finalPaymentRequested: false,
        advancePaid: false,
        fullPaymentDone: false,
        paymentHistory: [],
        lastPaymentTransactionId: null,
        lastPaymentMethod: null,
        lastPaymentType: null,
        lastPaymentAmount: 0,
        lastPaymentAt: null,
        paymentStatus: "unpaid",
        orderStatus: "pending",
      });

      await createdOrder.save({ session });

      await Ledger.insertMany(
        [
          {
            userId: retailerId,
            partyId: selectedProduct.ownerId,
            orderId: createdOrder._id,
            type: "debit",
            amount: totalAmount,
            note: `Order placed for ${selectedProduct.name}`,
            source: "Order",
          },
          {
            userId: selectedProduct.ownerId,
            partyId: retailerId,
            orderId: createdOrder._id,
            type: "credit",
            amount: totalAmount,
            note: `New order received for ${selectedProduct.name}`,
            source: "Order",
          },
        ],
        { session, ordered: true },
      );

      const selectedWholesaler = getWholesalerDetails(
        wholesalerUsers,
        selectedProduct.ownerId,
      );

      transactionResult = {
        createdOrder,
        selectedWholesaler: {
          _id: selectedProduct.ownerId,
          name: selectedWholesaler?.name || "",
          shopName: selectedWholesaler?.shopName || "",
        },
        selection: {
          mode: cleanSelectionMode,
          strategy: selectionStrategy,
          recommendationShown: cleanSelectionMode === "manual",
          userAcceptedRecommendation,
          recommendedWholesalerId,
          recommendedProductId,
          selectedWholesalerId: selectedProduct.ownerId,
          selectedProductId: selectedProduct._id,
          eligibleWholesalers: products.length,
          priceProtectedWholesalers: autoSelection.scoredCandidates.length,
          cheapestPrice: Number(minPrice.toFixed(2)),
          maximumAllowedPrice: maxAllowedPrice,
          selectedPrice,
          rating: selectedCandidate.rating,
          reviews: selectedCandidate.reviews,
          stockBeforeOrder: selectedCandidate.stock,
          stockAfterOrder: Number(updatedProduct.stockQty),
          lifetimeOrdersBeforeSelection: selectedCandidate.lifetimeOrders,
          recentOrdersBeforeSelection: selectedCandidate.recentOrders,
          priceScore: Number(selectedCandidate.priceScore.toFixed(4)),
          ratingScore: Number(selectedCandidate.ratingScore.toFixed(4)),
          stockScore: Number(selectedCandidate.stockScore.toFixed(4)),
          reviewScore: Number(selectedCandidate.reviewScore.toFixed(4)),
          qualityScore: Number(selectedCandidate.qualityScore.toFixed(4)),
          fairnessScore: Number(selectedCandidate.fairnessScore.toFixed(4)),
          finalScore: Number(selectedCandidate.finalScore.toFixed(4)),
          selectedReasons,
          recommendedReasons: recommended?.reasons || selectedReasons,
        },
      };
    });

    if (!transactionResult || !transactionResult.createdOrder) {
      return res.status(500).json({
        success: false,
        message: "Order transaction completed without a valid result",
      });
    }

    const newOrder = transactionResult.createdOrder;

    await safeNotify({
      recipientId: newOrder.wholesalerId,
      actorId: newOrder.retailerId,
      orderId: newOrder._id,
      type: "new_order",
      title: "New Order Received",
      message: `New order for ${newOrder.productName} • ${newOrder.quantity} ${
        newOrder.unit || "units"
      } • ${formatNotificationMoney(newOrder.totalAmount)}`,
      link: `/order/${newOrder._id}`,
      dedupeKey: `order:${newOrder._id}:new-order`,
      meta: {
        productName: newOrder.productName,
        quantity: newOrder.quantity,
        unit: newOrder.unit || "units",
        totalAmount: Number(newOrder.totalAmount || 0),
        selectionMode: newOrder.selectionMode,
      },
    });

    return res.status(201).json({
      success: true,
      message:
        transactionResult.selection.mode === "manual"
          ? "Order placed with your selected wholesaler successfully"
          : transactionResult.selection.strategy ===
              "new_wholesaler_opportunity"
            ? "A competitive new wholesaler was selected fairly"
            : "Best balanced wholesaler selected successfully",
      selectedWholesaler: transactionResult.selectedWholesaler,
      selection: transactionResult.selection,
      order: transactionResult.createdOrder,
    });
  } catch (error) {
    console.error("CREATE ORDER ERROR:", error);

    const statusCode = Number(error?.statusCode) || 500;
    const errorMessage = String(error?.message || "");

    if (
      errorMessage.includes("Transaction numbers are only allowed") ||
      errorMessage.toLowerCase().includes("replica set")
    ) {
      return res.status(500).json({
        success: false,
        message:
          "MongoDB transactions are unavailable. Use MongoDB Atlas or a replica-set MongoDB deployment.",
      });
    }

    return res.status(statusCode).json({
      success: false,
      message: error?.message || "Failed to create order",
    });
  } finally {
    if (session) {
      try {
        await session.endSession();
      } catch (sessionError) {
        console.error("SESSION END ERROR:", sessionError);
      }
    }
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
// RETAILER ORDERS
// =====================================================

export const getOrdersForRetailer = async (req, res) => {
  try {
    await connection();

    if (req.user.role !== "Retailer" || !isUser(req.params.id, req.userId)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const orders = await Order.find({
      retailerId: req.userId,
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
// WHOLESALER ORDERS
// =====================================================

export const getOrdersForWholesaler = async (req, res) => {
  try {
    await connection();

    if (req.user.role !== "Wholesaler" || !isUser(req.params.id, req.userId)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const orders = await Order.find({
      wholesalerId: req.userId,
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

    if (req.user.role !== "Wholesaler") {
      return res.status(403).json({
        success: false,

        message: "Only wholesalers can update order status",
      });
    }

    const allowedStatuses = ["approved", "onTheWay", "delivered", "rejected"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order status",
      });
    }

    const existingOrder = await Order.findById(req.params.id);

    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (!isUser(existingOrder.wholesalerId, req.userId)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

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

    if (status === "onTheWay") {
      updateData.orderStatus = "onTheWay";
    }

    if (status === "delivered") {
      updateData.orderStatus = "delivered";

      updateData.deliveredAt = new Date();
    }

    if (status === "rejected") {
      updateData.orderStatus = "rejected";
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,

      updateData,

      {
        new: true,
      },
    );

    // =================================================
    // STATUS NOTIFICATIONS
    // =================================================

    const statusNotifications = {
      approved: {
        type: "order_approved",

        title: "Order Approved",

        message: `Your order for ${order.productName} has been approved.`,
      },

      onTheWay: {
        type: "order_on_the_way",

        title: "Order On The Way",

        message: `Your order for ${order.productName} is on the way.`,
      },

      delivered: {
        type: "order_delivered",

        title: "Order Delivered",

        message: `Your order for ${order.productName} has been delivered.`,
      },

      rejected: {
        type: "order_rejected",

        title: "Order Rejected",

        message: `Your order for ${order.productName} was rejected.`,
      },
    };

    const statusNotification = statusNotifications[status];

    if (statusNotification) {
      await safeNotify({
        recipientId: order.retailerId,

        actorId: order.wholesalerId,

        orderId: order._id,

        ...statusNotification,

        link: `/order/${order._id}`,

        dedupeKey: `order:${order._id}:${statusNotification.type}`,

        meta: {
          requestedStatus: status,

          orderStatus: order.orderStatus,
        },
      });
    }

    return res.json({
      success: true,

      message: "Order status updated",

      order,
    });
  } catch (error) {
    console.error("STATUS UPDATE ERROR:", error);

    return res.status(500).json({
      success: false,

      message: error.message,
    });
  }
};

// =====================================================
// PAYMENT HELPERS
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

    if (req.user.role !== "Retailer") {
      return res.status(403).json({
        success: false,
        message: "Only retailers can pay for orders",
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (!isUser(order.retailerId, req.userId)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    if (!order.advanceRequested) {
      return res.status(400).json({
        success: false,

        message: "Advance payment has not been requested for this order",
      });
    }

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

    const payment = validateMockPaymentPayload(req, expectedAmount);

    if (payment.error) {
      return res.status(400).json({
        success: false,
        message: payment.error,
      });
    }

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

    order.paymentHistory.push({
      transactionId: payment.transactionId,

      paymentType: "advance",

      paymentMethod: payment.paymentMethod,

      amount: payment.amount,

      status: "success",

      isMockPayment: true,

      paidAt,
    });

    order.lastPaymentTransactionId = payment.transactionId;

    order.lastPaymentMethod = payment.paymentMethod;

    order.lastPaymentType = "advance";

    order.lastPaymentAmount = payment.amount;

    order.lastPaymentAt = paidAt;

    order.advancePaid = true;

    order.paymentStatus = "advancePaid";

    order.orderStatus = "processing";

    await order.save();

    // RETAILER LEDGER

    await Ledger.create({
      userId: order.retailerId,

      partyId: order.wholesalerId,

      orderId: order._id,

      type: "debit",

      amount: payment.amount,

      note: `Advance payment paid • ${payment.transactionId}`,
    });

    // WHOLESALER LEDGER

    await Ledger.create({
      userId: order.wholesalerId,

      partyId: order.retailerId,

      orderId: order._id,

      type: "credit",

      amount: payment.amount,

      note: `Advance payment received • ${payment.transactionId}`,
    });

    // =================================================
    // NOTIFY WHOLESALER
    // =================================================

    await safeNotify({
      recipientId: order.wholesalerId,

      actorId: order.retailerId,

      orderId: order._id,

      type: "advance_paid",

      title: "Advance Payment Received",

      message: `Advance payment of ${formatNotificationMoney(
        payment.amount,
      )} received for ${order.productName}.`,

      link: `/order/${order._id}`,

      dedupeKey: `order:${order._id}:advance-paid`,

      meta: {
        transactionId: payment.transactionId,

        paymentMethod: payment.paymentMethod,

        amount: Number(payment.amount || 0),
      },
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
// COMPLETE FINAL PAYMENT
// =====================================================

export const completePayment = async (req, res) => {
  try {
    await connection();

    if (req.user.role !== "Retailer") {
      return res.status(403).json({
        success: false,
        message: "Only retailers can pay for orders",
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (!isUser(order.retailerId, req.userId)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    if (!order.finalPaymentRequested) {
      return res.status(400).json({
        success: false,

        message: "Final payment has not been requested for this order",
      });
    }

    if (order.fullPaymentDone) {
      return res.status(400).json({
        success: false,

        message: "Final payment has already been completed",
      });
    }

    const finalPaymentAmount = Number(order.remainingAmount || 0);

    if (finalPaymentAmount <= 0) {
      return res.status(400).json({
        success: false,

        message: "No remaining payment is due for this order",
      });
    }

    const payment = validateMockPaymentPayload(req, finalPaymentAmount);

    if (payment.error) {
      return res.status(400).json({
        success: false,
        message: payment.error,
      });
    }

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

    order.paymentHistory.push({
      transactionId: payment.transactionId,

      paymentType: "final",

      paymentMethod: payment.paymentMethod,

      amount: payment.amount,

      status: "success",

      isMockPayment: true,

      paidAt,
    });

    order.lastPaymentTransactionId = payment.transactionId;

    order.lastPaymentMethod = payment.paymentMethod;

    order.lastPaymentType = "final";

    order.lastPaymentAmount = payment.amount;

    order.lastPaymentAt = paidAt;

    order.fullPaymentDone = true;

    order.paymentStatus = "paid";

    order.orderStatus = "completed";

    order.remainingAmount = 0;

    await order.save();

    // RETAILER LEDGER

    await Ledger.create({
      userId: order.retailerId,

      partyId: order.wholesalerId,

      orderId: order._id,

      type: "debit",

      amount: finalPaymentAmount,

      note: `Final payment completed • ${payment.transactionId}`,
    });

    // WHOLESALER LEDGER

    await Ledger.create({
      userId: order.wholesalerId,

      partyId: order.retailerId,

      orderId: order._id,

      type: "credit",

      amount: finalPaymentAmount,

      note: `Final payment received • ${payment.transactionId}`,
    });

    // =================================================
    // NOTIFY WHOLESALER
    // =================================================

    await safeNotify({
      recipientId: order.wholesalerId,

      actorId: order.retailerId,

      orderId: order._id,

      type: "payment_completed",

      title: "Full Payment Received",

      message: `Final payment of ${formatNotificationMoney(
        finalPaymentAmount,
      )} received for ${order.productName}.`,

      link: `/order/${order._id}`,

      dedupeKey: `order:${order._id}:payment-completed`,

      meta: {
        transactionId: payment.transactionId,

        paymentMethod: payment.paymentMethod,

        amount: Number(finalPaymentAmount || 0),
      },
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

    if (req.user.role !== "Wholesaler") {
      return res.status(403).json({
        success: false,

        message: "Only wholesalers can request advance payment",
      });
    }

    const { advancePercentage } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (!isUser(order.wholesalerId, req.userId)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const percentage = Number(advancePercentage);

    if (!Number.isFinite(percentage) || percentage <= 0 || percentage > 100) {
      return res.status(400).json({
        success: false,

        message: "Advance percentage must be between 1 and 100",
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

    // =================================================
    // NOTIFY RETAILER
    // =================================================

    await safeNotify({
      recipientId: order.retailerId,

      actorId: order.wholesalerId,

      orderId: order._id,

      type: "advance_requested",

      title: "Advance Payment Requested",

      message: `${percentage}% advance requested • ${formatNotificationMoney(
        advanceAmount,
      )} for ${order.productName}.`,

      link: `/order/${order._id}`,

      dedupeKey: `order:${order._id}:advance-requested`,

      meta: {
        advancePercentage: percentage,

        advanceAmount: Number(advanceAmount || 0),

        remainingAmount: Number(remainingAmount || 0),
      },
    });

    return res.json({
      success: true,

      message: "Advance payment requested",

      order,
    });
  } catch (error) {
    console.error("REQUEST ADVANCE ERROR:", error);

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

    if (req.user.role !== "Wholesaler") {
      return res.status(403).json({
        success: false,

        message: "Only wholesalers can request final payment",
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (!isUser(order.wholesalerId, req.userId)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
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

    // =================================================
    // NOTIFY RETAILER
    // =================================================

    await safeNotify({
      recipientId: order.retailerId,

      actorId: order.wholesalerId,

      orderId: order._id,

      type: "final_payment_requested",

      title: "Final Payment Requested",

      message: `Final payment of ${formatNotificationMoney(
        order.remainingAmount,
      )} is due for ${order.productName}.`,

      link: `/order/${order._id}`,

      dedupeKey: `order:${order._id}:final-payment-requested`,

      meta: {
        remainingAmount: Number(order.remainingAmount || 0),
      },
    });

    return res.json({
      success: true,

      message: "Final payment requested",

      order,
    });
  } catch (error) {
    console.error("REQUEST FINAL PAYMENT ERROR:", error);

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
// =====================================================

export const getBillingForRetailer = async (req, res) => {
  try {
    await connection();

    const { id } = req.params;

    if (req.user.role !== "Retailer" || !isUser(id, req.userId)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const orders = await Order.find({
      retailerId: req.userId,

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
    console.error("BILLING RETAILER ERROR:", error);

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

    if (req.user.role !== "Wholesaler" || !isUser(id, req.userId)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const wholesaler = await userModel.findById(id).select("name shopName");

    const wholesalerName = wholesaler?.shopName || wholesaler?.name || "SHOP";

    const orders = await Order.find({
      wholesalerId: req.userId,
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
    console.error("BILLING WHOLESALER ERROR:", error);

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

    if (req.user.role !== "Wholesaler") {
      return res.status(403).json({
        success: false,

        message: "Only wholesalers can send bills",
      });
    }

    const { id } = req.params;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,

        message: "Order not found",
      });
    }

    if (!isUser(order.wholesalerId, req.userId)) {
      return res.status(403).json({
        success: false,

        message: "Access denied",
      });
    }

    if (!["delivered", "completed"].includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,

        message: "Bill can only be sent after the order is delivered",
      });
    }

    if (order.billSentToRetailer) {
      return res.status(400).json({
        success: false,

        message: "Bill has already been sent to retailer",
      });
    }

    // GENERATE INVOICE

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

    order.billSentToRetailer = true;

    order.billSentAt = new Date();

    await order.save();

    // =================================================
    // NOTIFY RETAILER
    // =================================================

    await safeNotify({
      recipientId: order.retailerId,

      actorId: order.wholesalerId,

      orderId: order._id,

      type: "bill_sent",

      title: "Invoice Available",

      message: `Your invoice${
        order.invoiceNumber ? ` ${order.invoiceNumber}` : ""
      } for ${order.productName} is now available.`,

      link: "/billing",

      dedupeKey: `order:${order._id}:bill-sent`,

      meta: {
        invoiceNumber: order.invoiceNumber || "",

        totalAmount: Number(order.totalAmount || 0),
      },
    });

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

export const getOrderRecommendations = async (req, res) => {
  try {
    await connection();

    const role = String(req.user?.role || "")
      .trim()
      .toLowerCase();

    if (role !== "retailer") {
      return res.status(403).json({
        success: false,
        message: "Only retailers can view order recommendations",
      });
    }

    const { productName, quantity } = req.body || {};

    const cleanProductName = String(productName || "").trim();
    const numericQuantity = Number(quantity);

    if (
      !cleanProductName ||
      !Number.isInteger(numericQuantity) ||
      numericQuantity <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Product name and a positive whole quantity are required",
      });
    }

    const eligibleData = await loadEligibleOrderData({
      productName: cleanProductName,
      quantity: numericQuantity,
    });

    const { recommendations, recommended } = buildRecommendationPayload({
      eligibleData,
      quantity: numericQuantity,
    });

    return res.status(200).json({
      success: true,
      message: "Wholesaler options loaded",
      productName: cleanProductName,
      quantity: numericQuantity,
      totalAvailableWholesalers: recommendations.length,
      smartRecommendation: recommended || null,
      recommendations,
    });
  } catch (error) {
    console.error("GET ORDER RECOMMENDATIONS ERROR:", error);
    return res.status(Number(error?.statusCode) || 500).json({
      success: false,
      message: error?.message || "Unable to load wholesaler recommendations",
    });
  }
};

// =====================================================
// CREATE ORDER
// POST /api/orders/create
// =====================================================
