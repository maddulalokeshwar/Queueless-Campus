import { tokenModel } from "../models/Token.js";
import { counterModel } from "../models/Counter.js";
import { notificationModel } from "../models/Notification.js";


export const startBookingScheduler = (
  io
) => {

  setInterval(async () => {

    try {

      const now =
        new Date();


      const bookings =
        await tokenModel.find({
          status:
            "booked",

          isPreBooked:
            true,

          bookedForTime: {
            $lte:
              now,
          },
        });


      for (
        const token of bookings
      ) {

        /*
         * Re-check status before updating.
         *
         * This prevents duplicate activation
         * if another request activated the booking
         * between the find() and save().
         */

        const currentToken =
          await tokenModel.findOne({
            _id:
              token._id,

            status:
              "booked",
          });


        if (!currentToken) {
          continue;
        }


        currentToken.status =
          "waiting";

        await currentToken.save();


        await notificationModel.create({
          userId:
            currentToken.userId,

          tokenId:
            currentToken._id,

          channel:
            "push",

          message:
            `Your pre-booked token #${currentToken.tokenNo} is now active.`,
        });


        const counter =
          await counterModel.findById(
            currentToken.counterId
          );


        if (
          counter &&
          io
        ) {

          const waitingCount =
            await tokenModel.countDocuments({
              counterId:
                currentToken.counterId,

              status:
                "waiting",
            });


          io.emit(
            "queue:update",
            {
              counterId:
                currentToken.counterId.toString(),

              currentTokenNo:
                counter.currentTokenNo,

              waitingCount,

              avgServiceTimeSec:
                counter.avgServiceTimeSec,
            }
          );


          io.emit(
            "booking:activated",
            {
              tokenId:
                currentToken._id.toString(),

              userId:
                currentToken.userId.toString(),

              counterId:
                currentToken.counterId.toString(),

              tokenNo:
                currentToken.tokenNo,
            }
          );

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