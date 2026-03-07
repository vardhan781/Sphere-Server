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

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join", (userId) => {
    socket.join(userId);
    console.log("User joined room:", userId);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

export { io };

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
