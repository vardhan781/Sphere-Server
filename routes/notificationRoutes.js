import express from "express";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from "../controllers/notificationController.js";
import protect from "../middleware/authMiddleware.js";

const notificationRouter = express.Router();

notificationRouter.get("/", protect, getNotifications);
notificationRouter.put("/:id/read", protect, markAsRead);
notificationRouter.put("/read-all", protect, markAllAsRead);

export default notificationRouter;
