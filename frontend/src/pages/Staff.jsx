import { useEffect, useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import api from "../api";
import { socket } from "../socket";
import Blobs from "../components/Blobs";

export default function Staff() {
  const { logout } = useContext(AuthContext);

  const [counters, setCounters] = useState([]);
  const [selectedCounter, setSelectedCounter] = useState("");
  const [current, setCurrent] = useState(0);
  const [waitingCount, setWaitingCount] = useState(0);
  const [serving, setServing] = useState(null);
  const [loading, setLoading] = useState(false);

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

      setWaitingCount(
        data.waitingCount
      );

    } catch (err) {

      console.error(
        "Failed to load queue:",
        err
      );

    }
  };


  // =====================================================
  // LOAD CURRENT SERVING TOKEN
  // =====================================================

  const loadServingToken =
    async (counterId) => {

      if (!counterId) return;

      try {

        const { data } =
          await api.get(
            `/token/serving/${counterId}`
          );

        setServing(
          data.payload
        );

      } catch {

        setServing(null);

      }
    };


  // =====================================================
  // INITIAL COUNTERS
  // =====================================================

  useEffect(() => {
    loadCounters();
  }, []);


  // =====================================================
  // COUNTER CHANGE
  // =====================================================

  useEffect(() => {

    if (!selectedCounter) {

      setCurrent(0);
      setWaitingCount(0);
      setServing(null);

      return;
    }

    loadQueue(
      selectedCounter
    );

    loadServingToken(
      selectedCounter
    );

  }, [selectedCounter]);


  // =====================================================
  // SOCKET EVENTS
  // =====================================================

  useEffect(() => {

    const handleQueueUpdate =
      (data) => {

        if (
          data.counterId ===
          selectedCounter
        ) {

          setCurrent(
            data.currentTokenNo
          );

          setWaitingCount(
            data.waitingCount
          );

        }
      };


    const handleBookingActivated =
      (data) => {

        if (
          data.counterId ===
          selectedCounter
        ) {

          loadQueue(
            selectedCounter
          );

        }
      };


    const handleTokenCompleted =
      (data) => {

        if (
          data.counterId ===
          selectedCounter
        ) {

          loadQueue(
            selectedCounter
          );

          loadServingToken(
            selectedCounter
          );

        }
      };


    socket.on(
      "queue:update",
      handleQueueUpdate
    );

    socket.on(
      "booking:activated",
      handleBookingActivated
    );

    socket.on(
      "token:completed",
      handleTokenCompleted
    );


    return () => {

      socket.off(
        "queue:update",
        handleQueueUpdate
      );

      socket.off(
        "booking:activated",
        handleBookingActivated
      );

      socket.off(
        "token:completed",
        handleTokenCompleted
      );

    };

  }, [selectedCounter]);


  // =====================================================
  // CALL NEXT TOKEN
  // =====================================================

  const callNext = async () => {

    if (!selectedCounter) {

      alert(
        "Please select a counter first"
      );

      return;
    }

    try {

      setLoading(true);

      const { data } =
        await api.patch(
          "/token/call-next",
          {
            counterId:
              selectedCounter,
          }
        );

      setServing(
        data.payload
      );

      setCurrent(
        data.payload.tokenNo
      );

      await loadQueue(
        selectedCounter
      );

    } catch (err) {

      alert(
        err.response?.data?.message ||
        "Unable to call next token"
      );

    } finally {

      setLoading(false);

    }
  };


  // =====================================================
  // COMPLETE TOKEN
  // =====================================================

  const completeToken =
    async () => {

      if (!serving) return;

      try {

        setLoading(true);

        await api.patch(
          `/token/${serving._id}/complete`
        );

        setServing(null);

        await loadQueue(
          selectedCounter
        );

      } catch (err) {

        alert(
          err.response?.data?.message ||
          "Unable to complete token"
        );

      } finally {

        setLoading(false);

      }
    };


  // =====================================================
  // UI
  // =====================================================

  return (

    <div className="min-h-screen relative bg-gradient-to-br from-teal-900 via-cyan-900 to-blue-900 p-4">

      <Blobs
        c1="bg-teal-400"
        c2="bg-cyan-300"
        c3="bg-blue-400"
      />


      {/* Logout Button */}

      <button
        onClick={logout}
        className="absolute top-5 right-5 z-20 flex items-center gap-2 px-4 py-2 rounded-full bg-black/20 backdrop-blur-md border border-white/20 text-white text-sm font-semibold hover:bg-red-500/30 hover:border-red-400/40 transition"
      >

        <span>↪</span>

        Logout

      </button>


      <div className="min-h-screen flex items-center justify-center">

        <div className="w-full max-w-sm bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-8 text-center space-y-6">


          {/* Header */}

          <div>

            <div className="text-4xl mb-1">
              🧑‍💼
            </div>

            <h1 className="text-2xl font-black text-white">
              Staff Panel
            </h1>

          </div>


          {/* Counter Selection */}

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
              Select Your Counter
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


          {/* Queue Information */}

          {selectedCounter && (

            <div className="grid grid-cols-2 gap-3">

              <div className="bg-white/10 rounded-2xl py-5 border border-white/20">

                <p className="text-cyan-200 text-xs uppercase tracking-widest">
                  Now Serving
                </p>

                <p className="text-5xl font-black text-white">
                  {current}
                </p>

              </div>


              <div className="bg-white/10 rounded-2xl py-5 border border-white/20">

                <p className="text-cyan-200 text-xs uppercase tracking-widest">
                  Waiting
                </p>

                <p className="text-5xl font-black text-white">
                  {waitingCount}
                </p>

              </div>

            </div>

          )}


          {/* Currently Serving */}

          {serving ? (

            <div className="space-y-3">

              <div className="bg-gradient-to-r from-cyan-400/20 to-blue-400/20 border border-cyan-300/30 rounded-xl py-5 animate-pulse">

                <p className="text-sm text-cyan-200">
                  Currently Serving
                </p>

                <p className="text-5xl font-black text-white">
                  {serving.tokenNo}
                </p>

                {serving.isPreBooked && (

                  <p className="text-xs text-yellow-200 mt-2 font-semibold">
                    Pre-Booked Token
                  </p>

                )}

              </div>


              {/* Complete */}

              <button
                onClick={completeToken}
                disabled={loading}
                className="w-full bg-gradient-to-r from-green-400 to-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg disabled:opacity-50"
              >

                {loading
                  ? "Completing..."
                  : "✅ Mark Complete"}

              </button>

            </div>

          ) : (

            /* Call Next */

            <button
              onClick={callNext}
              disabled={
                loading ||
                !selectedCounter ||
                waitingCount === 0
              }
              className="w-full bg-gradient-to-r from-blue-400 to-cyan-600 text-white font-bold py-4 rounded-xl shadow-lg disabled:opacity-50"
            >

              {loading
                ? "Calling..."
                : waitingCount === 0
                  ? "No Tokens Waiting"
                  : "📢 Call Next Token"}

            </button>

          )}

        </div>

      </div>

    </div>

  );
}