import exp from "express";
import { tokenModel } from "../models/Token.js";
import { counterModel } from "../models/Counter.js";
import { notificationModel } from "../models/Notification.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireRole } from "../middlewares/roleMiddleware.js";

export const tokenApp = exp.Router();


// =====================================================
// SETTINGS
// =====================================================

// A walk-in waiting this long gets priority over
// pre-booked tokens to prevent starvation.

const WALK_IN_PRIORITY_WAIT_SEC = 10 * 60;


// =====================================================
// QUEUE UPDATE
// =====================================================

const emitQueueUpdate = async (io, counterId) => {
  if (!io) return;

  const counter =
    await counterModel.findById(counterId);

  if (!counter) return;

  const waitingCount =
    await tokenModel.countDocuments({
      counterId,
      status: "waiting",
    });

  io.emit("queue:update", {
    counterId:
      counterId.toString(),

    currentTokenNo:
      counter.currentTokenNo,

    waitingCount,

    avgServiceTimeSec:
      counter.avgServiceTimeSec,
  });
};


// =====================================================
// ACTIVATE DUE PRE-BOOKED TOKENS
// =====================================================

const activateDueBookings = async (
  io,
  counterId
) => {

  const now = new Date();

  const dueBookings =
    await tokenModel.find({
      counterId,
      status: "booked",
      isPreBooked: true,
      bookedForTime: {
        $lte: now,
      },
    });


  if (dueBookings.length === 0) {
    return;
  }


  await tokenModel.updateMany(
    {
      counterId,
      status: "booked",
      isPreBooked: true,
      bookedForTime: {
        $lte: now,
      },
    },
    {
      $set: {
        status: "waiting",
      },
    }
  );


  // -----------------------------------------------
  // NOTIFICATIONS
  // -----------------------------------------------

  for (const token of dueBookings) {

    await notificationModel.create({
      userId:
        token.userId,

      tokenId:
        token._id,

      channel:
        "push",

      message:
        `Your pre-booked token #${token.tokenNo} is now active. Please proceed to the counter.`,
    });

  }


  // -----------------------------------------------
  // SOCKET EVENT
  // -----------------------------------------------

  if (io) {

    for (const token of dueBookings) {

      io.emit(
        "booking:activated",
        {
          tokenId:
            token._id.toString(),

          userId:
            token.userId.toString(),

          counterId:
            token.counterId.toString(),

          tokenNo:
            token.tokenNo,
        }
      );

    }

  }


  await emitQueueUpdate(
    io,
    counterId
  );
};


// =====================================================
// GET QUEUE INFORMATION
// =====================================================

tokenApp.get(
  "/queue/:counterId",
  async (req, res) => {

    try {

      const { counterId } =
        req.params;


      const counter =
        await counterModel.findById(
          counterId
        );


      if (!counter) {

        return res.status(404).json({
          message:
            "Counter not found",
        });

      }


      // Activate bookings whose time has arrived

      await activateDueBookings(
        req.io,
        counterId
      );


      const waitingCount =
        await tokenModel.countDocuments({
          counterId,
          status: "waiting",
        });


      res.status(200).json({

        message:
          "Queue fetched",

        counterId:
          counter._id,

        currentTokenNo:
          counter.currentTokenNo,

        waitingCount,

        avgServiceTimeSec:
          counter.avgServiceTimeSec,

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


      // -----------------------------------------------
      // CHECK COUNTER ID
      // -----------------------------------------------

      if (!counterId) {

        return res.status(400).json({
          message:
            "Please select a counter",
        });

      }


      // -----------------------------------------------
      // CHECK COUNTER
      // -----------------------------------------------

      const counter =
        await counterModel.findById(
          counterId
        );


      if (!counter) {

        return res.status(404).json({
          message:
            "Counter not found",
        });

      }


      // -----------------------------------------------
      // CHECK ACTIVE TOKEN
      // -----------------------------------------------

      const existingToken =
        await tokenModel.findOne({
          userId:
            req.user.id,

          status: {
            $in: [
              "booked",
              "waiting",
              "serving",
            ],
          },
        });


      if (existingToken) {

        return res.status(400).json({
          message:
            "You already have an active token or booking",
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


        const bookingTime =
          new Date(bookedForTime);


        if (
          isNaN(
            bookingTime.getTime()
          )
        ) {

          return res.status(400).json({
            message:
              "Invalid booking date and time",
          });

        }


        if (
          bookingTime <= new Date()
        ) {

          return res.status(400).json({
            message:
              "Booking time must be in the future",
          });

        }


        // ---------------------------------------------
        // GENERATE TOKEN NUMBER
        // ---------------------------------------------

        counter.lastTokenNo += 1;

        await counter.save();


        // ---------------------------------------------
        // CREATE PRE-BOOKED TOKEN
        // ---------------------------------------------

        const newToken =
          await tokenModel.create({

            tokenNo:
              counter.lastTokenNo,

            userId:
              req.user.id,

            counterId,

            status:
              "booked",

            isPreBooked:
              true,

            bookedForTime:
              bookingTime,

          });


        // ---------------------------------------------
        // BOOKING NOTIFICATION
        // ---------------------------------------------

        await notificationModel.create({

          userId:
            req.user.id,

          tokenId:
            newToken._id,

          channel:
            "push",

          message:
            `Your token #${newToken.tokenNo} has been pre-booked for ${bookingTime.toLocaleString()}`,

        });


        // ---------------------------------------------
        // SOCKET EVENT
        // ---------------------------------------------

        if (req.io) {

          req.io.emit(
            "booking:created",
            {

              tokenId:
                newToken._id.toString(),

              userId:
                req.user.id.toString(),

              counterId:
                counterId.toString(),

              tokenNo:
                newToken.tokenNo,

              bookedForTime:
                bookingTime,

            }
          );

        }


        return res.status(201).json({

          message:
            "Token pre-booked successfully",

          payload:
            newToken,

        });

      }


      // =================================================
      // NORMAL WALK-IN TOKEN
      // =================================================

      counter.lastTokenNo += 1;

      await counter.save();


      const newToken =
        await tokenModel.create({

          tokenNo:
            counter.lastTokenNo,

          userId:
            req.user.id,

          counterId,

          status:
            "waiting",

          isPreBooked:
            false,

          bookedForTime:
            null,

        });


      // -----------------------------------------------
      // QUEUE UPDATE
      // -----------------------------------------------

      await emitQueueUpdate(
        req.io,
        counterId
      );


      res.status(201).json({

        message:
          "Token generated",

        payload:
          newToken,

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
// GET MY ACTIVE TOKEN / BOOKING
// =====================================================

tokenApp.get(
  "/my",
  authMiddleware,
  requireRole("student"),

  async (req, res) => {

    try {

      let activeToken =
        await tokenModel
          .findOne({

            userId:
              req.user.id,

            status: {
              $in: [
                "booked",
                "waiting",
                "serving",
              ],
            },

          })
          .populate("counterId");


      if (!activeToken) {

        return res.status(404).json({
          message:
            "No active token found",
        });

      }


      // =================================================
      // ACTIVATE DUE BOOKING
      // =================================================

      if (
        activeToken.status ===
          "booked" &&

        activeToken.isPreBooked &&

        activeToken.bookedForTime <=
          new Date()
      ) {

        activeToken.status =
          "waiting";

        await activeToken.save();

      }


      const counter =
        activeToken.counterId;


      let position = 0;


      // =================================================
      // WAITING POSITION
      // =================================================

      if (
        activeToken.status ===
        "waiting"
      ) {

        const now =
          new Date();


        // =================================================
        // PRE-BOOKED TOKEN POSITION
        // =================================================

        if (
          activeToken.isPreBooked
        ) {

          // Count earlier eligible
          // pre-booked tokens.

          const earlierPreBooked =
            await tokenModel.countDocuments({

              counterId:
                counter._id,

              status:
                "waiting",

              isPreBooked:
                true,

              bookedForTime: {
                $lt:
                  activeToken.bookedForTime,
              },

            });


          // Count walk-ins that have already
          // waited long enough to receive
          // priority.

          const priorityWalkIns =
            await tokenModel.countDocuments({

              counterId:
                counter._id,

              status:
                "waiting",

              isPreBooked:
                false,

              createdAt: {
                $lte:
                  new Date(
                    now.getTime() -
                    WALK_IN_PRIORITY_WAIT_SEC *
                    1000
                  ),
              },

            });


          position =
            earlierPreBooked +
            priorityWalkIns;

        }


        // =================================================
        // WALK-IN TOKEN POSITION
        // =================================================

        else {

          // ---------------------------------------------
          // WALK-INS WAITING LONGER THAN THIS TOKEN
          // ---------------------------------------------

          const earlierWalkIns =
            await tokenModel.countDocuments({

              counterId:
                counter._id,

              status:
                "waiting",

              isPreBooked:
                false,

              createdAt: {
                $lt:
                  activeToken.createdAt,
              },

            });


          // ---------------------------------------------
          // PRE-BOOKED TOKENS THAT ARE CURRENTLY
          // ELIGIBLE FOR PRIORITY
          // ---------------------------------------------

          const eligiblePreBooked =
            await tokenModel.countDocuments({

              counterId:
                counter._id,

              status:
                "waiting",

              isPreBooked:
                true,

              bookedForTime: {
                $lte:
                  now,
              },

            });


          // ---------------------------------------------
          // ONLY COUNT PRE-BOOKED TOKENS THAT
          // WOULD ACTUALLY BE SERVED BEFORE THIS
          // WALK-IN.
          //
          // If this walk-in has already waited
          // 10 minutes, it receives priority.
          // ---------------------------------------------

          const waitingTimeSec =
            Math.floor(
              (
                now -
                activeToken.createdAt
              ) / 1000
            );


          if (
            waitingTimeSec <
            WALK_IN_PRIORITY_WAIT_SEC
          ) {

            position =
              earlierWalkIns +
              eligiblePreBooked;

          } else {

            position =
              earlierWalkIns;

          }

        }

      }


      // =================================================
      // ESTIMATED WAIT TIME
      // =================================================

      let estimatedWaitSec = 0;


      if (
        activeToken.status ===
        "waiting"
      ) {

        estimatedWaitSec =
          position *
          counter.avgServiceTimeSec;

      }


      // =================================================
      // RESPONSE
      // =================================================

      res.status(200).json({

        message:
          "Active token fetched",

        payload: {

          ...activeToken.toObject(),

          position,

          estimatedWaitSec,

        },

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
// GET SERVING TOKEN
// =====================================================

tokenApp.get(
  "/serving/:counterId",
  authMiddleware,
  requireRole("staff"),

  async (req, res) => {

    try {

      const { counterId } =
        req.params;


      const servingToken =
        await tokenModel.findOne({

          counterId,

          status:
            "serving",

        });


      if (!servingToken) {

        return res.status(404).json({
          message:
            "No serving token",
        });

      }


      res.status(200).json({

        message:
          "Serving token fetched",

        payload:
          servingToken,

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
// CALL NEXT TOKEN
// =====================================================

tokenApp.patch(
  "/call-next",
  authMiddleware,
  requireRole("staff"),

  async (req, res) => {

    try {

      const { counterId } =
        req.body;


      if (!counterId) {

        return res.status(400).json({
          message:
            "Please select a counter",
        });

      }


      // -----------------------------------------------
      // CHECK COUNTER
      // -----------------------------------------------

      const counter =
        await counterModel.findById(
          counterId
        );


      if (!counter) {

        return res.status(404).json({
          message:
            "Counter not found",
        });

      }


      // -----------------------------------------------
      // CHECK CURRENT SERVING TOKEN
      // -----------------------------------------------

      const alreadyServing =
        await tokenModel.findOne({

          counterId,

          status:
            "serving",

        });


      if (alreadyServing) {

        return res.status(400).json({
          message:
            "Complete the current token first",
        });

      }


      // -----------------------------------------------
      // ACTIVATE DUE BOOKINGS
      // -----------------------------------------------

      await activateDueBookings(
        req.io,
        counterId
      );


      const now =
        new Date();


      const priorityWalkInCutoff =
        new Date(
          now.getTime() -
          WALK_IN_PRIORITY_WAIT_SEC *
          1000
        );


      // =================================================
      // PRIORITY 1
      // LONG-WAITING WALK-IN
      // =================================================

      const longWaitingWalkIn =
        await tokenModel
          .findOne({

            counterId,

            status:
              "waiting",

            isPreBooked:
              false,

            createdAt: {
              $lte:
                priorityWalkInCutoff,
            },

          })
          .sort({
            createdAt: 1,
          });


      let nextToken =
        longWaitingWalkIn;


      // =================================================
      // PRIORITY 2
      // ELIGIBLE PRE-BOOKED TOKEN
      // =================================================

      if (!nextToken) {

        nextToken =
          await tokenModel
            .findOne({

              counterId,

              status:
                "waiting",

              isPreBooked:
                true,

              bookedForTime: {
                $lte:
                  now,
              },

            })
            .sort({
              bookedForTime: 1,
            });

      }


      // =================================================
      // PRIORITY 3
      // NORMAL WALK-IN
      // =================================================

      if (!nextToken) {

        nextToken =
          await tokenModel
            .findOne({

              counterId,

              status:
                "waiting",

              isPreBooked:
                false,

            })
            .sort({
              createdAt: 1,
            });

      }


      // -----------------------------------------------
      // NO TOKENS
      // -----------------------------------------------

      if (!nextToken) {

        return res.status(404).json({
          message:
            "No waiting tokens",
        });

      }


      // -----------------------------------------------
      // START SERVING
      // -----------------------------------------------

      nextToken.status =
        "serving";

      nextToken.calledAt =
        new Date();

      await nextToken.save();


      // -----------------------------------------------
      // UPDATE COUNTER
      // -----------------------------------------------

      counter.currentTokenNo =
        nextToken.tokenNo;

      await counter.save();


      // -----------------------------------------------
      // NOTIFICATION
      // -----------------------------------------------

      await notificationModel.create({

        userId:
          nextToken.userId,

        tokenId:
          nextToken._id,

        channel:
          "push",

        message:
          `Your token #${nextToken.tokenNo} is now being served`,

      });


      // -----------------------------------------------
      // QUEUE UPDATE
      // -----------------------------------------------

      await emitQueueUpdate(
        req.io,
        counterId
      );


      // -----------------------------------------------
      // SOCKET EVENT
      // -----------------------------------------------

      if (req.io) {

        req.io.emit(
          "token:called",
          {

            tokenId:
              nextToken._id.toString(),

            userId:
              nextToken.userId.toString(),

            tokenNo:
              nextToken.tokenNo,

            counterId:
              counterId.toString(),

          }
        );

      }


      res.status(200).json({

        message:
          "Next token called",

        payload:
          nextToken,

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
// COMPLETE TOKEN
// =====================================================

tokenApp.patch(
  "/:id/complete",
  authMiddleware,
  requireRole("staff"),

  async (req, res) => {

    try {

      const { id } =
        req.params;


      // -----------------------------------------------
      // FIND SERVING TOKEN
      // -----------------------------------------------

      const tokenDoc =
        await tokenModel.findOne({

          _id:
            id,

          status:
            "serving",

        });


      if (!tokenDoc) {

        return res.status(404).json({
          message:
            "Serving token not found",
        });

      }


      // -----------------------------------------------
      // COMPLETION TIME
      // -----------------------------------------------

      const completedAt =
        new Date();


      // -----------------------------------------------
      // SERVICE TIME
      // -----------------------------------------------

      const serviceTimeSec =
        Math.max(

          1,

          Math.round(

            (
              completedAt -
              tokenDoc.calledAt
            ) / 1000

          )

        );


      // -----------------------------------------------
      // UPDATE TOKEN
      // -----------------------------------------------

      tokenDoc.status =
        "completed";

      tokenDoc.completedAt =
        completedAt;

      tokenDoc.serviceTimeSec =
        serviceTimeSec;


      await tokenDoc.save();


      // -----------------------------------------------
      // UPDATE COUNTER
      // -----------------------------------------------

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


      // -----------------------------------------------
      // QUEUE UPDATE
      // -----------------------------------------------

      await emitQueueUpdate(

        req.io,

        tokenDoc.counterId.toString()

      );


      // -----------------------------------------------
      // STUDENT TOKEN COMPLETED
      // -----------------------------------------------

      if (req.io) {

        req.io.emit(
          "token:completed",
          {

            tokenId:
              tokenDoc._id.toString(),

            userId:
              tokenDoc.userId.toString(),

            counterId:
              tokenDoc.counterId.toString(),

          }
        );

      }


      res.status(200).json({

        message:
          "Token completed",

        payload:
          tokenDoc,

      });

    } catch (err) {

      res.status(500).json({
        message:
          err.message,
      });

    }

  }
);


export default tokenApp;