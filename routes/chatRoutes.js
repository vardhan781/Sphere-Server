import express from "express";
import protect from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";
import {
  startConversation,
  sendMessage,
  getMessages,
  getUserConversations,
} from "../controllers/chatController.js";

const chatRouter = express.Router();

chatRouter.post("/start", protect, startConversation);
chatRouter.post("/message", protect, upload.single("image"), sendMessage);
chatRouter.get("/messages/:conversationId", protect, getMessages);
chatRouter.get("/conversations", protect, getUserConversations);

export default chatRouter;
