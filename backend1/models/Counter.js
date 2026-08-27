import { Schema, model } from "mongoose";

const counterSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    service: {
      type: String,
      required: true,
      trim: true,
    },

    currentTokenNo: {
      type: Number,
      default: 0,
    },

    lastTokenNo: {
      type: Number,
      default: 0,
    },

    avgServiceTimeSec: {
      type: Number,
      default: 180,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const counterModel = model("counter", counterSchema);