// =====================================================
// COLLEGE ADMIN EVENTS PAGE - State-Based Router Version
// =====================================================

// FILE: frontend/src/pages/CollegeAdminEventsPage.jsx

import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";
import "../styles/CollegeAdminDashboard.css";

export default function CollegeAdminEventsPage({ setCurrentPage }) {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [myEvents, setMyEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [filterCategory, setFilterCategory] = useState("All");
  const [searchTitle, setSearchTitle] = useState("");

  useEffect(() => {
    fetchEvents();
  }, []);

  // ✅ FETCH EVENTS
  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError("");

      const allEventsRes = await API.get("/college-admin/recent-events");
      if (allEventsRes.data?.events) {
        setEvents(allEventsRes.data.events);
      }

      const organizersRes = await API.get("/college-admin/organizers");
      if (organizersRes.data?.data) {
        const organizerIds = organizersRes.data.data.map((o) => o._id);
        const myEventsFiltered = allEventsRes.data?.events?.filter((event) =>
          organizerIds.includes(event.organizerId?._id || event.organizerId)
        );
        setMyEvents(myEventsFiltered || []);
      }
    } catch (err) {
      console.error("Error loading events:", err);
      setError(err.response?.data?.message || "Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  const getDisplayedEvents = () => {
    let displayed = activeTab === "all" ? events : myEvents;

    if (filterCategory !== "All") {
      displayed = displayed.filter((event) => event.category === filterCategory);
    }

    if (searchTitle.trim() !== "") {
      displayed = displayed.filter((event) =>
        event.title.toLowerCase().includes(searchTitle.toLowerCase())
      );
    }

    return displayed;
  };

  const getAllCategories = () => {
    const categories = new Set();
    events.forEach((event) => {
      if (event.category) categories.add(event.category);
    });
    return ["All", ...Array.from(categories)];
  };

  const isUpcoming = (startDate) => {
    return new Date(startDate) > new Date();
  };

  const displayedEvents = getDisplayedEvents();
  const categories = getAllCategories();

  if (!user || user.role !== "collegeAdmin") {
    return (
      <div className="college-admin-dashboard">
        <div className="error-container">
          <h1>⛔ Access Denied</h1>
          <p>You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="college-admin-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1>📅 Events Management</h1>
          <p className="welcome-text">View and manage college events</p>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="alert alert-error">
          <span>❌</span> {error}
          <button onClick={() => setError("")} className="alert-close">
            &times;
          </button>
        </div>
      )}

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading events...</p>
        </div>
      ) : (
        <div className="dashboard-content">
          {/* TAB NAVIGATION */}
          <div className="tabs-container">
            <button
              className={`tab-button ${activeTab === "all" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("all");
                setSearchTitle("");
                setFilterCategory("All");
              }}
            >
              📌 All Events ({events.length})
            </button>
            <button
              className={`tab-button ${activeTab === "my-events" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("my-events");
                setSearchTitle("");
                setFilterCategory("All");
              }}
            >
              🎯 My College Events ({myEvents.length})
            </button>
          </div>

          {/* SEARCH AND FILTER */}
          <div className="events-filters">
            <div className="search-box">
              <input
                type="text"
                placeholder="Search events by title..."
                value={searchTitle}
                onChange={(e) => setSearchTitle(e.target.value)}
                className="search-input"
              />
            </div>

            <div className="filter-category">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="filter-select"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* EVENTS LIST */}
          <div className="events-container">
            {displayedEvents.length === 0 ? (
              <div className="empty-state">
                <p className="empty-icon">📭</p>
                <p className="empty-message">
                  {activeTab === "all"
                    ? "No events available"
                    : "No events created by your organizers"}
                </p>
              </div>
            ) : (
              <div className="events-grid">
                {displayedEvents.map((event) => (
                  <div key={event._id} className="event-card">
                    {/* Event Header */}
                    <div className="event-header">
                      <h3 className="event-title">{event.title}</h3>
                      <span
                        className={`event-status ${
                          isUpcoming(event.dates?.startDate)
                            ? "status-upcoming"
                            : "status-past"
                        }`}
                      >
                        {isUpcoming(event.dates?.startDate)
                          ? "⏳ Upcoming"
                          : "✓ Past"}
                      </span>
                    </div>

                    {/* Event Details */}
                    <div className="event-details">
                      <div className="detail-item">
                        <span className="detail-label">📂 Category:</span>
                        <span className="detail-value">
                          {event.category || "-"}
                        </span>
                      </div>

                      <div className="detail-item">
                        <span className="detail-label">📅 Start Date:</span>
                        <span className="detail-value">
                          {event.dates?.startDate
                            ? new Date(
                                event.dates.startDate
                              ).toLocaleDateString()
                            : "-"}
                        </span>
                      </div>

                      <div className="detail-item">
                        <span className="detail-label">🎯 Organizer:</span>
                        <span className="detail-value">
                          {event.organizerId?.clubName ||
                            event.organizerId?.profile?.fullName ||
                            event.organizerId?.username ||
                            "-"}
                        </span>
                      </div>

                      <div className="detail-item">
                        <span className="detail-label">👥 Registrations:</span>
                        <span className="registration-badge">
                          {event.participantsCount ||
                            event.participants?.length ||
                            0}
                        </span>
                      </div>

                      {event.description && (
                        <div className="detail-item">
                          <span className="detail-label">📝 Description:</span>
                          <p className="event-description">
                            {event.description.substring(0, 100)}
                            {event.description.length > 100 ? "..." : ""}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Event Footer */}
                    <div className="event-footer">
                      <span className="event-location">
                        📍 {event.location || "Location not specified"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* STATS SECTION */}
          {activeTab === "my-events" && myEvents.length > 0 && (
            <div className="events-stats">
              <div className="stat-item">
                <span className="stat-label">Total Events:</span>
                <span className="stat-value">{myEvents.length}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Upcoming:</span>
                <span className="stat-value">
                  {myEvents.filter((e) => isUpcoming(e.dates?.startDate))
                    .length}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Total Registrations:</span>
                <span className="stat-value">
                  {myEvents.reduce(
                    (sum, e) => sum + (e.participantsCount || 0),
                    0
                  )}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
