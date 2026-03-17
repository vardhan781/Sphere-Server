import User from "../models/User.js";
import Notification from "../models/Notification.js";
import cloudinary from "../config/cloudinary.js";
import mongoose from "mongoose";

// Get logged-in user
export const getCurrentUser = async (req, res) => {
  res.json(req.user);
};

// Update profile
export const updateProfile = async (req, res) => {
  try {
    const { username, bio } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Username validation
    if (username) {
      if (username.length < 3 || username.length > 20) {
        return res
          .status(400)
          .json({ message: "Username must be 3-20 characters" });
      }

      const usernameExists = await User.findOne({
        username,
        _id: { $ne: user._id },
      });

      if (usernameExists) {
        return res.status(400).json({ message: "Username already taken" });
      }

      user.username = username;
    }

    // Bio validation
    if (bio) {
      if (bio.length > 150) {
        return res
          .status(400)
          .json({ message: "Bio cannot exceed 150 characters" });
      }

      user.bio = bio;
    }

    // Profile picture upload
    if (req.file) {
      const result = cloudinary.uploader.upload_stream(
        { folder: "profile_pics" },
        async (error, uploadResult) => {
          if (error) {
            return res.status(500).json({ message: error.message });
          }

          user.profilePic = uploadResult.secure_url;

          const updatedUser = await user.save();

          return res.json({
            _id: updatedUser._id,
            username: updatedUser.username,
            email: updatedUser.email,
            bio: updatedUser.bio,
            profilePic: updatedUser.profilePic,
          });
        },
      );

      result.end(req.file.buffer);
      return;
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      username: updatedUser.username,
      email: updatedUser.email,
      bio: updatedUser.bio,
      profilePic: updatedUser.profilePic,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const toggleFollow = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const targetUserId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    if (currentUserId.toString() === targetUserId) {
      return res.status(400).json({ message: "You cannot follow yourself" });
    }

    const currentUser = await User.findById(currentUserId);
    const targetUser = await User.findById(targetUserId);

    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const isFollowing = currentUser.following.includes(targetUserId);

    if (isFollowing) {
      // Unfollow
      currentUser.following.pull(targetUserId);
      targetUser.followers.pull(currentUserId);
    } else {
      // Follow
      currentUser.following.push(targetUserId);
      targetUser.followers.push(currentUserId);

      // Create Notification
      await Notification.create({
        recipient: targetUserId,
        sender: currentUserId,
        type: "follow",
      });
    }

    await currentUser.save();
    await targetUser.save();

    res.json({
      success: true,
      following: !isFollowing,
    });
  } catch (error) {
    res.status(500).json({ message: "Follow toggle failed" });
  }
};

// Get Explore Users
export const getExploreUsers = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { search } = req.query;

    let query = {
      _id: { $ne: currentUserId },
    };

    if (search) {
      query.username = { $regex: search, $options: "i" };
    }

    const currentUser = await User.findById(currentUserId).select("following");

    const users = await User.find(query)
      .select("_id username profilePic bio")
      .limit(20)
      .lean();

    const formattedUsers = users.map((user) => ({
      ...user,
      isFollowing: currentUser.following.some(
        (id) => id.toString() === user._id.toString(),
      ),
    }));

    res.json(formattedUsers);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch users" });
  }
};

// Get user by ID (Profile View)
export const getUserById = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const targetUserId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const targetUser = await User.findById(targetUserId)
      .select("username bio profilePic followers following")
      .lean();

    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const isFollowing = targetUser.followers.some(
      (id) => id.toString() === currentUserId.toString(),
    );

    const isFollowedByMe = targetUser.following.some(
      (id) => id.toString() === currentUserId.toString(),
    );

    res.json({
      _id: targetUser._id,
      username: targetUser.username,
      bio: targetUser.bio,
      profilePic: targetUser.profilePic,
      followersCount: targetUser.followers.length,
      followingCount: targetUser.following.length,
      isFollowing,
      isFollowedByMe,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch user profile" });
  }
};

// Get users for chat
export const getAllUsersForChat = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { search, page = 1, limit = 20 } = req.query;

    let query = {
      _id: { $ne: currentUserId },
    };

    if (search) {
      query.username = { $regex: search, $options: "i" };
    }

    const users = await User.find(query)
      .select("_id username profilePic bio")
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch users" });
  }
};

export const getFollowers = async (req, res) => {
  try {
    const userId = req.params.id;
    const currentUserId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const user = await User.findById(userId)
      .populate("followers", "_id username profilePic bio")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const currentUser = await User.findById(currentUserId).select("following");

    const formattedFollowers = user.followers.map((follower) => ({
      ...follower,
      isFollowing: currentUser.following.some(
        (id) => id.toString() === follower._id.toString(),
      ),
    }));

    res.json(formattedFollowers);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch followers" });
  }
};

export const getFollowing = async (req, res) => {
  try {
    const userId = req.params.id;
    const currentUserId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const user = await User.findById(userId)
      .populate("following", "_id username profilePic bio")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const currentUser = await User.findById(currentUserId).select("following");

    const formattedFollowing = user.following.map((followedUser) => ({
      ...followedUser,
      isFollowing: currentUser.following.some(
        (id) => id.toString() === followedUser._id.toString(),
      ),
    }));

    res.json(formattedFollowing);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch following users" });
  }
};
