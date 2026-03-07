import Post from "../models/Post.js";
import cloudinary from "../config/cloudinary.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";

// Create Post
export const createPost = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Image is required" });
    }

    const { caption } = req.body;

    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: "posts" },
      async (error, uploadResult) => {
        if (error) {
          return res.status(500).json({ message: error.message });
        }

        const post = await Post.create({
          user: req.user._id,
          image: uploadResult.secure_url,
          caption: caption || "",
        });

        res.status(201).json(post);
      },
    );

    uploadStream.end(req.file.buffer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete Post
export const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (post.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "Not authorized" });
    }

    await post.deleteOne();

    res.json({ message: "Post deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update Post
export const updatePost = async (req, res) => {
  try {
    const { caption } = req.body;

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (post.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "Not authorized" });
    }

    post.caption = caption || post.caption;

    const updatedPost = await post.save();

    res.json(updatedPost);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get User Posts
export const getUserPosts = async (req, res) => {
  try {
    const posts = await Post.find({ user: req.params.userId })
      .populate("user", "username profilePic")
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Post By ID
export const getPostById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate("user", "username profilePic")
      .populate("comments.user", "username profilePic");

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Explore Feed
export const getExplorePosts = async (req, res) => {
  try {
    const posts = await Post.find()
      .populate("user", "username profilePic")
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Like & Unlike Post
export const toggleLikePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const userId = req.user._id;

    const isLiked = post.likes.includes(userId);

    if (isLiked) {
      post.likes = post.likes.filter(
        (id) => id.toString() !== userId.toString(),
      );
    } else {
      post.likes.push(userId);
      if (post.user.toString() !== userId.toString()) {
        await Notification.create({
          recipient: post.user,
          sender: userId,
          type: "like",
          post: post._id,
        });
      }
    }

    await post.save();

    res.json({
      message: isLiked ? "Post unliked" : "Post liked",
      likesCount: post.likes.length,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add Comment
export const addComment = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ message: "Comment cannot be empty" });
    }

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    post.comments.push({
      user: req.user._id,
      text,
    });

    await post.save();

    res.json(post.comments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete Comment
export const deleteComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const comment = post.comments.id(commentId);

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    if (comment.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "Not authorized" });
    }

    comment.deleteOne();

    await post.save();

    res.json({ message: "Comment deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Feed (Only Following Users)
export const getFollowingPosts = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id);

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const posts = await Post.find({
      user: { $in: currentUser.following },
    })
      .populate("user", "username profilePic")
      .populate("comments.user", "username profilePic")
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
