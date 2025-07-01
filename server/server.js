import express from "express";
import "dotenv/config";
import cors from "cors";
import http from "http";
import { connectDB } from "./lib/db.js";
import userRouter from "./routes/userRoutes.js";
import messageRouter from "./routes/messageRoutes.js";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);

// ✅ CORS settings
app.use(cors({
  origin: "*", // ⚠️ Restrict in production
  credentials: true,
}));

// ✅ Body parser
app.use(express.json({ limit: "4mb" }));

// ✅ Socket.IO setup
export const io = new Server(server, {
  pingTimeout: 60000, // ⬅️ Increased ping timeout
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

export const userSocketMap = {};

// ✅ WebSocket connection handler
io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;

  if (!userId) {
    console.log("⚠️ Missing userId in handshake, disconnecting socket");
    socket.disconnect(true);
    return;
  }

  console.log("✅ User connected:", userId);
  userSocketMap[userId] = socket.id;

  // Broadcast online users
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  socket.on("disconnect", () => {
    console.log("❌ User Disconnected:", userId);
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

// ✅ Test route
app.use("/api/status", (req, res) => res.send("✅ Server is alive"));

// ✅ Application routes
app.use("/api/auth", userRouter);
app.use("/api/messages", messageRouter);

// ✅ Start server
const PORT = process.env.PORT || 5000;

const init = async () => {
  try {
    await connectDB();
    server.listen(PORT, () =>
      console.log(`✅ Server is running on http://localhost:${PORT}`)
    );
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
};

init();
