import {
  useEffect,
  useState,
  useContext,
} from "react";

import api from "../api";
import { socket } from "../socket";
import { AuthContext } from "../context/AuthContext";
import Blobs from "../components/Blobs";

export default function Student() {

  const { logout } =
    useContext(AuthContext);

  const [token, setToken] =
    useState(null);

  const [counters, setCounters] =
    useState([]);

  const [selectedCounter, setSelectedCounter] =
    useState("");

  const [bookingTime, setBookingTime] =
    useState("");

  const [current, setCurrent] =
    useState(0);

  const [avgTime, setAvgTime] =
    useState(180);

  const [loading, setLoading] =
    useState(false);

  const [mode, setMode] =
    useState("now");

  const [alertMessage, setAlertMessage] =
    useState("");


  // =====================================================
  // LOAD COUNTERS
  // =====================================================

  const loadCounters = async () => {

    try {

      const { data } =
        await api.get("/counter");

      setCounters(data.payload);

    } catch (err) {

      console.error(
        "Failed to load counters:",
        err
      );

    }

  };


  // =====================================================
  // LOAD MY TOKEN
  // =====================================================

  const loadMyToken = async () => {

    try {

      const { data } =
        await api.get("/token/my");

      setToken(data.payload);

      const counterId =
        data.payload.counterId?._id ||
        data.payload.counterId;

      setSelectedCounter(counterId);

    } catch {

      setToken(null);

    }

  };


  // =====================================================
  // LOAD QUEUE
  // =====================================================

  const loadQueue = async (counterId) => {

    if (!counterId) return;

    try {

      const { data } =
        await api.get(
          `/token/queue/${counterId}`
        );

      setCurrent(
        data.currentTokenNo
      );

      setAvgTime(
        data.avgServiceTimeSec
      );

    } catch (err) {

      console.error(
        "Failed to load queue:",
        err
      );

    }

  };


  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {

    loadCounters();
    loadMyToken();

  }, []);


  // =====================================================
  // LOAD QUEUE WHEN COUNTER CHANGES
  // =====================================================

  useEffect(() => {

    if (selectedCounter) {
      loadQueue(selectedCounter);
    }

  }, [selectedCounter]);


  // =====================================================
  // SOCKET EVENTS
  // =====================================================

  useEffect(() => {

    const handleQueueUpdate = (data) => {

      if (
        data.counterId ===
        selectedCounter
      ) {

        setCurrent(
          data.currentTokenNo
        );

        setAvgTime(
          data.avgServiceTimeSec
        );

      }

    };


    const handleTokenCalled = (data) => {

      if (
        token?._id &&
        data.tokenId === token._id
      ) {

        setAlertMessage(
          `Your token #${data.tokenNo} is now being served. Please proceed to the counter.`
        );

      }

    };


    const handleTokenCompleted = (data) => {

      if (
        token?._id &&
        data.tokenId === token._id
      ) {

        setAlertMessage(
          "Your service has been completed."
        );

        setToken(null);
        setSelectedCounter("");
        setCurrent(0);
        setAvgTime(180);
        setBookingTime("");
        setMode("now");

      }

    };


    const handleBookingCreated = (data) => {

      if (
        token?._id &&
        data.tokenId === token._id
      ) {

        setAlertMessage(
          "Your token has been successfully pre-booked."
        );

      }

    };


    socket.on(
      "queue:update",
      handleQueueUpdate
    );

    socket.on(
      "token:called",
      handleTokenCalled
    );

    socket.on(
      "token:completed",
      handleTokenCompleted
    );

    socket.on(
      "booking:created",
      handleBookingCreated
    );


    return () => {

      socket.off(
        "queue:update",
        handleQueueUpdate
      );

      socket.off(
        "token:called",
        handleTokenCalled
      );

      socket.off(
        "token:completed",
        handleTokenCompleted
      );

      socket.off(
        "booking:created",
        handleBookingCreated
      );

    };

  }, [
    selectedCounter,
    token,
  ]);


  // =====================================================
  // GET TOKEN
  // =====================================================

  const joinQueue = async () => {

    if (!selectedCounter) {

      alert(
        "Please select a counter first"
      );

      return;

    }


    try {

      setLoading(true);
      setAlertMessage("");


      const { data } =
        await api.post(
          "/token",
          {
            counterId:
              selectedCounter,

            isPreBooked: false,

            bookedForTime: null,
          }
        );


      setToken(data.payload);

      setAlertMessage(
        `Token #${data.payload.tokenNo} generated successfully.`
      );

    } catch (err) {

      alert(
        err.response?.data?.message ||
        "Unable to generate token"
      );

    } finally {

      setLoading(false);

    }

  };


  // =====================================================
  // PRE-BOOK TOKEN
  // =====================================================

  const preBookToken = async () => {

    if (!selectedCounter) {

      alert(
        "Please select a counter first"
      );

      return;

    }


    if (!bookingTime) {

      alert(
        "Please select a date and time"
      );

      return;

    }


    try {

      setLoading(true);
      setAlertMessage("");


      const selectedDate =
        new Date(bookingTime);


      if (
        selectedDate <= new Date()
      ) {

        alert(
          "Please select a future date and time"
        );

        setLoading(false);

        return;

      }


      const { data } =
        await api.post(
          "/token",
          {
            counterId:
              selectedCounter,

            isPreBooked: true,

            bookedForTime:
              selectedDate.toISOString(),
          }
        );


      setToken(data.payload);

      setAlertMessage(
        `Token #${data.payload.tokenNo} pre-booked successfully.`
      );

    } catch (err) {

      alert(
        err.response?.data?.message ||
        "Unable to pre-book token"
      );

    } finally {

      setLoading(false);

    }

  };


  // =====================================================
  // TOKEN INFORMATION
  // =====================================================

  const position =
    token?.position ?? 0;


  const estimatedWait =
    token?.estimatedWaitSec ??
    position * avgTime;


  const mins =
    Math.floor(
      estimatedWait / 60
    );


  const secs =
    estimatedWait % 60;


  const counter =
    token?.counterId;


  const status =
    !token
      ? null
      : token.status === "booked"
        ? "booked"
        : position === 0
          ? "serving"
          : position <= 3
            ? "near"
            : "waiting";


  // =====================================================
  // MAIN UI
  // =====================================================

  return (

    <div className="min-h-screen relative bg-gradient-to-br from-fuchsia-900 via-purple-900 to-indigo-900 p-4">

      <Blobs
        c1="bg-fuchsia-400"
        c2="bg-yellow-300"
        c3="bg-purple-400"
      />


      {/* LOGOUT */}

      <button
        onClick={logout}
        className="fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-black/30 backdrop-blur-md border border-white/20 text-white text-sm font-semibold hover:bg-red-500/30 hover:border-red-400/40 transition"
      >

        <span>↪</span>

        Logout

      </button>


      <div className="min-h-screen flex items-center justify-center">

        <div className="w-full max-w-md">


          {/* TITLE */}

          <h1 className="text-4xl font-black text-center text-white mb-6">

            🎟️ QueueLess Campus

          </h1>


          {/* SMART ALERT */}

          {alertMessage && (

            <div className="mb-4 bg-yellow-400/20 border border-yellow-300/40 backdrop-blur-xl rounded-2xl p-4 text-yellow-100 text-center">

              <p className="font-bold">
                🔔 Smart Alert
              </p>

              <p className="text-sm mt-1">
                {alertMessage}
              </p>

            </div>

          )}


          {/* NO TOKEN */}

          {!token ? (

            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-6 space-y-5">


              {/* MODE SELECTOR */}

              <div className="grid grid-cols-2 gap-3">

                <button
                  onClick={() =>
                    setMode("now")
                  }
                  className={`py-3 rounded-xl font-bold transition ${
                    mode === "now"
                      ? "bg-green-500 text-white"
                      : "bg-white/10 text-purple-200"
                  }`}
                >
                  🎟️ Take Token
                </button>


                <button
                  onClick={() =>
                    setMode("book")
                  }
                  className={`py-3 rounded-xl font-bold transition ${
                    mode === "book"
                      ? "bg-blue-500 text-white"
                      : "bg-white/10 text-purple-200"
                  }`}
                >
                  📅 Pre-Book
                </button>

              </div>


              {/* COUNTER */}

              <div>

                <h2 className="text-xl font-bold text-white mb-3">

                  Select a Counter

                </h2>


                <select
                  value={selectedCounter}
                  onChange={(e) =>
                    setSelectedCounter(
                      e.target.value
                    )
                  }
                  className="w-full bg-white/20 text-white border border-white/30 rounded-xl p-3 outline-none"
                >

                  <option
                    value=""
                    className="text-black"
                  >
                    Select Counter
                  </option>


                  {counters.map(
                    (counter) => (

                      <option
                        key={counter._id}
                        value={counter._id}
                        className="text-black"
                      >

                        {counter.name} -{" "}
                        {counter.service}

                      </option>

                    )
                  )}

                </select>

              </div>


              {/* PRE-BOOK DATE/TIME */}

              {mode === "book" && (

                <div>

                  <label className="block text-sm text-purple-200 mb-2">

                    Select Date & Time

                  </label>


                  <input
                    type="datetime-local"
                    value={bookingTime}
                    min={
                      new Date(
                        Date.now() +
                        60000
                      )
                        .toISOString()
                        .slice(
                          0,
                          16
                        )
                    }
                    onChange={(e) =>
                      setBookingTime(
                        e.target.value
                      )
                    }
                    className="w-full bg-white/20 text-white border border-white/30 rounded-xl p-3 outline-none"
                  />

                </div>

              )}


              {/* ACTION */}

              {mode === "now" ? (

                <button
                  onClick={joinQueue}
                  disabled={
                    loading ||
                    !selectedCounter
                  }
                  className="w-full bg-gradient-to-r from-green-400 to-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg disabled:opacity-50"
                >

                  {loading
                    ? "Getting Token..."
                    : "🎟️ Get Token Now"}

                </button>

              ) : (

                <button
                  onClick={preBookToken}
                  disabled={
                    loading ||
                    !selectedCounter ||
                    !bookingTime
                  }
                  className="w-full bg-gradient-to-r from-blue-400 to-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg disabled:opacity-50"
                >

                  {loading
                    ? "Booking..."
                    : "📅 Pre-Book Token"}

                </button>

              )}

            </div>

          ) : (

            /* =================================================
               ACTIVE TOKEN
               ================================================= */

            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-8 text-center space-y-5">


              {/* STATUS */}

              <div className="inline-block px-4 py-2 rounded-full bg-blue-400/20 border border-blue-400/40 text-blue-200">

                {status === "booked"
                  ? "📅 Pre-Booked"
                  : status === "serving"
                    ? "🟢 Your Turn!"
                    : status === "near"
                      ? "🟠 Almost There"
                      : "🔵 Waiting"}

              </div>


              {/* COUNTER */}

              <div>

                <p className="text-purple-200 text-sm">

                  {counter?.name}

                </p>

                <p className="text-purple-300 text-xs">

                  {counter?.service}

                </p>

              </div>


              {/* BOOKING INFORMATION */}

              {token.isPreBooked &&
                token.bookedForTime && (

                  <div className="bg-blue-500/20 border border-blue-300/30 rounded-xl p-4">

                    <p className="text-xs text-blue-200">

                      BOOKED FOR

                    </p>

                    <p className="text-white font-bold text-lg">

                      {new Date(
                        token.bookedForTime
                      ).toLocaleString()}

                    </p>

                  </div>

                )}


              {/* TOKEN */}

              <div className="relative w-48 h-48 mx-auto flex flex-col items-center justify-center rounded-full border-[14px] border-purple-400/40">

                <p className="text-6xl font-black text-white">

                  {token.tokenNo}

                </p>

                <p className="text-xs text-purple-200">

                  YOUR TOKEN

                </p>

              </div>


              {/* NORMAL QUEUE */}

              {token.status !== "booked" && (

                <>

                  <div className="flex justify-between text-purple-200">

                    <span>

                      Now Serving:{" "}

                      <b className="text-white">

                        {current}

                      </b>

                    </span>


                    <span>

                      {position} ahead

                    </span>

                  </div>


                  <div className="bg-purple-500/20 border border-white/20 rounded-xl py-4">

                    <p className="text-xs text-purple-200">

                      ESTIMATED WAIT

                    </p>


                    <p className="text-white font-black text-4xl">

                      {String(
                        mins
                      ).padStart(
                        2,
                        "0"
                      )}

                      :

                      {String(
                        secs
                      ).padStart(
                        2,
                        "0"
                      )}

                    </p>

                  </div>

                </>

              )}


              {/* SMART ALERT MESSAGE */}

              {status === "near" && (

                <div className="bg-orange-400/20 border border-orange-300/30 rounded-xl p-4">

                  🔔

                  <p className="text-orange-200 font-bold">

                    Your turn is approaching!

                  </p>

                  <p className="text-orange-100 text-sm">

                    Only {position} people are ahead of you.

                  </p>

                </div>

              )}


              {status === "serving" && (

                <div className="bg-green-400/20 border border-green-300/30 rounded-xl p-4">

                  🔔

                  <p className="text-green-200 font-bold">

                    Your turn!

                  </p>

                  <p className="text-green-100 text-sm">

                    Please proceed to the counter.

                  </p>

                </div>

              )}

            </div>

          )}

        </div>

      </div>

    </div>

  );

}