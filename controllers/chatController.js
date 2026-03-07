import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import cloudinary from "../config/cloudinary.js";
import mongoose from "mongoose";
import { io } from "../server.js";

export const startConversation = async (req, res) => {
  try {
    const senderId = req.user._id;
    const { receiverId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    if (senderId.toString() === receiverId) {
      return res.status(400).json({ message: "Cannot chat with yourself" });
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] },
    }).populate("participants", "username profilePic");

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderId, receiverId],
      });

      conversation = await conversation.populate(
        "participants",
        "username profilePic",
      );
    }

    res.json(conversation);
  } catch (error) {
    res.status(500).json({ message: "Failed to start conversation" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const senderId = req.user._id;
    const { conversationId, text } = req.body;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ message: "Invalid conversation id" });
    }

    let imageUrl = null;

    if (req.file) {
      const result = await cloudinary.uploader.upload(
        `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`,
        { folder: "chat_images" },
      );

      imageUrl = result.secure_url;
    }

    const message = await Message.create({
      conversation: conversationId,
      sender: senderId,
      text: text || "",
      image: imageUrl,
    });

    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: message._id,
    });

    const populatedMessage = await message.populate(
      "sender",
      "username profilePic",
    );

    const conversation = await Conversation.findById(conversationId);

    const receiverId = conversation.participants.find(
      (id) => id.toString() !== senderId.toString(),
    );

    io.to(receiverId.toString()).emit("message received", populatedMessage);

    res.json(populatedMessage);
  } catch (error) {
    res.status(500).json({ message: "Failed to send message" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ message: "Invalid conversation id" });
    }

    const messages = await Message.find({
      conversation: conversationId,
    })
      .populate("sender", "username profilePic")
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch messages" });
  }
};

export const getUserConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    const conversations = await Conversation.find({
      participants: userId,
    })
      .populate("participants", "username profilePic")
      .populate({
        path: "lastMessage",
        populate: {
          path: "sender",
          select: "username profilePic",
        },
      })
      .sort({ updatedAt: -1 });

    res.json(conversations);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch conversations" });
  }
};
