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

const allowedOrigins = [
  CLIENT_ORIGIN,
  "https://queueless-campus.vercel.app",
  "https://queueless-campus-32qkpkk5u-maddulalokeshwar5-9107s-projects.vercel.app",
].filter(Boolean);

console.log("Allowed CORS origins:", allowedOrigins);

// HTTP CORS
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin
      // such as Postman or server-to-server requests
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log("Blocked CORS origin:", origin);

      return callback(new Error("Not allowed by CORS"));
    },
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
    origin: function (origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log("Blocked Socket.IO origin:", origin);

      return callback(new Error("Not allowed by CORS"));
    },
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