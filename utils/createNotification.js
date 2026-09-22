import Notification from "../models/notificationModel.js";

export const createNotification = async ({
  recipientId,
  actorId = null,
  orderId = null,
  type,
  title,
  message,
  link = "",
  meta = {},
  dedupeKey,
}) => {
  if (!recipientId) {
    throw new Error("Notification recipient is required");
  }

  if (!type || !title || !message) {
    throw new Error("Notification type, title and message are required");
  }

  const notificationData = {
    recipientId,
    actorId,
    orderId,
    type: String(type).trim(),
    title: String(title).trim(),
    message: String(message).trim(),
    link: String(link || "").trim(),
    meta,
  };

  // Only add it when provided.
  if (dedupeKey) {
    notificationData.dedupeKey = String(dedupeKey).trim();
  }

  try {
    if (dedupeKey) {
      return await Notification.findOneAndUpdate(
        {
          recipientId,
          dedupeKey: notificationData.dedupeKey,
        },
        {
          $setOnInsert: notificationData,
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        },
      );
    }

    return await Notification.create(notificationData);
  } catch (error) {
    // Duplicate means notification already exists.
    if (error?.code === 11000) {
      return null;
    }

    throw error;
  }
};

// =====================================================
// SAFE NOTIFICATION
//
// Notification failure must NEVER break:
// order approval
// payment
// delivery
// billing
// etc.
// =====================================================

export const safeNotify = async (options) => {
  try {
    return await createNotification(options);
  } catch (error) {
    console.error("NOTIFICATION ERROR:", error?.message);

    return null;
  }
};
