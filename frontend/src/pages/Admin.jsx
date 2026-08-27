import { useEffect, useState, useContext } from "react";
import api from "../api";
import { AuthContext } from "../context/AuthContext";

export default function Admin() {
  const { logout } = useContext(AuthContext);

  const [counters, setCounters] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingCounter, setEditingCounter] = useState(null);

  const [name, setName] = useState("");
  const [service, setService] = useState("");

  const fetchCounters = async () => {
    try {
      const res = await api.get("/counter");
      setCounters(res.data.payload);
    } catch (err) {
      console.error("Failed to fetch counters:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCounters();
  }, []);

  const openAddForm = () => {
    setEditingCounter(null);
    setName("");
    setService("");
    setShowForm(true);
  };

  const openEditForm = (counter) => {
    setEditingCounter(counter);
    setName(counter.name);
    setService(counter.service);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingCounter(null);
    setName("");
    setService("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingCounter) {
        await api.patch(`/counter/${editingCounter._id}`, {
          name,
          service,
        });
      } else {
        await api.post("/counter", {
          name,
          service,
        });
      }

      closeForm();
      fetchCounters();
    } catch (err) {
      console.error("Counter operation failed:", err);

      alert(
        err.response?.data?.message ||
        "Something went wrong"
      );
    }
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this counter?"
    );

    if (!confirmDelete) return;

    try {
      await api.delete(`/counter/${id}`);

      fetchCounters();
    } catch (err) {
      console.error("Failed to delete counter:", err);

      alert(
        err.response?.data?.message ||
        "Failed to delete counter"
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">

      {/* Logout */}
      <button
        onClick={logout}
        className="fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-black/30 backdrop-blur-md border border-white/20 text-white text-sm font-semibold hover:bg-red-500/30 hover:border-red-400/40 transition"
      >
        <span>↪</span>
        Logout
      </button>

      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8 pr-24">

          <div>
            <h1 className="text-3xl font-bold">
              Counter Management
            </h1>

            <p className="text-slate-400 mt-1">
              Manage counters and their services
            </p>
          </div>

          <button
            onClick={openAddForm}
            className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 transition font-semibold"
          >
            + Add Counter
          </button>

        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center text-slate-400 py-10">
            Loading counters...
          </div>
        )}

        {/* Counter List */}
        {!loading && (
          <div className="grid gap-4">

            {counters.map((counter) => (
              <div
                key={counter._id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between"
              >

                <div>
                  <h2 className="text-xl font-semibold">
                    {counter.name}
                  </h2>

                  <p className="text-slate-400 mt-1">
                    {counter.service}
                  </p>

                  <p className="text-sm text-slate-500 mt-2">
                    Current Token:{" "}
                    {counter.currentTokenNo}
                  </p>
                </div>

                <div className="flex gap-3">

                  <button
                    onClick={() =>
                      openEditForm(counter)
                    }
                    className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() =>
                      handleDelete(counter._id)
                    }
                    className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 transition"
                  >
                    Delete
                  </button>

                </div>

              </div>
            ))}

            {counters.length === 0 && (
              <div className="text-center text-slate-400 py-10">
                No counters available.
              </div>
            )}

          </div>
        )}

        {/* Add / Edit Form */}
        {showForm && (
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md">

              <h2 className="text-2xl font-bold mb-6">
                {editingCounter
                  ? "Edit Counter"
                  : "Add Counter"}
              </h2>

              <form onSubmit={handleSubmit}>

                {/* Counter Name */}
                <div className="mb-4">

                  <label className="block text-sm text-slate-400 mb-2">
                    Counter Name
                  </label>

                  <input
                    type="text"
                    value={name}
                    onChange={(e) =>
                      setName(e.target.value)
                    }
                    placeholder="Counter 4"
                    required
                    className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 outline-none focus:border-blue-500"
                  />

                </div>

                {/* Service */}
                <div className="mb-6">

                  <label className="block text-sm text-slate-400 mb-2">
                    Service
                  </label>

                  <input
                    type="text"
                    value={service}
                    onChange={(e) =>
                      setService(e.target.value)
                    }
                    placeholder="Admissions"
                    required
                    className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 outline-none focus:border-blue-500"
                  />

                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-3">

                  <button
                    type="button"
                    onClick={closeForm}
                    className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition"
                  >
                    {editingCounter
                      ? "Save Changes"
                      : "Add Counter"}
                  </button>

                </div>

              </form>

            </div>

          </div>
        )}

      </div>

    </div>
  );
}