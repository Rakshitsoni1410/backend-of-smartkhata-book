import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },

    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      default: null,
    },

    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "order",
      default: null,
      index: true,
    },

    type: {
      type: String,
      required: true,
      trim: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    link: {
      type: String,
      default: "",
      trim: true,
    },

    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },

    readAt: {
      type: Date,
      default: null,
    },

    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Only set when we need duplicate protection.
    dedupeKey: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

// Fast notification list.
notificationSchema.index({
  recipientId: 1,
  createdAt: -1,
});

// Fast unread lookup.
notificationSchema.index({
  recipientId: 1,
  isRead: 1,
  createdAt: -1,
});

// Prevent duplicate event notifications.
// Sparse is important because many notifications
// may not have a dedupeKey.
notificationSchema.index(
  {
    recipientId: 1,
    dedupeKey: 1,
  },
  {
    unique: true,
    sparse: true,
  },
);

const Notification =
  mongoose.models.notification ||
  mongoose.model("notification", notificationSchema);

export default Notification;
