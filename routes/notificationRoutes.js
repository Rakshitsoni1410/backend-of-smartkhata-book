import express from "express";

import authUser from "../middlewares/authUser.js";

import {
    getNotifications,
    getUnreadNotificationCount,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
} from "../controllers/notificationController.js";

const router = express.Router();

router.get(
    "/",
    authUser,
    getNotifications
);

router.get(
    "/unread-count",
    authUser,
    getUnreadNotificationCount
);

router.patch(
    "/read-all",
    authUser,
    markAllNotificationsRead
);

router.patch(
    "/:id/read",
    authUser,
    markNotificationRead
);

router.delete(
    "/:id",
    authUser,
    deleteNotification
);

export default router;