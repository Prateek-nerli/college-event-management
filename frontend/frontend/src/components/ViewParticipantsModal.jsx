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

  useEffect(() => {
    fetchParticipants();
  }, [event._id, token]);

  const fetchParticipants = async () => {
    try {
      setLoading(true);
      setError("");

      console.log("📥 Fetching participants for event:", event._id);

      const response = await axios.get(
        `${API_BASE_URL}/events/${event._id}/participants`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("✅ Response received:", response.data);

      if (response.data.success) {
        // ✅ FIX: Use allParticipants array from response
        const allParticipants = response.data.allParticipants || [];
        console.log("📋 Total participants loaded:", allParticipants.length);
        console.log("📋 Participants:", allParticipants);

        setParticipants(allParticipants);
      } else {
        setError(response.data.message || "Failed to load participants");
      }
    } catch (err) {
      console.error("❌ Error fetching participants:", err);

      // ✅ FIX: Better error handling
      if (err.response?.status === 403) {
        setError("You are not authorized to view participants for this event");
      } else if (err.response?.status === 404) {
        setError("Event not found");
      } else {
        const errorMsg =
          err.response?.data?.message ||
          err.message ||
          "Failed to load participants";
        setError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  // Filter participants based on search term
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

  // Export to CSV
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

      // Create blob and download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `${event.title}-participants-${
          new Date().toISOString().split("T")[0]
        }.csv`
      );
      link.style.visibility = "hidden";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log(
        `✅ Exported ${sortedParticipants.length} participants to CSV`
      );
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

        {/* Error Message */}
        {error && <div className="error-message">⚠️ {error}</div>}

        {/* Loading State */}
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
                <span className="label">Max Capacity:</span>
                <span className="value">
                  {event.maxParticipants || "Unlimited"}
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

            {/* Filters */}
            <div className="filters-section">
              <div className="search-box">
                <input
                  type="text"
                  placeholder="🔍 Search by name, email, username, or team..."
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
                  <option value="name">Sort by: Name</option>
                  <option value="email">Sort by: Email</option>
                  <option value="team">Sort by: Team</option>
                </select>

                <button
                  className="btn-export"
                  onClick={exportToCSV}
                  disabled={sortedParticipants.length === 0}
                >
                  📥 Export to CSV
                </button>
              </div>
            </div>

            {/* Participants Table */}
            {sortedParticipants.length > 0 ? (
              <div className="participants-table-wrapper">
                <table className="participants-table">
                  <thead>
                    <tr>
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
                      >
                        <td className="index">{index + 1}</td>
                        <td className="name">
                          <strong>
                            {participant.fullName ||
                              participant.username ||
                              "-"}
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
                <p>
                  😔 No participants found{" "}
                  {searchTerm ? "matching your search" : ""}
                </p>
              </div>
            )}

            {/* Results Info */}
            {participants.length > 0 && (
              <div className="results-info">
                Showing {sortedParticipants.length} of {participants.length}{" "}
                participants
              </div>
            )}
          </>
        )}

        {/* Close Button */}
        <div className="modal-footer">
          <button className="btn-close" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
