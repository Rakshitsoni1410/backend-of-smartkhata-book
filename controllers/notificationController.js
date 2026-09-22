import Notification from "../models/notificationModel.js";
import connection from "../config/mongodb.js";

// =====================================================
// GET NOTIFICATIONS
// =====================================================

export const getNotifications = async (
  req,
  res
) => {
  try {
    await connection();

    const userId =
      req.userId;

    const requestedLimit =
      Number(
        req.query.limit || 30
      );

    const limit = Math.min(
      Math.max(
        Number.isFinite(
          requestedLimit
        )
          ? requestedLimit
          : 30,
        1
      ),
      50
    );

    const [
      notifications,
      unreadCount,
    ] = await Promise.all([
      Notification.find({
        recipientId:
          userId,
      })
        .sort({
          createdAt: -1,
        })
        .limit(limit)
        .lean(),

      Notification.countDocuments({
        recipientId:
          userId,

        isRead: false,
      }),
    ]);

    return res.status(200).json({
      success: true,
      unreadCount,
      notifications,
    });
  } catch (error) {
    console.error(
      "GET NOTIFICATIONS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load notifications",
    });
  }
};

// =====================================================
// GET UNREAD COUNT
// =====================================================

export const getUnreadNotificationCount =
  async (req, res) => {
    try {
      await connection();

      const unreadCount =
        await Notification.countDocuments({
          recipientId:
            req.userId,

          isRead:
            false,
        });

      return res.status(200).json({
        success: true,
        unreadCount,
      });
    } catch (error) {
      console.error(
        "NOTIFICATION COUNT ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to load notification count",
      });
    }
  };

// =====================================================
// MARK ONE AS READ
// =====================================================

export const markNotificationRead =
  async (req, res) => {
    try {
      await connection();

      const notification =
        await Notification.findOneAndUpdate(
          {
            _id:
              req.params.id,

            recipientId:
              req.userId,
          },
          {
            $set: {
              isRead: true,
              readAt:
                new Date(),
            },
          },
          {
            new: true,
          }
        );

      if (!notification) {
        return res.status(404).json({
          success: false,
          message:
            "Notification not found",
        });
      }

      return res.status(200).json({
        success: true,
        notification,
      });
    } catch (error) {
      console.error(
        "MARK NOTIFICATION READ ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to update notification",
      });
    }
  };

// =====================================================
// MARK ALL AS READ
// =====================================================

export const markAllNotificationsRead =
  async (req, res) => {
    try {
      await connection();

      await Notification.updateMany(
        {
          recipientId:
            req.userId,

          isRead:
            false,
        },
        {
          $set: {
            isRead:
              true,

            readAt:
              new Date(),
          },
        }
      );

      return res.status(200).json({
        success: true,
        message:
          "All notifications marked as read",
      });
    } catch (error) {
      console.error(
        "MARK ALL NOTIFICATIONS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to update notifications",
      });
    }
  };

// =====================================================
// DELETE ONE
// =====================================================

export const deleteNotification =
  async (req, res) => {
    try {
      await connection();

      const notification =
        await Notification.findOneAndDelete(
          {
            _id:
              req.params.id,

            recipientId:
              req.userId,
          }
        );

      if (!notification) {
        return res.status(404).json({
          success: false,
          message:
            "Notification not found",
        });
      }

      return res.status(200).json({
        success: true,
        message:
          "Notification removed",
      });
    } catch (error) {
      console.error(
        "DELETE NOTIFICATION ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to remove notification",
      });
    }
  };

// =====================================================
// CLEAR ALL
// =====================================================

export const clearAllNotifications =
  async (req, res) => {
    try {
      await connection();

      await Notification.deleteMany({
        recipientId:
          req.userId,
      });

      return res.status(200).json({
        success: true,
        message:
          "Notifications cleared",
      });
    } catch (error) {
      console.error(
        "CLEAR NOTIFICATIONS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to clear notifications",
      });
    }
  };