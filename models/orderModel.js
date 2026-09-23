import mongoose from "mongoose";

// =====================================================
// PAYMENT HISTORY
// =====================================================

const paymentHistorySchema =
  new mongoose.Schema(
    {
      transactionId: {
        type: String,
        required: true,
        trim: true,
      },

      paymentType: {
        type: String,

        enum: [
          "advance",
          "final",
        ],

        required: true,
      },

      paymentMethod: {
        type: String,

        enum: [
          "upi",
          "card",
          "netbanking",
        ],

        required: true,
      },

      amount: {
        type: Number,
        required: true,
        min: 0,
      },

      status: {
        type: String,

        enum: [
          "success",
          "failed",
        ],

        default: "success",
      },

      isMockPayment: {
        type: Boolean,
        default: true,
      },

      paidAt: {
        type: Date,
        default: Date.now,
      },
    },
    {
      _id: true,
    }
  );

// =====================================================
// ORDER SELECTION / RECOMMENDATION METADATA
// =====================================================

const selectionMetadataSchema =
  new mongoose.Schema(
    {
      /*
        Was the retailer shown smart recommendations
        before placing the order?
      */
      recommendationShown: {
        type: Boolean,
        default: false,
      },

      /*
        Wholesaler that the recommendation engine
        considered the strongest suggestion.
      */
      recommendedWholesalerId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: "user",

        default: null,
      },

      /*
        Product listing connected with the
        recommended wholesaler.
      */
      recommendedProductId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: "product",

        default: null,
      },

      /*
        Score from your existing smart scoring logic.

        Expected range:
        0 -> 1
      */
      recommendedScore: {
        type: Number,
        default: null,

        min: 0,
        max: 1,
      },

      /*
        Human-readable reasons shown to the retailer.

        Example:
        [
          "Lowest price",
          "Good stock availability",
          "Strong customer rating"
        ]
      */
      recommendationReasons: {
        type: [String],
        default: [],
      },

      /*
        In manual mode:

        true  = user selected the recommended wholesaler
        false = user selected another wholesaler
        null  = not applicable / auto mode
      */
      userAcceptedRecommendation: {
        type: Boolean,
        default: null,
      },

      /*
        Score of the wholesaler/product that was
        actually selected.

        In auto mode this may equal recommendedScore.

        In manual mode it lets you compare:
        recommendation vs user choice.
      */
      selectedScore: {
        type: Number,
        default: null,

        min: 0,
        max: 1,
      },

      /*
        Reasons relating to the actually selected
        wholesaler.
      */
      selectedReasons: {
        type: [String],
        default: [],
      },

      /*
        Name of the backend strategy used.

        This is useful in reports/debugging.
      */
      strategy: {
        type: String,

        enum: [
          "balanced_smart_selection",
          "new_wholesaler_opportunity",
          "manual_user_choice",
        ],

        default: "balanced_smart_selection",
      },
    },
    {
      _id: false,
    }
  );

// =====================================================
// ORDER SCHEMA
// =====================================================

const orderSchema =
  new mongoose.Schema(
    {
      // ==========================================
      // USERS
      // ==========================================

      retailerId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: "user",

        required: true,

        index: true,
      },

      wholesalerId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: "user",

        required: true,

        index: true,
      },

      // ==========================================
      // PRODUCT DETAILS
      // ==========================================

      productId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: "product",

        required: true,
      },

      productName: {
        type: String,
        required: true,
        trim: true,
      },

      category: {
        type: String,
        trim: true,
        default: "",
      },

      businessType: {
        type: String,
        trim: true,
        default: "",
      },

      quantity: {
        type: Number,
        required: true,
        min: 1,
        default: 1,

        validate: {
          validator: Number.isInteger,

          message:
            "Quantity must be a whole number",
        },
      },

      unit: {
        type: String,
        trim: true,
        default: "pcs",
      },

      // ==========================================
      // ORDER SELECTION MODE
      // ==========================================

      /*
        auto:
        SmartKhataBook chooses the wholesaler.

        manual:
        SmartKhataBook shows recommendations,
        but the retailer chooses the final wholesaler.
      */

      selectionMode: {
        type: String,

        enum: [
          "auto",
          "manual",
        ],

        default: "auto",

        index: true,
      },

      /*
        Snapshot of recommendation/selection details.

        We store this inside the order so later changes
        in product rating/stock do not change the
        historical reason for this order selection.
      */

      selectionMetadata: {
        type:
          selectionMetadataSchema,

        default: () => ({
          recommendationShown:
            false,

          recommendedWholesalerId:
            null,

          recommendedProductId:
            null,

          recommendedScore:
            null,

          recommendationReasons:
            [],

          userAcceptedRecommendation:
            null,

          selectedScore:
            null,

          selectedReasons:
            [],

          strategy:
            "balanced_smart_selection",
        }),
      },

      // ==========================================
      // PRICING
      // ==========================================

      pricePerUnit: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
      },

      totalAmount: {
        type: Number,
        min: 0,
        default: 0,
      },

      // ==========================================
      // BILLING
      // ==========================================

      invoiceNumber: {
        type: String,
        trim: true,
        default: null,
      },

      billSentToRetailer: {
        type: Boolean,
        default: false,
      },

      billSentAt: {
        type: Date,
        default: null,
      },

      // ==========================================
      // ADVANCE PAYMENT
      // ==========================================

      advancePercentage: {
        type: Number,

        min: 0,
        max: 100,

        default: 0,
      },

      advanceAmount: {
        type: Number,
        min: 0,
        default: 0,
      },

      remainingAmount: {
        type: Number,
        min: 0,
        default: 0,
      },

      advanceRequested: {
        type: Boolean,
        default: false,
      },

      finalPaymentRequested: {
        type: Boolean,
        default: false,
      },

      advancePaid: {
        type: Boolean,
        default: false,
      },

      fullPaymentDone: {
        type: Boolean,
        default: false,
      },

      // ==========================================
      // FAKE / DEMO PAYMENT RECORDS
      // ==========================================

      paymentHistory: {
        type: [
          paymentHistorySchema,
        ],

        default: [],
      },

      lastPaymentTransactionId:
        {
          type: String,
          default: null,
          trim: true,
        },

      lastPaymentMethod: {
        type: String,

        enum: [
          "upi",
          "card",
          "netbanking",
          null,
        ],

        default: null,
      },

      lastPaymentType: {
        type: String,

        enum: [
          "advance",
          "final",
          null,
        ],

        default: null,
      },

      lastPaymentAmount: {
        type: Number,
        min: 0,
        default: 0,
      },

      lastPaymentAt: {
        type: Date,
        default: null,
      },

      // ==========================================
      // DELIVERY
      // ==========================================

      deliveryDate: {
        type: Date,
        default: null,
      },

      deliveredAt: {
        type: Date,
        default: null,
      },

      // ==========================================
      // ORDER STATUS
      // ==========================================

      orderStatus: {
        type: String,

        enum: [
          "pending",
          "approved",
          "advancePending",
          "processing",
          "onTheWay",
          "delivered",
          "completed",
          "rejected",
        ],

        default: "pending",

        index: true,
      },

      // ==========================================
      // PAYMENT STATUS
      // ==========================================

      paymentStatus: {
        type: String,

        enum: [
          "unpaid",
          "advanceRequested",
          "advancePaid",
          "partial",
          "paid",
        ],

        default: "unpaid",

        index: true,
      },
    },

    {
      timestamps: true,
    }
  );

// INDEXES

orderSchema.index({
  retailerId: 1,
  createdAt: -1,
});

orderSchema.index({
  wholesalerId: 1,
  createdAt: -1,
});

orderSchema.index({
  retailerId: 1,
  wholesalerId: 1,
  createdAt: -1,
});

orderSchema.index({
  orderStatus: 1,
  createdAt: -1,
});

orderSchema.index({
  selectionMode: 1,
  createdAt: -1,
});

orderSchema.index({
  "paymentHistory.transactionId":
    1,
});

// MODEL

const Order =
  mongoose.models.order ||
  mongoose.model(
    "order",
    orderSchema
  );

export default Order;