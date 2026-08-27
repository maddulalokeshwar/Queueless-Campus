import { Schema, model, Types } from "mongoose";

const notificationSchema = new Schema(
  {
    userId: {
      type: Types.ObjectId,
      ref: "user",
      required: [true, "User id is required"],
    },
    tokenId: {
      type: Types.ObjectId,
      ref: "token",
      required: [true, "Token id is required"],
    },
    channel: {
      type: String,
      enum: ["sms", "push", "whatsapp"],
      default: "push",
    },
    message: {
      type: String,
      required: [true, "Message is required"],
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    versionKey: false,
    strict: "throw",
  },
);

//create notification model
export const notificationModel = model("notification", notificationSchema);
