import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import "../styles/EventDetailPage.css";
import DiscussionPanel from "../components/DiscussionPanel";

const API_BASE_URL = "http://localhost:5000/api";

export default function EventDetailPage({ eventId, onBack }) {
  const { user, token } = useAuth();
  const [event, setEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState("");
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    if (!eventId) {
      setError("No event ID provided");
      setLoading(false);
      return;
    }
    fetchEventDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, token]);

  const fetchEventDetails = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await axios.get(`${API_BASE_URL}/events/${eventId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const eventData = res.data.data || res.data;
      setEvent(eventData);

      // Determine registration status (participants array may contain ids or objects)
      const isUserReg = Array.isArray(eventData.participants)
        ? eventData.participants.some((p) => {
            const id = p?._id ? p._id.toString() : (p?.toString ? p.toString() : null);
            return user && id === user._id.toString();
          })
        : false;
      setIsRegistered(!!isUserReg);

      // If current user is organizer -> fetch full participants
      const organizerId = eventData.organizerId?._id || eventData.organizerId;
      if (user && organizerId && organizerId.toString() === user._id.toString()) {
        fetchParticipants();
      } else {
        setParticipants([]); // ensure no detailed list visible to non-organizer
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load event");
    } finally {
      setLoading(false);
    }
  };

  const fetchParticipants = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/events/${eventId}/participants`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const parts = res.data?.allParticipants || res.data?.participants || res.data;
      setParticipants(Array.isArray(parts) ? parts : []);
    } catch (err) {
      console.error("Error fetching participants:", err);
      setParticipants([]);
    }
  };

  const getParticipantCount = (ev) => {
    if (!ev) return 0;
    if (ev.registrationType === "individual") {
      return ev.participants?.length || 0;
    }
    if (Array.isArray(ev.teamRegistrations) && ev.teamRegistrations.length > 0) {
      return ev.teamRegistrations.reduce((sum, t) => sum + (t.members?.length || 0), 0);
    }
    return ev.participants?.length || 0;
  };

  const handleRegister = async () => {
    if (!token) return alert("Please login to register");

    if (event.isPaid && event.fee > 0) {
      if (!window.confirm(`This is a paid event. Fee: ₹${event.fee}. Proceed to mock payment?`)) return;
    }

    try {
      setRegistering(true);
      const res = await axios.post(
        `${API_BASE_URL}/events/${eventId}/register`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data?.success || res.status === 200) {
        setIsRegistered(true);
        alert("✅ Registered successfully!");
        fetchEventDetails();
      }
    } catch (err) {
      alert("❌ " + (err.response?.data?.message || "Registration failed"));
    } finally {
      setRegistering(false);
    }
  };

  const handleUnregister = async () => {
    if (!window.confirm("Unregister from this event?")) return;

    try {
      setRegistering(true);
      const res = await axios.post(
        `${API_BASE_URL}/events/${eventId}/unregister`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data?.success || res.status === 200) {
        setIsRegistered(false);
        alert("✅ Unregistered successfully!");
        fetchEventDetails();
      }
    } catch (err) {
      alert("❌ " + (err.response?.data?.message || "Unregistration failed"));
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className="detail-page-wrapper">
        <div className="detail-nav">
          <button className="back-link" onClick={onBack}>← Back to Events</button>
        </div>
        <div className="detail-loading">Loading...</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="detail-page-wrapper">
        <div className="detail-nav">
          <button className="back-link" onClick={onBack}>← Back to Events</button>
        </div>
        <div className="detail-error">{error}</div>
      </div>
    );
  }
  if (!event) return null;

  const eventDate = new Date(event.dates?.startDate || Date.now());
  const isOrganizer = user && ((event.organizerId?._id || event.organizerId)?.toString() === user._id.toString());
  const participantsCount = getParticipantCount(event);

  return (
    <div className="detail-page-wrapper">
      <div className="detail-nav">
        <button className="back-link" onClick={onBack}>← Back to Events</button>
      </div>

      {/* Two-column layout: left = main content, right = sidebar */}
      <div className="detail-layout">
        {/* LEFT: Main content */}
        <div className="main-content">
          {/* Header card */}
          <div className="content-card header-card">
            <div className="badges">
              <div className="badge-cat">HACKATHON</div>
              <div className="badge-type">INDIVIDUAL</div>
            </div>
            <h2 className="event-title">{event.title}</h2>
            <div className="organizer-info">
              Organized by <strong>{event.organizerId?.profile?.fullName || event.organizerId?.username}</strong>
            </div>
          </div>

          {/* About card */}
          <div className="content-card">
            <h3>About Event</h3>
            <div className="description-text">{event.description || "No description provided."}</div>
          </div>

          {/* Schedule & Venue */}
          <div className="content-card">
            <h3>Schedule & Venue</h3>
            <div className="info-grid-compact">
              <div className="info-box">
                <div className="label">Start Date</div>
                <div className="val">{eventDate.toLocaleString()}</div>
              </div>
              <div className="info-box">
                <div className="label">End Date</div>
                <div className="val">{event.dates?.endDate ? new Date(event.dates.endDate).toLocaleDateString() : "-"}</div>
              </div>

              <div className="info-box">
                <div className="label">Venue</div>
                <div className="val">{event.venue?.name || event.venue?.location || "TBD"}</div>
              </div>
              <div className="info-box">
                <div className="label">Location</div>
                <div className="val">{event.venue?.location || "TBD"}</div>
              </div>
            </div>
          </div>

          {/* Discussion area: fills left bottom area */}
          <div className="discussion-area">
            <h3 className="content-card" style={{ marginBottom: 12 }}>Discussion Board</h3>
            {/* The DiscussionPanel component will fully expand inside .discussion-area */}
            <DiscussionPanel eventId={eventId} />
          </div>
        </div>

        {/* RIGHT: Sidebar */}
        <aside className="sidebar">
          {/* Poster */}
          <div className="sidebar-card poster-card">
            {event.poster ? (
              <img className="sidebar-poster-img" src={event.poster} alt={event.title} />
            ) : (
              <div className="no-poster">No Poster</div>
            )}
          </div>

          {/* Registration / Fee card */}
          <div className="sidebar-card action-card">
            <div className="fee-row">
              <div className="label">Registration Fee</div>
              <div className={`fee-val ${event.isPaid ? 'paid' : 'free'}`}>{event.isPaid ? `₹${event.fee}` : 'Free'}</div>
            </div>

            <div className="reg-progress">
              <div className="flex-between">
                <div>Registrations</div>
                <div>{participantsCount}{event.maxParticipants ? ` / ${event.maxParticipants}` : ''}</div>
              </div>
              <div className="progress-bar">
                <div className="fill" style={{ width: `${Math.min(100, event.maxParticipants ? (participantsCount / event.maxParticipants) * 100 : 0)}%` }} />
              </div>
            </div>

            {user ? (
              isOrganizer ? (
                <div className="organizer-badge">✓ You are organizing this</div>
              ) : isRegistered ? (
                <button className="btn-action btn-danger" onClick={handleUnregister} disabled={registering}>
                  {registering ? 'Processing...' : 'Unregister'}
                </button>
              ) : (
                <button className="btn-action btn-primary" onClick={handleRegister} disabled={registering}>
                  {registering ? 'Processing...' : (event.isPaid ? `Pay ₹${event.fee} & Register` : 'Register Now')}
                </button>
              )
            ) : (
              <div className="login-hint">Please login to register</div>
            )}
          </div>

          {/* Prizes card */}
          {event.prizes && event.prizes.length > 0 && (
            <div className="sidebar-card extra-card">
              <h4>🏆 Prizes</h4>
              <ul className="prize-list">
                {event.prizes.map((p, i) => (
                  <li key={i}><span className="medal">#{i + 1}</span> {p.prize || p}</li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
