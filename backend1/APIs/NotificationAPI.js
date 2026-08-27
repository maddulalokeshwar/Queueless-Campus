import exp from "express";
import { notificationModel } from "../models/Notification.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
export const notificationApp = exp.Router();

//Get caller's notifications, newest first
notificationApp.get("/my", authMiddleware, async (req, res) => {
  try {
    //get user id from decoded token
    const userId = req.user?.id;
    //find notifications, newest first
    const notifications = await notificationModel
      .find({ userId })
      .sort({ sentAt: -1 });
    //send res
    res
      .status(200)
      .json({ message: "Notifications fetched", payload: notifications });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
