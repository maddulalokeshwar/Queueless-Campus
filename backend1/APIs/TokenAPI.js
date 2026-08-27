import exp from "express";
import { tokenModel } from "../models/Token.js";
import { counterModel } from "../models/Counter.js";
import { notificationModel } from "../models/Notification.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireRole } from "../middlewares/roleMiddleware.js";

export const tokenApp = exp.Router();


// =====================================================
// QUEUE UPDATE
// =====================================================

const emitQueueUpdate = async (io, counterId) => {
  if (!io) return;

  const counter = await counterModel.findById(counterId);

  if (!counter) return;

  const waitingCount = await tokenModel.countDocuments({
    counterId,
    status: "waiting",
  });

  io.emit("queue:update", {
    counterId: counterId.toString(),
    currentTokenNo: counter.currentTokenNo,
    waitingCount,
    avgServiceTimeSec: counter.avgServiceTimeSec,
  });
};


// =====================================================
// GET QUEUE INFORMATION
// =====================================================

tokenApp.get("/queue/:counterId", async (req, res) => {
  try {
    const { counterId } = req.params;

    const counter = await counterModel.findById(counterId);

    if (!counter) {
      return res.status(404).json({
        message: "Counter not found",
      });
    }

    const waitingCount = await tokenModel.countDocuments({
      counterId,
      status: "waiting",
    });

    res.status(200).json({
      message: "Queue fetched",
      counterId: counter._id,
      currentTokenNo: counter.currentTokenNo,
      waitingCount,
      avgServiceTimeSec: counter.avgServiceTimeSec,
    });

  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});


// =====================================================
// CREATE TOKEN / PRE-BOOK TOKEN
// =====================================================

tokenApp.post(
  "/",
  authMiddleware,
  requireRole("student"),
  async (req, res) => {
    try {
      const {
        counterId,
        isPreBooked,
        bookedForTime,
      } = req.body;

      if (!counterId) {
        return res.status(400).json({
          message: "Please select a counter",
        });
      }


      // -----------------------------------------------
      // CHECK ACTIVE TOKEN
      // -----------------------------------------------

      const existingToken = await tokenModel.findOne({
        userId: req.user.id,
        status: {
          $in: ["booked", "waiting", "serving"],
        },
      });

      if (existingToken) {
        return res.status(400).json({
          message:
            "You already have an active token or booking",
        });
      }


      // -----------------------------------------------
      // CHECK COUNTER
      // -----------------------------------------------

      const counter = await counterModel.findById(counterId);

      if (!counter) {
        return res.status(404).json({
          message: "Counter not found",
        });
      }


      // =================================================
      // PRE-BOOKING
      // =================================================

      if (isPreBooked === true) {

        if (!bookedForTime) {
          return res.status(400).json({
            message:
              "Please select a booking date and time",
          });
        }

        const bookingTime = new Date(bookedForTime);

        if (isNaN(bookingTime.getTime())) {
          return res.status(400).json({
            message: "Invalid booking date and time",
          });
        }

        if (bookingTime <= new Date()) {
          return res.status(400).json({
            message:
              "Booking time must be in the future",
          });
        }


        // Give the booking a token number
        counter.lastTokenNo += 1;

        await counter.save();


        const newToken = await tokenModel.create({
          tokenNo: counter.lastTokenNo,
          userId: req.user.id,
          counterId,
          status: "booked",
          isPreBooked: true,
          bookedForTime: bookingTime,
        });


        await notificationModel.create({
          userId: req.user.id,
          tokenId: newToken._id,
          channel: "push",
          message:
            `Your token #${newToken.tokenNo} has been pre-booked for ${bookingTime.toLocaleString()}`,
        });


        if (req.io) {
          req.io.emit("booking:created", {
            tokenId: newToken._id.toString(),
            userId: req.user.id.toString(),
            counterId: counterId.toString(),
            tokenNo: newToken.tokenNo,
            bookedForTime: bookingTime,
          });
        }


        return res.status(201).json({
          message: "Token pre-booked successfully",
          payload: newToken,
        });
      }


      // =================================================
      // NORMAL TOKEN
      // =================================================

      counter.lastTokenNo += 1;

      await counter.save();


      const newToken = await tokenModel.create({
        tokenNo: counter.lastTokenNo,
        userId: req.user.id,
        counterId,
        status: "waiting",
        isPreBooked: false,
        bookedForTime: null,
      });


      await emitQueueUpdate(
        req.io,
        counterId
      );


      res.status(201).json({
        message: "Token generated",
        payload: newToken,
      });

    } catch (err) {
      res.status(500).json({
        message: err.message,
      });
    }
  }
);


// =====================================================
// GET MY ACTIVE TOKEN / BOOKING
// =====================================================

tokenApp.get(
  "/my",
  authMiddleware,
  requireRole("student"),
  async (req, res) => {
    try {

      const activeToken = await tokenModel
        .findOne({
          userId: req.user.id,
          status: {
            $in: ["booked", "waiting", "serving"],
          },
        })
        .populate("counterId");


      if (!activeToken) {
        return res.status(404).json({
          message: "No active token found",
        });
      }


      const counter = activeToken.counterId;

      let position = 0;


      if (activeToken.status === "waiting") {

        position = await tokenModel.countDocuments({
          counterId: counter._id,
          status: "waiting",
          tokenNo: {
            $lt: activeToken.tokenNo,
          },
        });

      }


      let estimatedWaitSec = 0;


      if (activeToken.status === "waiting") {

        estimatedWaitSec =
          position *
          counter.avgServiceTimeSec;

      }


      res.status(200).json({
        message: "Active token fetched",

        payload: {
          ...activeToken.toObject(),
          position,
          estimatedWaitSec,
        },
      });

    } catch (err) {
      res.status(500).json({
        message: err.message,
      });
    }
  }
);


// =====================================================
// GET SERVING TOKEN
// =====================================================

tokenApp.get(
  "/serving/:counterId",
  authMiddleware,
  requireRole("staff"),
  async (req, res) => {
    try {

      const { counterId } = req.params;

      const servingToken =
        await tokenModel.findOne({
          counterId,
          status: "serving",
        });


      if (!servingToken) {
        return res.status(404).json({
          message: "No serving token",
        });
      }


      res.status(200).json({
        message: "Serving token fetched",
        payload: servingToken,
      });

    } catch (err) {
      res.status(500).json({
        message: err.message,
      });
    }
  }
);


// =====================================================
// CALL NEXT TOKEN
// =====================================================

tokenApp.patch(
  "/call-next",
  authMiddleware,
  requireRole("staff"),
  async (req, res) => {
    try {

      const { counterId } = req.body;

      if (!counterId) {
        return res.status(400).json({
          message: "Please select a counter",
        });
      }


      const counter =
        await counterModel.findById(counterId);


      if (!counter) {
        return res.status(404).json({
          message: "Counter not found",
        });
      }


      const alreadyServing =
        await tokenModel.findOne({
          counterId,
          status: "serving",
        });


      if (alreadyServing) {
        return res.status(400).json({
          message:
            "Complete the current token first",
        });
      }


      const nextToken =
        await tokenModel
          .findOne({
            counterId,
            status: "waiting",
          })
          .sort({
            tokenNo: 1,
          });


      if (!nextToken) {
        return res.status(404).json({
          message: "No waiting tokens",
        });
      }


      nextToken.status = "serving";
      nextToken.calledAt = new Date();

      await nextToken.save();


      counter.currentTokenNo =
        nextToken.tokenNo;

      await counter.save();


      // -----------------------------------------------
      // NOTIFICATION
      // -----------------------------------------------

      await notificationModel.create({
        userId: nextToken.userId,
        tokenId: nextToken._id,
        channel: "push",
        message:
          `Your token #${nextToken.tokenNo} is now being served`,
      });


      await emitQueueUpdate(
        req.io,
        counterId
      );


      if (req.io) {

        req.io.emit("token:called", {
          tokenId:
            nextToken._id.toString(),

          userId:
            nextToken.userId.toString(),

          tokenNo:
            nextToken.tokenNo,

          counterId:
            counterId.toString(),
        });

      }


      res.status(200).json({
        message: "Next token called",
        payload: nextToken,
      });

    } catch (err) {
      res.status(500).json({
        message: err.message,
      });
    }
  }
);


// =====================================================
// COMPLETE TOKEN
// =====================================================

tokenApp.patch(
  "/:id/complete",
  authMiddleware,
  requireRole("staff"),
  async (req, res) => {
    try {

      const { id } = req.params;


      const tokenDoc =
        await tokenModel.findOne({
          _id: id,
          status: "serving",
        });


      if (!tokenDoc) {
        return res.status(404).json({
          message:
            "Serving token not found",
        });
      }


      const completedAt =
        new Date();


      const serviceTimeSec =
        Math.max(
          1,
          Math.round(
            (completedAt -
              tokenDoc.calledAt) /
              1000
          )
        );


      tokenDoc.status = "completed";

      tokenDoc.completedAt =
        completedAt;

      tokenDoc.serviceTimeSec =
        serviceTimeSec;


      await tokenDoc.save();


      const counter =
        await counterModel.findById(
          tokenDoc.counterId
        );


      if (counter) {

        counter.avgServiceTimeSec =
          Math.round(
            0.7 *
              counter.avgServiceTimeSec +
            0.3 *
              serviceTimeSec
          );

        await counter.save();

      }


      await emitQueueUpdate(
        req.io,
        tokenDoc.counterId.toString()
      );


      // -----------------------------------------------
      // STUDENT TOKEN COMPLETED
      // -----------------------------------------------

      if (req.io) {

        req.io.emit("token:completed", {
          tokenId:
            tokenDoc._id.toString(),

          userId:
            tokenDoc.userId.toString(),

          counterId:
            tokenDoc.counterId.toString(),
        });

      }


      res.status(200).json({
        message: "Token completed",
        payload: tokenDoc,
      });

    } catch (err) {
      res.status(500).json({
        message: err.message,
      });
    }
  }
);


export default tokenApp;