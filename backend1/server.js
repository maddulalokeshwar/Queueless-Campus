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

/*
|--------------------------------------------------------------------------
| CORS CONFIGURATION
|--------------------------------------------------------------------------
*/

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN;

const allowedOrigins = [
  "https://queueless-campus.vercel.app",
];

const isAllowedOrigin = (origin) => {
  // Allow requests without an Origin header
  // Example: Postman, server-to-server requests
  if (!origin) {
    return true;
  }

  // Allow main production frontend
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  /*
  |--------------------------------------------------------------------------
  | Allow Vercel preview/deployment URLs
  |--------------------------------------------------------------------------
  |
  | Vercel creates different URLs for deployments.
  |
  | Example:
  | https://queueless-campus-lvhjesbu3-maddulalokeshwar5-9107s-projects.vercel.app
  |
  */

  if (
    origin.endsWith(".vercel.app") &&
    origin.includes("queueless-campus")
  ) {
    return true;
  }

  return false;
};

const corsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      console.log("Blocked CORS origin:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },

  credentials: true,
};

/*
|--------------------------------------------------------------------------
| Express CORS
|--------------------------------------------------------------------------
*/

app.use(cors(corsOptions));

/*
|--------------------------------------------------------------------------
| Middleware
|--------------------------------------------------------------------------
*/

app.use(exp.json());
app.use(cookieParser());

/*
|--------------------------------------------------------------------------
| HTTP SERVER
|--------------------------------------------------------------------------
*/

const httpServer = createServer(app);

/*
|--------------------------------------------------------------------------
| SOCKET.IO
|--------------------------------------------------------------------------
*/

const io = new Server(httpServer, {
  cors: {
    ...corsOptions,
    methods: ["GET", "POST"],
  },
});

/*
|--------------------------------------------------------------------------
| Attach Socket.IO to requests
|--------------------------------------------------------------------------
*/

app.use((req, res, next) => {
  req.io = io;
  next();
});

/*
|--------------------------------------------------------------------------
| Socket Connections
|--------------------------------------------------------------------------
*/

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

/*
|--------------------------------------------------------------------------
| Booking Scheduler
|--------------------------------------------------------------------------
*/

startBookingScheduler(io);

/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
*/

app.use("/auth", authApp);

app.use("/counter", counterApp);

app.use("/token", tokenApp);

app.use("/notification", notificationApp);

/*
|--------------------------------------------------------------------------
| Test Route
|--------------------------------------------------------------------------
*/

app.get("/", (req, res) => {
  res.status(200).json({
    message: "Queueless Campus API is running",
  });
});

/*
|--------------------------------------------------------------------------
| Database Connection
|--------------------------------------------------------------------------
*/

connectDB();

/*
|--------------------------------------------------------------------------
| Start Server
|--------------------------------------------------------------------------
*/

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});