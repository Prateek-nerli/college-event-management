// src/pages/EventsPage.jsx
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import '../styles/EventsPage.css';

const API_BASE_URL = 'http://localhost:5000/api';

export default function EventsPage({ onSelectEvent }) {
  const { user, token } = useAuth();
  const [allEvents, setAllEvents] = useState([]);
  const [myEvents, setMyEvents] = useState([]);
  const [myTeams, setMyTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [registrationError, setRegistrationError] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    if (!token) return;
    fetchAllEvents();
    fetchMyEvents();
    fetchMyTeams();
  }, [token]);

  useEffect(() => {
    if (allEvents.length > 0) {
      const uniqueCategories = [
        ...new Set(allEvents.map((e) => e.category).filter(Boolean)),
      ];
      setCategories(uniqueCategories);
    }
  }, [allEvents]);

  const fetchAllEvents = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/events`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAllEvents(res.data.data || []);
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to load events');
    }
  };

  const fetchMyEvents = async () => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/events/my-events/registered`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMyEvents(res.data.data || []);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const fetchMyTeams = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/teams/my-teams`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMyTeams(res.data.data || []);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleRegisterIndividual = async (eventId) => {
    try {
      setLoading(true);
      const res = await axios.post(
        `${API_BASE_URL}/events/${eventId}/register`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAllEvents((prev) =>
        prev.map((e) => (e._id === eventId ? res.data.data : e))
      );
      setMyEvents((prev) => [...prev, res.data.data]);
      setRegistrationError('');
      alert('✅ Registered successfully!');
    } catch (err) {
      setRegistrationError(
        err.response?.data?.message || 'Failed to register'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterTeam = async (eventId, teamId) => {
    try {
      setLoading(true);
      const res = await axios.post(
        `${API_BASE_URL}/events/${eventId}/register-team`,
        { teamId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAllEvents((prev) =>
        prev.map((e) => (e._id === eventId ? res.data.data : e))
      );
      await fetchMyEvents();
      setRegistrationError('');
      setSelectedEventId(null);
      alert('✅ Team registered successfully!');
    } catch (err) {
      setRegistrationError(
        err.response?.data?.message || 'Failed to register team'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUnregister = async (eventId) => {
    try {
      setLoading(true);
      const res = await axios.post(
        `${API_BASE_URL}/events/${eventId}/unregister`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAllEvents((prev) =>
        prev.map((e) => (e._id === eventId ? res.data.data : e))
      );
      setMyEvents((prev) => prev.filter((e) => e._id !== eventId));
      alert('✅ Unregistered successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to unregister');
    } finally {
      setLoading(false);
    }
  };

  const isUserRegistered = (event) =>
    myEvents.some((e) => e._id === event._id);

  const getFilteredEvents = (events) =>
    events.filter((event) => {
      const categoryMatch =
        filterCategory === 'all' || event.category === filterCategory;
      const typeMatch =
        filterType === 'all' || event.registrationType === filterType;
      return categoryMatch && typeMatch;
    });

  const renderEventCard = (event) => {
    const registered = isUserRegistered(event);
    const eventDate = new Date(event.dates?.startDate);
    const dateStr = eventDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    const timeStr = eventDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <div
        key={event._id}
        className="event-card"
        onClick={() => onSelectEvent(event._id)}
      >
        <div className="card-top">
          <div>
            <h3>{event.title}</h3>
            <p className="category">{event.category}</p>
          </div>
          <span className={`badge ${event.registrationType}`}>
            {event.registrationType === 'individual' ? '👤' : '👥'}
          </span>
        </div>

        <p className="description">
          {event.description
            ? event.description.length > 120
              ? event.description.substring(0, 120) + '...'
              : event.description
            : ''}
        </p>

        <div className="card-meta">
          <span>📍 {event.venue?.location || 'TBD'}</span>
          <span>
            📅 {dateStr} · {timeStr}
          </span>
        </div>

        <div className="card-footer" onClick={(e) => e.stopPropagation()}>
          {registered ? (
            <button
              className="btn btn-unregister"
              onClick={() => handleUnregister(event._id)}
              disabled={loading}
            >
              Unregister
            </button>
          ) : event.registrationType === 'individual' ? (
            <button
              className="btn btn-register"
              onClick={() => handleRegisterIndividual(event._id)}
              disabled={loading}
            >
              Register
            </button>
          ) : (
            <div className="dropdown">
              <button
                className="btn btn-register"
                onClick={() =>
                  setSelectedEventId(
                    selectedEventId === event._id ? null : event._id
                  )
                }
              >
                Register Team
              </button>
              {selectedEventId === event._id && (
                <div className="dropdown-menu">
                  {myTeams.filter((t) => t.leader._id === user._id).length ===
                  0 ? (
                    <p className="dropdown-empty">No teams where you are leader</p>
                  ) : (
                    myTeams
                      .filter((t) => t.leader._id === user._id)
                      .map((team) => (
                        <button
                          key={team._id}
                          className="dropdown-item"
                          onClick={() =>
                            handleRegisterTeam(event._id, team._id)
                          }
                          disabled={loading}
                        >
                          {team.name} (
                          {team.members?.filter(
                            (m) => m.status === 'accepted'
                          ).length || 0}{' '}
                          members)
                        </button>
                      ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const eventsToDisplay =
    activeTab === 'all'
      ? getFilteredEvents(allEvents)
      : getFilteredEvents(myEvents);

  return (
    <div className="events-container">
     
      <div className="events-controls">
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All Events ({allEvents.length})
          </button>
          <button
            className={`tab ${activeTab === 'my' ? 'active' : ''}`}
            onClick={() => setActiveTab('my')}
          >
            My Events ({myEvents.length})
          </button>
        </div>

        {activeTab === 'all' && (
          <div className="filters">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="filter-input"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="filter-input"
            >
              <option value="all">All Types</option>
              <option value="individual">Individual</option>
              <option value="team">Team</option>
            </select>
          </div>
        )}
      </div>

      {error && <div className="alert error">{error}</div>}
      {registrationError && (
        <div className="alert error">{registrationError}</div>
      )}

      <div className="events-grid">
        {eventsToDisplay.length === 0 ? (
          <div className="empty">
            <p>No events found</p>
          </div>
        ) : (
          eventsToDisplay.map((event) => renderEventCard(event))
        )}
      </div>
    </div>
  );
}
