import exp from "express";

import { counterModel } from "../models/Counter.js";

import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireRole } from "../middlewares/roleMiddleware.js";

export const counterApp =
  exp.Router();


// =====================================================
// GET ALL COUNTERS
// =====================================================

counterApp.get(
  "/",
  authMiddleware,

  async (req, res) => {
    try {
      const counters =
        await counterModel
          .find({})
          .sort({
            createdAt: 1,
          });

      res.status(200).json({
        message:
          "Counters fetched",

        payload:
          counters,
      });

    } catch (err) {
      res.status(500).json({
        message:
          err.message,
      });
    }
  }
);


// =====================================================
// CREATE COUNTER
// =====================================================

counterApp.post(
  "/",
  authMiddleware,
  requireRole("admin"),

  async (req, res) => {
    try {
      const {
        name,
        service,
      } = req.body;


      if (
        !name ||
        !service
      ) {
        return res.status(400).json({
          message:
            "Name and service are required",
        });
      }


      const counter =
        await counterModel.create({
          name:
            name.trim(),

          service:
            service.trim(),

          currentTokenNo:
            0,

          lastTokenNo:
            0,

          avgServiceTimeSec:
            180,
        });


      res.status(201).json({
        message:
          "Counter created successfully",

        payload:
          counter,
      });

    } catch (err) {
      res.status(500).json({
        message:
          err.message,
      });
    }
  }
);


// =====================================================
// UPDATE COUNTER
// =====================================================

counterApp.patch(
  "/:id",
  authMiddleware,
  requireRole("admin"),

  async (req, res) => {
    try {
      const {
        name,
        service,
        avgServiceTimeSec,
      } = req.body;


      const updateData = {};


      if (
        name !== undefined
      ) {
        updateData.name =
          name.trim();
      }


      if (
        service !== undefined
      ) {
        updateData.service =
          service.trim();
      }


      if (
        avgServiceTimeSec !==
        undefined
      ) {
        updateData.avgServiceTimeSec =
          Number(
            avgServiceTimeSec
          );
      }


      const counter =
        await counterModel.findByIdAndUpdate(
          req.params.id,

          updateData,

          {
            new: true,
            runValidators: true,
          }
        );


      if (!counter) {
        return res.status(404).json({
          message:
            "Counter not found",
        });
      }


      res.status(200).json({
        message:
          "Counter updated successfully",

        payload:
          counter,
      });

    } catch (err) {
      res.status(500).json({
        message:
          err.message,
      });
    }
  }
);


// =====================================================
// DELETE COUNTER
// =====================================================

counterApp.delete(
  "/:id",
  authMiddleware,
  requireRole("admin"),

  async (req, res) => {
    try {
      const counter =
        await counterModel.findByIdAndDelete(
          req.params.id
        );


      if (!counter) {
        return res.status(404).json({
          message:
            "Counter not found",
        });
      }


      res.status(200).json({
        message:
          "Counter deleted successfully",

        payload:
          counter,
      });

    } catch (err) {
      res.status(500).json({
        message:
          err.message,
      });
    }
  }
);