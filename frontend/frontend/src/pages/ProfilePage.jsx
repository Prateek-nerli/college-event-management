import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import "../styles/ProfilePage.css";
import EventDetailPage from "./EventDetailPage";
import EditEventModal from "../components/EditEventModal";
import ViewParticipantsModal from "../components/ViewParticipantsModal";
// Removed unused CertificateTemplateEditor import

const API_BASE_URL = "http://localhost:5000/api";

// 👇 Added onManageCertificates to props
export default function ProfilePage({ setCurrentPage, onManageCertificates }) {
  const { user, token } = useAuth();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [editingEvent, setEditingEvent] = useState(null);
  const [viewingParticipants, setViewingParticipants] = useState(null);
  // Removed local certificate editor state and selectedEventId (Boss/App handles it now)

  // Dashboard states
  const [myEvents, setMyEvents] = useState([]);
  const [registeredEvents, setRegisteredEvents] = useState([]);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [detailEventId, setDetailEventId] = useState(null);

  // ✅ NEW: Certificate State
  const [certificates, setCertificates] = useState([]);
  const [certLoading, setCertLoading] = useState(false);

  // Form states
  const [editPersonal, setEditPersonal] = useState(false);
  const [editContact, setEditContact] = useState(false);
  const [editNotifications, setEditNotifications] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
    showPassword: false,
  });
  const [passwordMsg, setPasswordMsg] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    department: "",
    year: "",
    phone: "",
    avatar: "",
    bio: "",
    skills: "",
    preferredChannel: "email",
    alternateEmail: "",
    whatsappNumber: "",
    emailRegistration: true,
    emailReminders: true,
    emailResults: true,
    emailAnnouncements: true,
    inAppAnnouncements: true,
    inAppSystemAlerts: true,
    inAppResults: true,
  });

  // Fetch profile & stats
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [profileRes, statsRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/users/me`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_BASE_URL}/users/me/stats`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const profileData = profileRes.data.data;
        setProfile(profileData);
        setStats(statsRes.data.data);

        setFormData({
          fullName: profileData.profile?.fullName || "",
          department: profileData.profile?.department || "",
          year: profileData.profile?.year || "",
          phone: profileData.profile?.phone || "",
          avatar: profileData.profile?.avatar || "",
          bio: profileData.profile?.bio || "",
          skills: profileData.profile?.skills || "",
          preferredChannel:
            profileData.contactPreferences?.preferredChannel || "email",
          alternateEmail: profileData.contactPreferences?.alternateEmail || "",
          whatsappNumber: profileData.contactPreferences?.whatsappNumber || "",
          emailRegistration:
            profileData.notificationSettings?.email?.registration ?? true,
          emailReminders:
            profileData.notificationSettings?.email?.reminders ?? true,
          emailResults:
            profileData.notificationSettings?.email?.results ?? true,
          emailAnnouncements:
            profileData.notificationSettings?.email?.announcements ?? true,
          inAppAnnouncements:
            profileData.notificationSettings?.inApp?.announcements ?? true,
          inAppSystemAlerts:
            profileData.notificationSettings?.inApp?.systemAlerts ?? true,
          inAppResults:
            profileData.notificationSettings?.inApp?.results ?? true,
        });
      } catch (err) {
        console.error("Error fetching profile", err);
        setError("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchData();
    }
  }, [token]);

  // ✅ NEW: Fetch Certificates
  const fetchCertificates = async () => {
    if (!token) return;
    try {
      setCertLoading(true);
      const res = await axios.get(`${API_BASE_URL}/me/certificates`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCertificates(res.data || []);
    } catch (err) {
      console.error("Failed to load certificates", err);
    } finally {
      setCertLoading(false);
    }
  };

  // ✅ NEW: Load certificates when tab is active
  useEffect(() => {
    if (activeTab === "certificates" && token) {
      fetchCertificates();
    }
  }, [activeTab, token]);

  const fetchDashboardData = async () => {
    if (!token || !profile?._id) return;

    try {
      setDashboardLoading(true);
      const res = await axios.get(`${API_BASE_URL}/events`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const allEvents = res.data.data || [];
      const userId = profile?._id?.toString();

      // Organized events
      const organized = allEvents.filter((event) => {
        const orgId = event.organizerId;
        const orgIdStr =
          typeof orgId === "string"
            ? orgId
            : orgId?._id
            ? orgId._id.toString()
            : orgId?.toString();

        return orgIdStr === userId;
      });

      // Registered events
      const registered = allEvents.filter((event) => {
        const isRegistered = event.participants?.some((p) => {
          const participantId =
            typeof p === "string"
              ? p
              : p?._id
              ? p._id.toString()
              : p.toString();
          return participantId === userId;
        });

        return isRegistered;
      });

      setMyEvents(organized);
      setRegisteredEvents(registered);
    } catch (err) {
      console.error("Error fetching events:", err);
    } finally {
      setDashboardLoading(false);
    }
  };

  // Fetch dashboard events when Events tab is active AND profile is loaded
  useEffect(() => {
    if (activeTab === "events" && token && profile?._id) {
      fetchDashboardData();
    }
  }, [activeTab, token, profile]);

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError("");
      setSuccessMsg("");

      const updatePayload = {
        "profile.fullName": formData.fullName,
        "profile.department": formData.department,
        "profile.year": formData.year,
        "profile.phone": formData.phone,
        "profile.avatar": formData.avatar,
        "profile.bio": formData.bio,
        "profile.skills": formData.skills,
        "contactPreferences.preferredChannel": formData.preferredChannel,
        "contactPreferences.alternateEmail": formData.alternateEmail,
        "contactPreferences.whatsappNumber": formData.whatsappNumber,
        "notificationSettings.email.registration": formData.emailRegistration,
        "notificationSettings.email.reminders": formData.emailReminders,
        "notificationSettings.email.results": formData.emailResults,
        "notificationSettings.email.announcements": formData.emailAnnouncements,
        "notificationSettings.inApp.announcements": formData.inAppAnnouncements,
        "notificationSettings.inApp.systemAlerts": formData.inAppSystemAlerts,
        "notificationSettings.inApp.results": formData.inAppResults,
      };

      const res = await axios.put(`${API_BASE_URL}/users/me`, updatePayload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setProfile(res.data.data);
      setSuccessMsg("Profile updated successfully!");
      setEditPersonal(false);
      setEditContact(false);
      setEditNotifications(false);

      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.error("Error updating profile", err);
      setError("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleEditClick = (event) => {
    setEditingEvent(event);
  };

  const handleDeleteClick = async (eventId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this event? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const response = await axios.delete(`${API_BASE_URL}/events/${eventId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        alert("✅ Event deleted successfully!");
        setMyEvents(myEvents.filter((e) => e._id !== eventId));
        setSuccessMsg("Event deleted successfully!");
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch (error) {
      console.error("Error deleting event:", error);
      const errorMsg =
        error.response?.data?.message || "Failed to delete event";
      setError(errorMsg);
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleUnregister = async (eventId) => {
    if (
      !window.confirm("Are you sure you want to unregister from this event?")
    ) {
      return;
    }

    try {
      setLoading(true);
      const event = registeredEvents.find((e) => e._id === eventId);
      if (!event) {
        throw new Error("Event not found");
      }

      let isTeamLeader = false;
      let teamIdToUnregister = null;

      if (
        event.registrationType === "team" &&
        event.teamRegistrations?.length > 0
      ) {
        for (const teamReg of event.teamRegistrations) {
          const isInTeam = teamReg.members?.some(
            (m) =>
              (m.userId?._id || m.userId)?.toString() ===
              profile._id?.toString()
          );

          if (isInTeam) {
            try {
              const teamRes = await axios.get(
                `${API_BASE_URL}/teams/${
                  teamReg.teamId?._id || teamReg.teamId
                }`,
                { headers: { Authorization: `Bearer ${token}` } }
              );

              if (
                teamRes.data.data?.leader?.toString() ===
                profile._id?.toString()
              ) {
                isTeamLeader = true;
                teamIdToUnregister = teamReg.teamId?._id || teamReg.teamId;
                break;
              }
            } catch (err) {
              console.log("Could not verify team leadership");
            }
          }
        }
      }

      if (isTeamLeader && teamIdToUnregister) {
        const confirmTeamUnregister = window.confirm(
          "⚠️ You are the team leader. Unregistering will remove your ENTIRE TEAM from this event. All team members will be removed. Continue?"
        );

        if (!confirmTeamUnregister) {
          setLoading(false);
          return;
        }

        await axios.post(
          `${API_BASE_URL}/events/${eventId}/unregister-team`,
          { teamId: teamIdToUnregister },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        alert(`✅ Your entire team has been unregistered!`);
      } else {
        await axios.post(
          `${API_BASE_URL}/events/${eventId}/unregister`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        alert("✅ You have been unregistered from the event!");
      }

      const updatedRes = await axios.get(
        `${API_BASE_URL}/events/my-events/registered`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setRegisteredEvents(updatedRes.data.data);
      setError("");
    } catch (err) {
      console.error("❌ Unregister error:", err);
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        "Failed to unregister from event";
      setError(errorMsg);
      alert("❌ " + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordMsg("");

    if (
      !passwordData.oldPassword ||
      !passwordData.newPassword ||
      !passwordData.confirmPassword
    ) {
      setPasswordError("All fields are required");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }

    try {
      setChangingPassword(true);
      await axios.post(
        `${API_BASE_URL}/users/change-password`,
        {
          oldPassword: passwordData.oldPassword,
          newPassword: passwordData.newPassword,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setPasswordMsg("Password changed successfully!");
      setPasswordData({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
        showPassword: false,
      });
      setShowPasswordForm(false);

      setTimeout(() => setPasswordMsg(""), 3000);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to change password";
      setPasswordError(msg);
    } finally {
      setChangingPassword(false);
    }
  };

  if (!token) {
    return (
      <div className="profile-page">
        <div className="empty-state">Please login to view your profile</div>
      </div>
    );
  }

  if (detailEventId) {
    return (
      <EventDetailPage
        eventId={detailEventId}
        onBack={() => setDetailEventId(null)}
        setCurrentPage={setCurrentPage}
      />
    );
  }

  if (loading || !profile) {
    return (
      <div className="profile-page">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      {/* HEADER WITH HERO */}
      <div className="profile-hero">
        <div className="hero-background"></div>
        <div className="hero-content">
          <div className="avatar-container">
            {formData.avatar ? (
              <img
                src={formData.avatar}
                alt="Avatar"
                className="avatar-image"
              />
            ) : (
              <div className="avatar-placeholder">
                {profile.username?.[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <div className="hero-info">
            <h1>{profile.username}</h1>
            <p>{profile.email}</p>
            <span className={`badge badge-${profile.role}`}>
              {profile.role.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* STATS CARDS */}
      {stats && (
        <div className="stats-grid">
          <div
            className="stat-card cursor-pointer hover:shadow-lg"
            onClick={() => setActiveTab("events")}
          >
            <div className="stat-icon">📅</div>
            <div className="stat-content">
              <div className="stat-value">{stats.registeredCount}</div>
              <div className="stat-label">Events Registered</div>
            </div>
          </div>
          {profile.role === "organizer" && (
            <div
              className="stat-card cursor-pointer hover:shadow-lg"
              onClick={() => setActiveTab("events")}
            >
              <div className="stat-icon">🎯</div>
              <div className="stat-content">
                <div className="stat-value">{stats.organizedCount}</div>
                <div className="stat-label">Events Organized</div>
              </div>
            </div>
          )}
          <div className="stat-card">
            <div className="stat-icon">🔜</div>
            <div className="stat-content">
              <div className="stat-value">{stats.upcomingRegistered}</div>
              <div className="stat-label">Upcoming Events</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🏆</div>
            <div className="stat-content">
              <div className="stat-value">{stats.certificatesCount}</div>
              <div className="stat-label">Certificates</div>
            </div>
          </div>
        </div>
      )}

      {/* ALERTS */}
      {error && <div className="alert alert-error">{error}</div>}
      {successMsg && <div className="alert alert-success">{successMsg}</div>}
      {passwordMsg && <div className="alert alert-success">{passwordMsg}</div>}
      {passwordError && (
        <div className="alert alert-error">{passwordError}</div>
      )}

      {/* TAB NAVIGATION */}
      <div className="tabs-container">
        <div className="tabs">
          <button
            className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            👤 Personal
          </button>
          <button
            className={`tab-btn ${activeTab === "events" ? "active" : ""}`}
            onClick={() => setActiveTab("events")}
          >
            📋 My Events
          </button>
          {/* ✅ NEW: Certificates Tab Button */}
          <button
            className={`tab-btn ${
              activeTab === "certificates" ? "active" : ""
            }`}
            onClick={() => setActiveTab("certificates")}
          >
            🏅 Certificates
          </button>
          <button
            className={`tab-btn ${activeTab === "contact" ? "active" : ""}`}
            onClick={() => setActiveTab("contact")}
          >
            📞 Contact
          </button>
          <button
            className={`tab-btn ${
              activeTab === "notifications" ? "active" : ""
            }`}
            onClick={() => setActiveTab("notifications")}
          >
            🔔 Notifications
          </button>
          <button
            className={`tab-btn ${activeTab === "security" ? "active" : ""}`}
            onClick={() => setActiveTab("security")}
          >
            🔐 Security
          </button>
        </div>
      </div>

      {/* TAB CONTENT */}
      <div className="profile-content">
        {/* PERSONAL TAB */}
        {activeTab === "overview" && (
          <div className="tab-pane">
            <div className="section-header">
              <h2>Personal Information</h2>
              <button
                className={`btn-toggle ${editPersonal ? "active" : ""}`}
                onClick={() => setEditPersonal(!editPersonal)}
              >
                {editPersonal ? "✕ Cancel" : "✏️ Edit"}
              </button>
            </div>

            {!editPersonal ? (
              <div className="info-grid">
                <div className="info-item">
                  <span className="label">Full Name</span>
                  <span className="value">{formData.fullName || "—"}</span>
                </div>
                <div className="info-item">
                  <span className="label">College ID</span>
                  <span className="value">{profile.collegeId || "—"}</span>
                </div>
                <div className="info-item">
                  <span className="label">Department</span>
                  <span className="value">{formData.department || "—"}</span>
                </div>
                <div className="info-item">
                  <span className="label">Year</span>
                  <span className="value">{formData.year || "—"}</span>
                </div>
                <div className="info-item">
                  <span className="label">Phone</span>
                  <span className="value">{formData.phone || "—"}</span>
                </div>
                <div className="info-item full">
                  <span className="label">Bio</span>
                  <span className="value">{formData.bio || "—"}</span>
                </div>
                <div className="info-item full">
                  <span className="label">Skills</span>
                  <span className="value">{formData.skills || "—"}</span>
                </div>
              </div>
            ) : (
              <form className="edit-form" onSubmit={handleSave}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Full Name</label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleFormChange}
                      placeholder="Your full name"
                    />
                  </div>
                  <div className="form-group">
                    <label>Department</label>
                    <input
                      type="text"
                      name="department"
                      value={formData.department}
                      onChange={handleFormChange}
                      placeholder="Computer Science"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Year</label>
                    <select
                      name="year"
                      value={formData.year}
                      onChange={handleFormChange}
                    >
                      <option value="">Select year</option>
                      <option value="1">1st Year</option>
                      <option value="2">2nd Year</option>
                      <option value="3">3rd Year</option>
                      <option value="4">4th Year</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleFormChange}
                      placeholder="+91 xxxxx xxxxx"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Avatar URL</label>
                  <input
                    type="url"
                    name="avatar"
                    value={formData.avatar}
                    onChange={handleFormChange}
                    placeholder="https://example.com/avatar.jpg"
                  />
                </div>

                <div className="form-group">
                  <label>Bio</label>
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleFormChange}
                    placeholder="Tell us about yourself..."
                    rows="3"
                  />
                </div>

                <div className="form-group">
                  <label>Skills (comma-separated)</label>
                  <input
                    type="text"
                    name="skills"
                    value={formData.skills}
                    onChange={handleFormChange}
                    placeholder="React, Node.js, Design, ..."
                  />
                </div>

                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </form>
            )}
          </div>
        )}

        {/* EVENTS TAB */}
        {activeTab === "events" && (
          <div className="tab-pane">
            {dashboardLoading ? (
              <div className="loader"></div>
            ) : (
              <>
                {/* ORGANIZED EVENTS - only for organizers */}
                {profile.role === "organizer" && (
                  <>
                    <div className="section-header">
                      <h2>🎯 Events You Organized ({myEvents.length})</h2>
                    </div>

                    {myEvents.length > 0 ? (
                      <div className="events-list">
                        {myEvents.map((event) => {
                          const eventDate = new Date(
                            event.dates?.startDate || new Date()
                          );
                          const isExpanded = selectedEvent?._id === event._id;

                          return (
                            <div key={event._1d || event._id} className="event-item">
                              <div className="event-header">
                                <h3>{event.title}</h3>
                                <span className="category-badge">
                                  {event.category}
                                </span>
                              </div>
                              <p className="event-desc">
                                {event.description?.substring(0, 100)}...
                              </p>
                              <div className="event-meta">
                                <span>
                                  📅 {eventDate.toLocaleDateString("en-IN")}
                                </span>
                                <span>
                                  👥 {event.participants?.length || 0}{" "}
                                  registered
                                </span>
                                <span>
                                  📍{" "}
                                  {event.location?.venue ||
                                    event.venue?.name ||
                                    "TBD"}
                                </span>
                              </div>

                              <div className="event-actions">
                                <button
                                  className="btn-secondary"
                                  onClick={() => setViewingParticipants(event)}
                                >
                                  👥 View Participants
                                </button>

                                {/* ✅ UPDATED: Use onManageCertificates prop instead of local state */}
                                <button
                                  className="btn-secondary"
                                  onClick={() => onManageCertificates(event._id)}
                                >
                                  🏅 Manage Certificates
                                </button>

                                <button
                                  className="btn-edit"
                                  onClick={() => handleEditClick(event)}
                                >
                                  ✏️ Edit
                                </button>
                                <button
                                  className="btn-delete"
                                  onClick={() => handleDeleteClick(event._id)}
                                >
                                  🗑️ Delete
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="empty-message">
                        <p>📭 No events organized yet</p>
                        <p style={{ fontSize: "13px", marginTop: "8px" }}>
                          Create your first event from the navbar
                        </p>
                      </div>
                    )}
                  </>
                )}

                {/* REGISTERED EVENTS */}
                <div
                  className="section-header"
                  style={{
                    marginTop:
                      profile.role === "organizer" && myEvents.length > 0
                        ? "40px"
                        : 0,
                  }}
                >
                  <h2>
                    📅 Events You Registered For ({registeredEvents.length})
                  </h2>
                </div>

                {registeredEvents.length > 0 ? (
                  <div className="events-list">
                    {registeredEvents.map((event) => {
                      const eventDate = new Date(
                        event.dates?.startDate || new Date()
                      );
                      const organizerId =
                        event.organizerId?._id || event.organizerId;
                      const isOrganizer =
                        organizerId?.toString() === profile._id?.toString();

                      return (
                        <div key={event._id} className="event-item">
                          <div className="event-header">
                            <h3>{event.title}</h3>
                            <span className="category-badge">
                              {event.category}
                            </span>
                          </div>
                          <p className="event-desc">
                            {event.description?.substring(0, 100)}...
                          </p>
                          <div className="event-meta">
                            <span>
                              📅 {eventDate.toLocaleDateString("en-IN")}
                            </span>
                            <span>
                              👥 {event.participants?.length || 0} total
                            </span>
                            <span>
                              📍{" "}
                              {event.location?.venue ||
                                event.venue?.name ||
                                "TBD"}
                            </span>
                          </div>

                          <div className="event-actions">
                            <button
                              className="btn-secondary"
                              onClick={() => setDetailEventId(event._id)}
                            >
                              👁️ View Details
                            </button>

                            {!isOrganizer && (
                              <button
                                className="btn-danger"
                                onClick={() => handleUnregister(event._id)}
                                disabled={loading}
                              >
                                {loading
                                  ? "⏳ Unregistering..."
                                  : "❌ Unregister"}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="empty-message">
                    <p>📭 No events registered yet</p>
                    <p style={{ fontSize: "13px", marginTop: "8px" }}>
                      Browse events and register to get started!
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ✅ NEW: CERTIFICATES TAB */}
        {activeTab === "certificates" && (
          <div className="tab-pane">
            <div className="section-header">
              <h2>My Certificates</h2>
            </div>

            {certLoading ? (
              <div className="loader"></div>
            ) : certificates.length === 0 ? (
              <div className="empty-message">
                <p>📭 No certificates earned yet.</p>
                <p style={{ fontSize: "13px", marginTop: "8px" }}>
                  Participate in events to earn certificates!
                </p>
              </div>
            ) : (
              <div className="stats-grid" style={{ marginTop: "20px" }}>
                {certificates.map((cert) => (
                  <div
                    key={cert._id}
                    className="stat-card"
                    style={{
                      flexDirection: "column",
                      alignItems: "flex-start",
                      gap: "15px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        width: "100%",
                      }}
                    >
                      <div className="stat-icon">📜</div>
                      <div>
                        <h4
                          style={{
                            margin: 0,
                            color: "#333",
                            fontSize: "16px",
                          }}
                        >
                          {cert.event?.title || "Event Certificate"}
                        </h4>
                        <small style={{ color: "#666" }}>
                          Issued: {new Date(cert.issuedAt).toLocaleDateString()}
                        </small>
                      </div>
                    </div>

                    <a
                      href={cert.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary"
                      style={{
                        textDecoration: "none",
                        textAlign: "center",
                        display: "block",
                        width: "100%",
                        fontSize: "14px",
                      }}
                    >
                      Download PDF ⬇️
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CONTACT TAB */}
        {activeTab === "contact" && (
          <div className="tab-pane">
            <div className="section-header">
              <h2>Contact & Communication</h2>
              <button
                className={`btn-toggle ${editContact ? "active" : ""}`}
                onClick={() => setEditContact(!editContact)}
              >
                {editContact ? "✕ Cancel" : "✏️ Edit"}
              </button>
            </div>

            {!editContact ? (
              <div className="info-grid">
                <div className="info-item">
                  <span className="label">Preferred Channel</span>
                  <span className="value capitalize">
                    {formData.preferredChannel}
                  </span>
                </div>
                <div className="info-item">
                  <span className="label">Alternate Email</span>
                  <span className="value">
                    {formData.alternateEmail || "—"}
                  </span>
                </div>
                <div className="info-item">
                  <span className="label">WhatsApp Number</span>
                  <span className="value">
                    {formData.whatsappNumber || "—"}
                  </span>
                </div>
              </div>
            ) : (
              <form className="edit-form" onSubmit={handleSave}>
                <div className="form-group">
                  <label>Preferred Communication Channel</label>
                  <div className="radio-group">
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="preferredChannel"
                        value="email"
                        checked={formData.preferredChannel === "email"}
                        onChange={handleFormChange}
                      />
                      <span>Email</span>
                    </label>
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="preferredChannel"
                        value="whatsapp"
                        checked={formData.preferredChannel === "whatsapp"}
                        onChange={handleFormChange}
                      />
                      <span>WhatsApp</span>
                    </label>
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="preferredChannel"
                        value="in-app"
                        checked={formData.preferredChannel === "in-app"}
                        onChange={handleFormChange}
                      />
                      <span>In-app Only</span>
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label>Alternate Email</label>
                  <input
                    type="email"
                    name="alternateEmail"
                    value={formData.alternateEmail}
                    onChange={handleFormChange}
                    placeholder="your.email@example.com"
                  />
                </div>

                <div className="form-group">
                  <label>WhatsApp Number</label>
                  <input
                    type="tel"
                    name="whatsappNumber"
                    value={formData.whatsappNumber}
                    onChange={handleFormChange}
                    placeholder="+91 xxxxx xxxxx"
                  />
                </div>

                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </form>
            )}
          </div>
        )}

        {/* NOTIFICATIONS TAB */}
        {activeTab === "notifications" && (
          <div className="tab-pane">
            <div className="section-header">
              <h2>Notification Preferences</h2>
            </div>

            <form className="edit-form" onSubmit={handleSave}>
              <div className="preferences-grid">
                <div className="pref-section">
                  <h3>📧 Email Notifications</h3>
                  <label className="checkbox-item">
                    <input
                      type="checkbox"
                      name="emailRegistration"
                      checked={formData.emailRegistration}
                      onChange={handleFormChange}
                      disabled={!editNotifications}
                    />
                    <span>Registration confirmations</span>
                  </label>
                  <label className="checkbox-item">
                    <input
                      type="checkbox"
                      name="emailReminders"
                      checked={formData.emailReminders}
                      onChange={handleFormChange}
                      disabled={!editNotifications}
                    />
                    <span>Event reminders (1 day & 1 hour before)</span>
                  </label>
                  <label className="checkbox-item">
                    <input
                      type="checkbox"
                      name="emailResults"
                      checked={formData.emailResults}
                      onChange={handleFormChange}
                      disabled={!editNotifications}
                    />
                    <span>Results & certificates released</span>
                  </label>
                  <label className="checkbox-item">
                    <input
                      type="checkbox"
                      name="emailAnnouncements"
                      checked={formData.emailAnnouncements}
                      onChange={handleFormChange}
                      disabled={!editNotifications}
                    />
                    <span>Organizer announcements</span>
                  </label>
                </div>

                <div className="pref-section">
                  <h3>🔔 In-app Notifications</h3>
                  <label className="checkbox-item">
                    <input
                      type="checkbox"
                      name="inAppAnnouncements"
                      checked={formData.inAppAnnouncements}
                      onChange={handleFormChange}
                      disabled={!editNotifications}
                    />
                    <span>Announcements</span>
                  </label>
                  <label className="checkbox-item">
                    <input
                      type="checkbox"
                      name="inAppSystemAlerts"
                      checked={formData.inAppSystemAlerts}
                      onChange={handleFormChange}
                      disabled={!editNotifications}
                    />
                    <span>System alerts</span>
                  </label>
                  <label className="checkbox-item">
                    <input
                      type="checkbox"
                      name="inAppResults"
                      checked={formData.inAppResults}
                      onChange={handleFormChange}
                      disabled={!editNotifications}
                    />
                    <span>Results published</span>
                  </label>
                </div>
              </div>

              {editNotifications && (
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ marginTop: "20px" }}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Preferences"}
                </button>
              )}
            </form>
          </div>
        )}

        {/* SECURITY TAB */}
        {activeTab === "security" && (
          <div className="tab-pane">
            <div className="section-header">
              <h2>Security & Account</h2>
            </div>

            <div className="security-content">
              <div className="account-dates">
                <p>
                  <strong>Account created:</strong>{" "}
                  {new Date(profile.createdAt).toLocaleDateString()}
                </p>
                <p>
                  <strong>Last updated:</strong>{" "}
                  {new Date(profile.updatedAt).toLocaleDateString()}
                </p>
              </div>

              <div className="password-section">
                <h3>Change Password</h3>
                {!showPasswordForm ? (
                  <button
                    className="btn-secondary"
                    onClick={() => setShowPasswordForm(true)}
                  >
                    🔑 Change Password
                  </button>
                ) : (
                  <form
                    onSubmit={handleChangePassword}
                    className="password-form"
                  >
                    <div className="form-group">
                      <label>Current Password</label>
                      <input
                        type={passwordData.showPassword ? "text" : "password"}
                        value={passwordData.oldPassword}
                        onChange={(e) =>
                          setPasswordData({
                            ...passwordData,
                            oldPassword: e.target.value,
                          })
                        }
                        placeholder="Enter current password"
                      />
                    </div>

                    <div className="form-group">
                      <label>New Password</label>
                      <input
                        type={passwordData.showPassword ? "text" : "password"}
                        value={passwordData.newPassword}
                        onChange={(e) =>
                          setPasswordData({
                            ...passwordData,
                            newPassword: e.target.value,
                          })
                        }
                        placeholder="Enter new password"
                      />
                    </div>

                    <div className="form-group">
                      <label>Confirm Password</label>
                      <input
                        type={passwordData.showPassword ? "text" : "password"}
                        value={passwordData.confirmPassword}
                        onChange={(e) =>
                          setPasswordData({
                            ...passwordData,
                            confirmPassword: e.target.value,
                          })
                        }
                        placeholder="Confirm new password"
                      />
                    </div>

                    <label className="checkbox-item">
                      <input
                        type="checkbox"
                        checked={passwordData.showPassword}
                        onChange={(e) =>
                          setPasswordData({
                            ...passwordData,
                            showPassword: e.target.checked,
                          })
                        }
                      />
                      <span>Show passwords</span>
                    </label>

                    <div className="form-actions">
                      <button
                        type="submit"
                        className="btn-primary"
                        disabled={changingPassword}
                      >
                        {changingPassword ? "Updating..." : "Update Password"}
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => setShowPasswordForm(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* EDIT EVENT MODAL */}
      {editingEvent && (
        <EditEventModal
          event={editingEvent}
          token={token}
          onClose={() => setEditingEvent(null)}
          onSuccess={fetchDashboardData}
        />
      )}

      {/* VIEW PARTICIPANTS MODAL */}
      {viewingParticipants && (
        <ViewParticipantsModal
          event={viewingParticipants}
          token={token}
          onClose={() => setViewingParticipants(null)}
        />
      )}
    </div>
  );
}
