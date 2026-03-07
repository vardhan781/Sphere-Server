import express from "express";
import protect from "../middleware/authMiddleware.js";
import {
  getAllUsersForChat,
  getCurrentUser,
  getExploreUsers,
  getFollowers,
  getFollowing,
  getUserById,
  toggleFollow,
  updateProfile,
} from "../controllers/userController.js";
import upload from "../middleware/uploadMiddleware.js";

const userRouter = express.Router();

userRouter.get("/me", protect, getCurrentUser);
userRouter.put("/update", protect, upload.single("profilePic"), updateProfile);
userRouter.put("/follow/:id", protect, toggleFollow);
userRouter.get("/explore", protect, getExploreUsers);
userRouter.get("/chat-users", protect, getAllUsersForChat);
userRouter.get("/:id/followers", protect, getFollowers);
userRouter.get("/:id/following", protect, getFollowing);
userRouter.get("/:id", protect, getUserById);

export default userRouter;
