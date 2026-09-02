import {
  useEffect,
  useState,
  useContext,
} from "react";

import api from "../api";
import { socket } from "../socket";
import { AuthContext } from "../context/AuthContext";

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

  const selected = counters.find(c => c._id === selectedCounter);
  const statusLabel = status === "booked" ? "Pre-booked" : status === "serving" ? "Your turn" : status === "near" ? "Almost there" : "In queue";

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><div className="brand-mark">Q</div><div><strong>QueueLess</strong><span>Campus</span></div></div>
        <div className="topbar-right"><span className="live-dot">Live system</span><button onClick={logout} className="ghost-btn">Sign out</button></div>
      </header>

      <main className="dashboard student-dashboard">
        <section className="page-heading">
          <div><span className="eyebrow">STUDENT PORTAL</span><h1>Skip the line. Keep your time.</h1><p>Join a campus service queue or reserve a convenient slot before you arrive.</p></div>
          <div className="date-chip"><span className="dot" /> Queue system online</div>
        </section>

        {alertMessage && <div className="notice"><span className="notice-icon">i</span><div><strong>Queue update</strong><p>{alertMessage}</p></div><button onClick={() => setAlertMessage("")}>×</button></div>}

        {!token ? (
          <div className="student-grid">
            <section className="panel action-panel">
              <div className="panel-head"><div><span className="eyebrow">GET A TOKEN</span><h2>How would you like to join?</h2></div></div>
              <div className="mode-tabs">
                <button className={mode === "now" ? "mode-tab active" : "mode-tab"} onClick={() => setMode("now")}><span className="mode-icon green">↗</span><span><b>Walk in now</b><small>Join the live queue</small></span></button>
                <button className={mode === "book" ? "mode-tab active" : "mode-tab"} onClick={() => setMode("book")}><span className="mode-icon blue">◷</span><span><b>Pre-book</b><small>Reserve a future time</small></span></button>
              </div>

              <label className="field-label">Choose a service counter</label>
              <select value={selectedCounter} onChange={e => setSelectedCounter(e.target.value)} className="select-field">
                <option value="">Select a counter</option>
                {counters.map(c => <option key={c._id} value={c._id}>{c.name} · {c.service}</option>)}
              </select>

              {selected && <div className="counter-preview"><div className="counter-avatar">{selected.name?.charAt(0) || "C"}</div><div><b>{selected.name}</b><span>{selected.service}</span></div><div className="counter-status"><span className="dot" /> Active</div></div>}

              {mode === "book" && <><label className="field-label">Preferred date and time</label><input type="datetime-local" value={bookingTime} min={new Date(Date.now()+60000).toISOString().slice(0,16)} onChange={e => setBookingTime(e.target.value)} className="select-field" /></>}

              <button onClick={mode === "now" ? joinQueue : preBookToken} disabled={loading || !selectedCounter || (mode === "book" && !bookingTime)} className={mode === "now" ? "primary-btn green-btn" : "primary-btn blue-btn"}>{loading ? "Processing..." : mode === "now" ? "Get my token" : "Reserve my token"}<span>→</span></button>
              <p className="micro-copy">You can only have one active token or booking at a time.</p>
            </section>

            <aside className="panel info-panel">
              <div className="mini-orb">Q</div><span className="eyebrow">SMART QUEUE</span><h3>Make your wait useful.</h3><p>Track your position in real time and get notified when your turn arrives.</p>
              <div className="info-list"><div><span>01</span><p><b>Choose a service</b> Select the counter you need.</p></div><div><span>02</span><p><b>Get or reserve</b> Take a live token or book ahead.</p></div><div><span>03</span><p><b>Stay informed</b> Watch your position update automatically.</p></div></div>
            </aside>
          </div>
        ) : (
          <div className="active-grid">
            <section className="panel token-panel">
              <div className="token-top"><div><span className="eyebrow">YOUR QUEUE PASS</span><h2>{counter?.name || "Campus Counter"}</h2><p>{counter?.service || "Service counter"}</p></div><span className={`status-pill ${status === "serving" ? "success" : status === "near" ? "warning" : status === "booked" ? "info" : "neutral"}`}><span className="dot" /> {statusLabel}</span></div>
              {token.isPreBooked && token.bookedForTime && <div className="booking-banner"><span>◷</span><div><small>RESERVED FOR</small><b>{new Date(token.bookedForTime).toLocaleString()}</b></div></div>}
              <div className="token-number"><small>TOKEN</small><strong>{token.tokenNo}</strong><span>Keep this number handy</span></div>
              {token.status !== "booked" && <div className="queue-metrics"><div><small>NOW SERVING</small><strong>{current}</strong></div><div><small>PEOPLE AHEAD</small><strong>{position}</strong></div><div><small>EST. WAIT</small><strong>{String(mins).padStart(2,"0")}:{String(secs).padStart(2,"0")}</strong></div></div>}
            </section>
            <aside className="panel status-panel"><span className="eyebrow">LIVE STATUS</span><div className="status-ring"><div><strong>{position}</strong><span>ahead</span></div></div><h3>{status === "serving" ? "It’s your turn" : status === "near" ? "Get ready" : status === "booked" ? "Booking confirmed" : "You’re in line"}</h3><p>{status === "serving" ? "Please proceed to your selected counter." : status === "booked" ? "Your booking will enter the live queue at the scheduled time." : `We’ll keep your queue position updated automatically.`}</p><div className="live-card"><span className="dot" /> Live updates enabled</div></aside>
          </div>
        )}
      </main>
    </div>
  );
}
