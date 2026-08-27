import { Schema, model, Types } from "mongoose";

const tokenSchema = new Schema(
  {
    tokenNo: {
      type: Number,
      required: [true, "Token number is required"],
    },

    userId: {
      type: Types.ObjectId,
      ref: "user",
      required: [true, "User id is required"],
    },

    counterId: {
      type: Types.ObjectId,
      ref: "counter",
      required: [true, "Counter is required"],
    },

    status: {
      type: String,
      enum: ["booked", "waiting", "serving", "completed"],
      default: "waiting",
    },

    isPreBooked: {
      type: Boolean,
      default: false,
    },

    bookedForTime: {
      type: Date,
    },

    notifiedAt: {
      type: Date,
    },

    calledAt: {
      type: Date,
    },

    completedAt: {
      type: Date,
    },

    serviceTimeSec: {
      type: Number,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    versionKey: false,
    strict: "throw",
  }
);

export const tokenModel = model("token", tokenSchema);