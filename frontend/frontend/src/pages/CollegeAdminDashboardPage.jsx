import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";
import "../styles/CollegeAdminDashboard.css";

export default function CollegeAdminDashboardPage({ setCurrentPage }) {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [organizers, setOrganizers] = useState([]);
  const [filteredOrganizers, setFilteredOrganizers] = useState([]);
  const [recentEvents, setRecentEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [searchStudents, setSearchStudents] = useState("");
  const [searchOrganizers, setSearchOrganizers] = useState("");
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalOrganizers: 0,
    totalEvents: 0,
    upcomingEvents: 0,
  });

  // ✅ ORGANIZER CREATION WITH SEARCH (ENDPOINT FIXED)
  const [showOrganizerModal, setShowOrganizerModal] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [clubName, setClubName] = useState("");
  const [searchingUsers, setSearchingUsers] = useState(false);

  // Load all data on mount
  useEffect(() => {
    loadDashboardData();
  }, []);

  // Filter students when search changes
  useEffect(() => {
    filterStudents();
  }, [students, searchStudents]);

  // Filter organizers when search changes
  useEffect(() => {
    filterOrganizers();
  }, [organizers, searchOrganizers]);

  // ✅ LOAD ALL DASHBOARD DATA
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError("");

      // Load students
      const studentsRes = await API.get("/college-admin/students");
      if (studentsRes.data?.data) {
        setStudents(studentsRes.data.data);
      }

      // Load organizers
      const organizersRes = await API.get("/college-admin/organizers");
      if (organizersRes.data?.data) {
        setOrganizers(organizersRes.data.data);
      }

      // Load recent events
      const eventsRes = await API.get("/college-admin/recent-events");
      if (eventsRes.data?.events) {
        setRecentEvents(eventsRes.data.events.slice(0, 5));
      }

      // Calculate stats
      if (studentsRes.data?.data && organizersRes.data?.data && eventsRes.data?.events) {
        const upcomingCount = eventsRes.data.events.filter(
          (e) => new Date(e.dates?.startDate) > new Date()
        ).length;

        setStats({
          totalStudents: studentsRes.data.data.length,
          totalOrganizers: organizersRes.data.data.length,
          totalEvents: eventsRes.data.events.length,
          upcomingEvents: upcomingCount,
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  // ✅ FILTER STUDENTS
  const filterStudents = () => {
    if (searchStudents.trim() === "") {
      setFilteredStudents(students);
      return;
    }

    const query = searchStudents.toLowerCase();
    const filtered = students.filter(
      (s) =>
        s.profile?.fullName?.toLowerCase().includes(query) ||
        s.email?.toLowerCase().includes(query) ||
        s.usn?.toLowerCase().includes(query) ||
        s.username?.toLowerCase().includes(query)
    );
    setFilteredStudents(filtered);
  };

  // ✅ FILTER ORGANIZERS
  const filterOrganizers = () => {
    if (searchOrganizers.trim() === "") {
      setFilteredOrganizers(organizers);
      return;
    }

    const query = searchOrganizers.toLowerCase();
    const filtered = organizers.filter(
      (o) =>
        o.profile?.fullName?.toLowerCase().includes(query) ||
        o.email?.toLowerCase().includes(query) ||
        o.clubName?.toLowerCase().includes(query) ||
        o.username?.toLowerCase().includes(query)
    );
    setFilteredOrganizers(filtered);
  };

  // ✅ SEARCH USERS FOR ORGANIZER ASSIGNMENT (ENDPOINT FIXED)
  const handleSearchUsers = async (query) => {
    setUserSearchQuery(query);

    // If query is less than 2 chars, clear results
    if (!query || query.trim().length < 2) {
      setUserSearchResults([]);
      return;
    }

    try {
      setSearchingUsers(true);
      console.log("🔍 Searching for:", query);

      // ✅ FIXED: Use /college-admin/search endpoint
      const res = await API.get(`/college-admin/search`, {
        params: { query: query.trim() }
      });

      console.log("✅ Search results:", res.data);

      if (res.data?.data && Array.isArray(res.data.data)) {
        // Filter out already existing organizers
        const existingOrgIds = organizers.map((o) => o._id);
        const available = res.data.data.filter(
          (u) => !existingOrgIds.includes(u._id)
        );
        
        console.log("📋 Available users:", available);
        setUserSearchResults(available.slice(0, 10)); // Max 10 results
      } else {
        setUserSearchResults([]);
      }
    } catch (err) {
      console.error("❌ Search error:", err);
      console.error("Error details:", err.response?.data);
      setError("Failed to search users: " + (err.response?.data?.message || err.message));
      setUserSearchResults([]);
      setTimeout(() => setError(""), 3000);
    } finally {
      setSearchingUsers(false);
    }
  };

  // ✅ SELECT USER AS ORGANIZER
  const handleSelectUser = (user) => {
    console.log("✓ Selected user:", user);
    setSelectedUser(user);
    setUserSearchQuery("");
    setUserSearchResults([]);
  };

  // ✅ CREATE ORGANIZER FROM SELECTED USER
  const handleCreateOrganizer = async (e) => {
    e.preventDefault();

    if (!selectedUser) {
      setError("Please select a user first");
      setTimeout(() => setError(""), 3000);
      return;
    }

    try {
      setLoading(true);
      setError("");

      console.log("📤 Creating organizer:", {
        userId: selectedUser._id,
        clubName: clubName.trim() || null
      });

      const res = await API.post("/college-admin/organizers", {
        userId: selectedUser._id,
        clubName: clubName.trim() || null
      });

      console.log("✅ Organizer created:", res.data);

      setSuccess("Organizer created successfully!");
      setShowOrganizerModal(false);
      setSelectedUser(null);
      setClubName("");
      setUserSearchQuery("");
      loadDashboardData();

      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("❌ Error creating organizer:", err);
      const errorMsg =
        err.response?.data?.message || "Failed to create organizer";
      setError(errorMsg);
      setTimeout(() => setError(""), 3000);
    } finally {
      setLoading(false);
    }
  };

  // ✅ REMOVE ORGANIZER
  const handleRemoveOrganizer = async (organizerId) => {
    if (
      !window.confirm(
        "Are you sure you want to remove this organizer? They will no longer be able to create events."
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      await API.delete(`/college-admin/organizers/${organizerId}`);
      setSuccess("Organizer removed successfully!");
      loadDashboardData();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to remove organizer");
      setTimeout(() => setError(""), 3000);
    } finally {
      setLoading(false);
    }
  };

  // ✅ CLOSE MODAL
  const handleCloseOrganizerModal = () => {
    setShowOrganizerModal(false);
    setSelectedUser(null);
    setClubName("");
    setUserSearchQuery("");
    setUserSearchResults([]);
  };

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
          <h1>🏫 College Admin Dashboard</h1>
          <p className="welcome-text">
            Welcome, {user?.profile?.fullName || user?.username}
          </p>
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
      {success && (
        <div className="alert alert-success">
          <span>✅</span> {success}
          <button onClick={() => setSuccess("")} className="alert-close">
            &times;
          </button>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="tabs-navigation">
        <button
          className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("overview");
            setSearchStudents("");
            setSearchOrganizers("");
          }}
        >
          📊 Overview
        </button>
        <button
          className={`tab-btn ${activeTab === "students" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("students");
            setSearchStudents("");
          }}
        >
          👨‍🎓 Students ({students.length})
        </button>
        <button
          className={`tab-btn ${activeTab === "organizers" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("organizers");
            setSearchOrganizers("");
          }}
        >
          👥 Organizers ({organizers.length})
        </button>
      </div>

      {loading && activeTab === "overview" ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="dashboard-content">
              {/* STATS CARDS */}
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">👨‍🎓</div>
                  <div className="stat-info">
                    <p className="stat-label">Total Students</p>
                    <p className="stat-value">{stats.totalStudents}</p>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon">👥</div>
                  <div className="stat-info">
                    <p className="stat-label">Total Organizers</p>
                    <p className="stat-value">{stats.totalOrganizers}</p>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon">📅</div>
                  <div className="stat-info">
                    <p className="stat-label">Total Events</p>
                    <p className="stat-value">{stats.totalEvents}</p>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon">⏳</div>
                  <div className="stat-info">
                    <p className="stat-label">Upcoming Events</p>
                    <p className="stat-value">{stats.upcomingEvents}</p>
                  </div>
                </div>
              </div>

              {/* RECENT EVENTS */}
              <div className="section">
                <h2>📋 Recent Events</h2>
                {recentEvents.length === 0 ? (
                  <div className="empty-state">
                    <p>No events yet</p>
                  </div>
                ) : (
                  <div className="events-list">
                    {recentEvents.map((event) => (
                      <div key={event._id} className="event-item">
                        <div className="event-info">
                          <h4 className="event-title">{event.title}</h4>
                          <p className="event-organizer">
                            By {event.organizerId?.clubName || event.organizerId?.username}
                          </p>
                          <p className="event-date">
                            {new Date(event.dates?.startDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="event-stat">
                          <span className="registration-badge">
                            {event.participantsCount || 0} registrations
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: STUDENTS */}
          {activeTab === "students" && (
            <div className="admin-section">
              <div className="section-header">
                <h2>👨‍🎓 Students</h2>
                <div className="header-stats">
                  <span className="stat">
                    Total: <strong>{students.length}</strong>
                  </span>
                </div>
              </div>

              {/* Search Box */}
              <div className="filters-container">
                <div className="search-box">
                  <input
                    type="text"
                    placeholder="🔍 Search by name, email, USN, or username..."
                    value={searchStudents}
                    onChange={(e) => setSearchStudents(e.target.value)}
                    className="search-input"
                    autoComplete="off"
                  />
                  {searchStudents && (
                    <button
                      className="clear-btn"
                      onClick={() => setSearchStudents("")}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Students Grid */}
              {loading ? (
                <div className="loading-container">
                  <div className="spinner"></div>
                  <p>Loading...</p>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="empty-state">
                  <p className="empty-icon">👨‍🎓</p>
                  <p className="empty-message">
                    {searchStudents ? "No students found matching your search" : "No students"}
                  </p>
                </div>
              ) : (
                <div className="students-grid">
                  {filteredStudents.map((student) => (
                    <div key={student._id} className="student-card">
                      <div className="card-header">
                        <h3 className="student-name">
                          {student.profile?.fullName || student.username}
                        </h3>
                      </div>

                      <div className="card-body">
                        <div className="info-item">
                          <span className="info-label">📧 Email:</span>
                          <span className="info-value">{student.email}</span>
                        </div>

                        <div className="info-item">
                          <span className="info-label">🎓 USN:</span>
                          <span className="info-value">{student.usn || "-"}</span>
                        </div>

                        <div className="info-item">
                          <span className="info-label">👤 Username:</span>
                          <span className="info-value">{student.username}</span>
                        </div>

                        <div className="info-item">
                          <span className="info-label">📱 Phone:</span>
                          <span className="info-value">
                            {student.profile?.phone || "-"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ORGANIZERS */}
          {activeTab === "organizers" && (
            <div className="admin-section">
              <div className="section-header">
                <h2>👥 Organizers Management</h2>
                <div className="header-stats">
                  <span className="stat">
                    Total: <strong>{organizers.length}</strong>
                  </span>
                </div>
              </div>

              {/* Add Organizer Button */}
              <div className="organizers-toolbar">
                <button
                  className="btn btn-primary"
                  onClick={() => setShowOrganizerModal(true)}
                >
                  ➕ Add Organizer
                </button>
              </div>

              {/* Search Box */}
              <div className="filters-container">
                <div className="search-box">
                  <input
                    type="text"
                    placeholder="🔍 Search by name, email, club, or username..."
                    value={searchOrganizers}
                    onChange={(e) => setSearchOrganizers(e.target.value)}
                    className="search-input"
                    autoComplete="off"
                  />
                  {searchOrganizers && (
                    <button
                      className="clear-btn"
                      onClick={() => setSearchOrganizers("")}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Organizers Grid */}
              {loading ? (
                <div className="loading-container">
                  <div className="spinner"></div>
                  <p>Loading...</p>
                </div>
              ) : filteredOrganizers.length === 0 ? (
                <div className="empty-state">
                  <p className="empty-icon">👥</p>
                  <p className="empty-message">
                    {searchOrganizers ? "No organizers found matching your search" : "No organizers yet"}
                  </p>
                </div>
              ) : (
                <div className="organizers-grid">
                  {filteredOrganizers.map((org) => (
                    <div key={org._id} className="organizer-card">
                      <div className="card-header">
                        <h3 className="organizer-name">
                          {org.clubName || org.profile?.fullName || org.username}
                        </h3>
                      </div>

                      <div className="card-body">
                        <div className="info-item">
                          <span className="info-label">👤 Username:</span>
                          <span className="info-value">{org.username}</span>
                        </div>

                        <div className="info-item">
                          <span className="info-label">📧 Email:</span>
                          <span className="info-value">{org.email}</span>
                        </div>

                        <div className="info-item">
                          <span className="info-label">📝 Full Name:</span>
                          <span className="info-value">
                            {org.profile?.fullName || "-"}
                          </span>
                        </div>

                        <div className="info-item">
                          <span className="info-label">📅 Joined:</span>
                          <span className="info-value">
                            {new Date(org.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="card-footer">
                        <button
                          className="btn btn-danger btn-block"
                          onClick={() => handleRemoveOrganizer(org._id)}
                          disabled={loading}
                        >
                          🗑️ Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ✅ ADD ORGANIZER MODAL */}
      {showOrganizerModal && (
        <div className="modal-overlay" onClick={handleCloseOrganizerModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>➕ Add New Organizer</h2>
              <button
                className="modal-close"
                onClick={handleCloseOrganizerModal}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateOrganizer} className="organizer-form">
              {/* User Search */}
              <div className="form-group">
                <label className="form-label">Search Users *</label>
                <div className="search-input-wrapper">
                  <input
                    type="text"
                    placeholder="Type name, email, or username (min 2 chars)..."
                    value={userSearchQuery}
                    onChange={(e) => handleSearchUsers(e.target.value)}
                    className="search-input"
                    autoComplete="off"
                    disabled={selectedUser !== null}
                  />
                  {searchingUsers && (
                    <div className="search-spinner">⏳</div>
                  )}
                </div>

                {/* Search Results Dropdown */}
                {userSearchQuery.trim().length >= 2 && userSearchResults.length > 0 && !selectedUser && (
                  <div className="search-dropdown">
                    {userSearchResults.map((u) => (
                      <div
                        key={u._id}
                        className="dropdown-item"
                        onClick={() => handleSelectUser(u)}
                      >
                        <div className="user-name">
                          {u.profile?.fullName || u.username}
                        </div>
                        <div className="user-email">{u.email}</div>
                      </div>
                    ))}
                  </div>
                )}

                {userSearchQuery.trim().length >= 2 && userSearchResults.length === 0 && !selectedUser && !searchingUsers && (
                  <div className="no-results">No users found</div>
                )}
              </div>

              {/* Selected User Display */}
              {selectedUser && (
                <div className="selected-user-card">
                  <div className="selected-badge">✓ Selected</div>
                  <div className="selected-name">
                    {selectedUser.profile?.fullName || selectedUser.username}
                  </div>
                  <div className="selected-email">{selectedUser.email}</div>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={() => {
                      setSelectedUser(null);
                      setUserSearchQuery("");
                    }}
                  >
                    Change
                  </button>
                </div>
              )}

              {/* Club Name (OPTIONAL) */}
              <div className="form-group">
                <label className="form-label">Club Name (Optional)</label>
                <input
                  type="text"
                  placeholder="Enter club or organization name (optional)"
                  value={clubName}
                  onChange={(e) => setClubName(e.target.value)}
                  className="form-control"
                />
              </div>

              {/* Buttons */}
              <div className="modal-buttons">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCloseOrganizerModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!selectedUser || loading}
                >
                  {loading ? "Creating..." : "Create Organizer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
