import exp from "express";
import { config } from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { Server } from "socket.io";

import { connectDB } from "./config/db.js";
import { authApp } from "./APIs/AuthAPI.js";
import { counterApp } from "./APIs/CounterAPI.js";
import { tokenApp } from "./APIs/TokenAPI.js";
import { notificationApp } from "./APIs/NotificationAPI.js";
import { startBookingScheduler } from "./utils/bookingScheduler.js";

config();

const app = exp();

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN;

console.log("CLIENT_ORIGIN:", CLIENT_ORIGIN);

// HTTP CORS
app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
  })
);

app.use(exp.json());
app.use(cookieParser());

// HTTP server
const httpServer = createServer(app);

// Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Attach Socket.IO to requests
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Socket connections
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// Booking scheduler
startBookingScheduler(io);

// Routes
app.use("/auth", authApp);
app.use("/counter", counterApp);
app.use("/token", tokenApp);
app.use("/notification", notificationApp);

// Test route
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Queueless Campus API is running",
  });
});

// Connect DB
connectDB();

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});