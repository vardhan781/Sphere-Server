import express from "express";
import protect from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";
import {
  createPost,
  deletePost,
  updatePost,
  getUserPosts,
  getExplorePosts,
  toggleLikePost,
  addComment,
  deleteComment,
  getPostById,
  getFollowingPosts,
} from "../controllers/postController.js";

const postRouter = express.Router();

postRouter.post("/create", protect, upload.single("image"), createPost);
postRouter.put("/update/:id", protect, updatePost);
postRouter.delete("/delete/:id", protect, deletePost);
postRouter.get("/user/:userId", protect, getUserPosts);
postRouter.get("/explore", protect, getExplorePosts);
postRouter.put("/like/:id", protect, toggleLikePost);
postRouter.post("/comment/:id", protect, addComment);
postRouter.delete("/comment/:postId/:commentId", protect, deleteComment);
postRouter.get("/feed", protect, getFollowingPosts);
postRouter.get("/:id", protect, getPostById);

export default postRouter;
