import { useState, useEffect } from "react";
import axios from "axios";
import "../styles/ViewParticipantsModal.css";

const API_BASE_URL = "http://localhost:5000/api";

export default function ViewParticipantsModal({ event, token, onClose }) {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name");

  // ✅ NEW: Selection & Generation States
  const [selectedIds, setSelectedIds] = useState([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchParticipants();
  }, [event._id, token]);

  const fetchParticipants = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(
        `${API_BASE_URL}/events/${event._id}/participants`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        const allParticipants = response.data.allParticipants || [];
        setParticipants(allParticipants);
      } else {
        setError(response.data.message || "Failed to load participants");
      }
    } catch (err) {
      console.error("❌ Error fetching participants:", err);
      if (err.response?.status === 403) {
        setError("You are not authorized to view participants for this event");
      } else if (err.response?.status === 404) {
        setError("Event not found");
      } else {
        setError(err.response?.data?.message || "Failed to load participants");
      }
    } finally {
      setLoading(false);
    }
  };

  // Filter participants
  const filteredParticipants = participants.filter((p) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (p.username && p.username.toLowerCase().includes(searchLower)) ||
      (p.email && p.email.toLowerCase().includes(searchLower)) ||
      (p.fullName && p.fullName.toLowerCase().includes(searchLower)) ||
      (p.team && p.team.toLowerCase().includes(searchLower))
    );
  });

  // Sort participants
  const sortedParticipants = [...filteredParticipants].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return (a.fullName || a.username || "").localeCompare(
          b.fullName || b.username || ""
        );
      case "email":
        return (a.email || "").localeCompare(b.email || "");
      case "team":
        return (a.team || "Individual").localeCompare(b.team || "Individual");
      default:
        return 0;
    }
  });

  // ✅ NEW: Handle Select All
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      // Select all currently filtered/sorted participants
      const allIds = sortedParticipants.map((p) => p._id);
      setSelectedIds(allIds);
    } else {
      setSelectedIds([]);
    }
  };

  // ✅ NEW: Handle Single Selection
  const handleToggle = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    } else {
      setSelectedIds((prev) => [...prev, id]);
    }
  };

  // ✅ NEW: Handle Bulk Generation
  const handleGenerateCertificates = async () => {
    if (selectedIds.length === 0) return alert("Please select at least one student.");
    
    if (!window.confirm(`Generate certificates for ${selectedIds.length} students? This will create PDFs and upload them to the cloud.`)) {
      return;
    }

    setGenerating(true);
    try {
      const res = await axios.post(
        `${API_BASE_URL}/events/${event._id}/certificates/generate-bulk`,
        { attendees: selectedIds },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        const count = res.data.results ? res.data.results.length : 0;
        if (count === 0 && res.data.errors > 0) {
          alert("❌ Generation failed. Check backend console for details.");
        } else {
          alert(`✅ Successfully generated ${count} certificates!`);
          setSelectedIds([]); 
        }
      }
    } catch (err) {
      console.error("Generation error:", err);
      alert("❌ " + (err.response?.data?.message || "Failed to generate certificates"));
    } finally {
      setGenerating(false);
    }
  };

  // Export to CSV (Existing logic)
  const exportToCSV = () => {
    try {
      const headers = ["#", "Name", "Email", "Username", "Team"];
      const csvContent = [
        headers.join(","),
        ...sortedParticipants.map((p, idx) =>
          [
            `${idx + 1}`,
            `"${p.fullName || p.username || ""}"`,
            `"${p.email || ""}"`,
            `"${p.username || ""}"`,
            `"${p.team || "Individual"}"`,
          ].join(",")
        ),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `${event.title}-participants-${new Date().toISOString().split("T")[0]}.csv`
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("❌ Export error:", err);
      alert("Failed to export CSV");
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content participants-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2>👥 Event Participants</h2>
            <p className="event-title">{event.title}</p>
          </div>
          <button className="modal-close" onClick={onClose} type="button">
            ✕
          </button>
        </div>

        {error && <div className="error-message">⚠️ {error}</div>}

        {loading ? (
          <div className="loader">
            <p>Loading participants...</p>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="participants-stats">
              <div className="stat">
                <span className="label">Total Registered:</span>
                <span className="value">{participants.length}</span>
              </div>
              <div className="stat">
                <span className="label">Selected:</span>
                <span className="value" style={{ color: "#4f46e5" }}>
                  {selectedIds.length}
                </span>
              </div>
              {event.maxParticipants && (
                <div className="stat">
                  <span className="label">Occupancy:</span>
                  <span className="value">
                    {`${Math.round(
                      (participants.length / event.maxParticipants) * 100
                    )}%`}
                  </span>
                </div>
              )}
            </div>

            {/* Filters & Actions */}
            <div className="filters-section">
              <div className="search-box">
                <input
                  type="text"
                  placeholder="🔍 Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>

              <div className="filter-controls">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="sort-select"
                >
                  <option value="name">Sort: Name</option>
                  <option value="email">Sort: Email</option>
                  <option value="team">Sort: Team</option>
                </select>

                <button
                  className="btn-export"
                  onClick={exportToCSV}
                  disabled={sortedParticipants.length === 0}
                >
                  📥 CSV
                </button>

                {/* ✅ NEW: Generate Button */}
                <button
                  className="btn-export"
                  style={{ backgroundColor: "#4f46e5", color: "white", marginLeft: "5px" }}
                  onClick={handleGenerateCertificates}
                  disabled={selectedIds.length === 0 || generating}
                >
                  {generating ? "⚙️ Processing..." : "🏅 Generate Certs"}
                </button>
              </div>
            </div>

            {/* Participants Table */}
            {sortedParticipants.length > 0 ? (
              <div className="participants-table-wrapper">
                <table className="participants-table">
                  <thead>
                    <tr>
                      {/* ✅ Checkbox Column Header */}
                      <th style={{ width: "40px", textAlign: "center" }}>
                        <input
                          type="checkbox"
                          onChange={handleSelectAll}
                          checked={
                            sortedParticipants.length > 0 &&
                            selectedIds.length === sortedParticipants.length
                          }
                          style={{ cursor: "pointer", width: "16px", height: "16px" }}
                        />
                      </th>
                      <th>#</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Username</th>
                      <th>Team</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedParticipants.map((participant, index) => (
                      <tr
                        key={participant._id || index}
                        className="participant-row"
                        style={
                          selectedIds.includes(participant._id)
                            ? { backgroundColor: "#eef2ff" }
                            : {}
                        }
                      >
                        {/* ✅ Checkbox Column Row */}
                        <td style={{ textAlign: "center" }}>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(participant._id)}
                            onChange={() => handleToggle(participant._id)}
                            style={{ cursor: "pointer", width: "16px", height: "16px" }}
                          />
                        </td>
                        <td className="index">{index + 1}</td>
                        <td className="name">
                          <strong>
                            {participant.fullName || participant.username || "-"}
                          </strong>
                        </td>
                        <td className="email">
                          <a href={`mailto:${participant.email}`}>
                            {participant.email || "-"}
                          </a>
                        </td>
                        <td className="username">
                          @{participant.username || "-"}
                        </td>
                        <td className="team">
                          {participant.team || "Individual"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <p>😔 No participants found</p>
              </div>
            )}

            {/* Results Info */}
            <div className="results-info">
              {selectedIds.length > 0
                ? `${selectedIds.length} participants selected`
                : `Showing ${sortedParticipants.length} participants`}
            </div>
          </>
        )}

        <div className="modal-footer">
          <button className="btn-close" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}