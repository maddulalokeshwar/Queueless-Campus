import { useEffect, useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import api from "../api";
import { socket } from "../socket";

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
  const selected = counters.find(c => c._id === selectedCounter);

  return (
    <div className="app-shell">
      <header className="topbar"><div className="brand"><div className="brand-mark">Q</div><div><strong>QueueLess</strong><span>Campus</span></div></div><div className="topbar-right"><span className="role-chip">STAFF</span><button onClick={logout} className="ghost-btn">Sign out</button></div></header>
      <main className="dashboard">
        <section className="page-heading"><div><span className="eyebrow">STAFF CONSOLE</span><h1>Run your counter smoothly.</h1><p>Monitor the live queue and serve the next student with one click.</p></div><div className="date-chip"><span className="dot" /> Live operations</div></section>
        <section className="staff-toolbar panel"><div><label className="field-label">Active counter</label><select value={selectedCounter} onChange={e => setSelectedCounter(e.target.value)} className="select-field compact"><option value="">Select your counter</option>{counters.map(c => <option key={c._id} value={c._id}>{c.name} · {c.service}</option>)}</select></div><div className="counter-context">{selected ? <><span className="dot" /><div><b>{selected.service}</b><small>{selected.name}</small></div></> : <span>Select a counter to begin</span>}</div></section>
        {selectedCounter && <div className="staff-stats"><div className="stat-card"><span>NOW SERVING</span><strong>{current}</strong><small>Current token</small></div><div className="stat-card"><span>WAITING</span><strong>{waitingCount}</strong><small>Students in queue</small></div><div className="stat-card"><span>COUNTER</span><strong>{selected?.name?.replace(/[^0-9]/g, "") || "—"}</strong><small>{selected?.service || "Selected service"}</small></div></div>}
        <div className="staff-main">
          <section className="panel serving-panel"><div className="panel-head"><div><span className="eyebrow">SERVICE DESK</span><h2>Currently serving</h2></div>{serving && <span className="status-pill success"><span className="dot" /> Active</span>}</div>{serving ? <><div className="serving-token"><small>TOKEN NUMBER</small><strong>{serving.tokenNo}</strong>{serving.isPreBooked && <span>Pre-booked priority</span>}</div><button onClick={completeToken} disabled={loading} className="primary-btn green-btn">{loading ? "Completing..." : "Mark service complete"}<span>✓</span></button></> : <div className="empty-state"><div className="empty-icon">Q</div><h3>No student is being served</h3><p>{waitingCount ? "The next student is ready when you are." : "There are currently no students waiting."}</p><button onClick={callNext} disabled={loading || waitingCount === 0} className="primary-btn blue-btn">{loading ? "Calling..." : waitingCount ? "Call next token" : "Queue is empty"}<span>→</span></button></div>}</section>
          <aside className="panel queue-panel"><div className="panel-head"><div><span className="eyebrow">QUEUE FLOW</span><h2>Next up</h2></div><span className="live-dot">Live</span></div><div className="queue-preview"><div className="queue-current"><small>NOW</small><strong>{current || "—"}</strong></div><div className="queue-line"><span></span><span></span><span></span></div><div className="queue-next"><small>WAITING</small><strong>{waitingCount}</strong></div></div><div className="priority-note"><b>Priority-aware queue</b><p>Pre-booked appointments and long-waiting walk-ins are handled by the queue rules automatically.</p></div>{selectedCounter && !serving && waitingCount > 0 && <button onClick={callNext} disabled={loading} className="secondary-btn">Call next student <span>→</span></button>}</aside>
        </div>
      </main>
    </div>
  );
}
