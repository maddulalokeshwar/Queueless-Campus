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

//middlewares
app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));
app.use(exp.json());
app.use(cookieParser());

//create one http server shared by express and socket.io
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: process.env.CLIENT_ORIGIN, credentials: true },
});
startBookingScheduler(io);

//attach io to every request so route handlers can emit
app.use((req, res, next) => {
  req.io = io;
  next();
});


//log socket connections (no rooms/auth needed for this scope)
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});
app.get("/", (req, res) => {
  res.status(200).json({
    message: "QueueLess Campus Backend is running",
  });
});
//mount routers
app.use("/auth", authApp);
app.use("/counter", counterApp);
app.use("/token", tokenApp);
app.use("/notification", notificationApp);

//connect db then start server
connectDB();
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
