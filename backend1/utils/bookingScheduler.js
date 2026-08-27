import { tokenModel } from "../models/Token.js";
import { counterModel } from "../models/Counter.js";
import { notificationModel } from "../models/Notification.js";

export const startBookingScheduler = (io) => {

  setInterval(async () => {

    try {

      const now = new Date();

      const bookings =
        await tokenModel.find({
          status: "booked",
          isPreBooked: true,
          bookedForTime: {
            $lte: now,
          },
        });


      for (const token of bookings) {

        token.status = "waiting";

        await token.save();


        await notificationModel.create({
          userId: token.userId,
          tokenId: token._id,
          channel: "push",
          message:
            `Your pre-booked token #${token.tokenNo} is now active.`,
        });


        const counter =
          await counterModel.findById(
            token.counterId
          );


        if (counter && io) {

          const waitingCount =
            await tokenModel.countDocuments({
              counterId: token.counterId,
              status: "waiting",
            });


          io.emit("queue:update", {
            counterId:
              token.counterId.toString(),

            currentTokenNo:
              counter.currentTokenNo,

            waitingCount,

            avgServiceTimeSec:
              counter.avgServiceTimeSec,
          });


          io.emit("booking:activated", {
            tokenId:
              token._id.toString(),

            userId:
              token.userId.toString(),

            counterId:
              token.counterId.toString(),

            tokenNo:
              token.tokenNo,
          });

        }

      }

    } catch (err) {

      console.error(
        "Booking scheduler error:",
        err.message
      );

    }

  }, 5000);

};