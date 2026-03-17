import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import authRouter from "./routes/authRoutes.js";
import userRouter from "./routes/userRoutes.js";
import postRouter from "./routes/postRoutes.js";
import chatRouter from "./routes/chatRoutes.js";
import { Server } from "socket.io";
import http from "http";
import notificationRouter from "./routes/notificationRoutes.js";

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/test", (req, res) => {
  res.json({ message: "Sphere API is running 🚀" });
});

app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/post", postRouter);
app.use("/api/chat", chatRouter);
app.use("/api/notifications", notificationRouter);

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

const onlineUsers = new Map();

io.on("connection", (socket) => {
  socket.on("join", (userId) => {
    socket.join(userId);
    onlineUsers.set(userId, socket.id);

    socket.broadcast.emit("user online", { userId });
  });

  socket.on("join chat", (conversationId) => {
    socket.join(conversationId);
  });

  socket.on("typing", (conversationId) => {
    socket.to(conversationId).emit("user typing", {
      conversationId,
      isTyping: true,
    });
  });

  socket.on("stop typing", (conversationId) => {
    socket.to(conversationId).emit("user typing", {
      conversationId,
      isTyping: false,
    });
  });

  socket.on("check online", (userId) => {
    const isOnline = onlineUsers.has(userId);

    socket.emit("user online", {
      userId,
      isOnline,
    });
  });

  socket.on("disconnect", () => {
    for (let [userId, sockId] of onlineUsers.entries()) {
      if (sockId === socket.id) {
        onlineUsers.delete(userId);

        socket.broadcast.emit("user offline", { userId });
        break;
      }
    }
  });
});

export { io };

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
