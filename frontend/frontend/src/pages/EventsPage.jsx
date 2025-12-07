import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import '../styles/EventsPage.css';

const API_BASE_URL = 'http://localhost:5000/api';

export default function EventPage() {
  const { user, token } = useAuth();
  const [allEvents, setAllEvents] = useState([]);
  const [myEvents, setMyEvents] = useState([]);
  const [myTeams, setMyTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [registrationError, setRegistrationError] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' or 'my'

  useEffect(() => {
    fetchAllEvents();
    fetchMyEvents();
    fetchMyTeams();
  }, [token]);

  const fetchAllEvents = async () => {
    try {
      console.log('📥 Fetching all events...');
      const res = await axios.get(`${API_BASE_URL}/events`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('✅ All events:', res.data.data);
      setAllEvents(res.data.data);
    } catch (err) {
      console.error('❌ Error fetching events:', err);
      setError('Failed to load events');
    }
  };

  const fetchMyEvents = async () => {
    try {
      console.log('📥 Fetching my registered events...');
      const res = await axios.get(`${API_BASE_URL}/events/my-events/registered`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('✅ My events:', res.data.data);
      setMyEvents(res.data.data);
    } catch (err) {
      console.error('❌ Error fetching my events:', err);
    }
  };

  const fetchMyTeams = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/teams/my-teams`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMyTeams(res.data.data);
    } catch (err) {
      console.error('❌ Error fetching teams:', err);
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

      setAllEvents(allEvents.map((e) => (e._id === eventId ? res.data.data : e)));
      setMyEvents([...myEvents, res.data.data]);
      setRegistrationError('');
      alert('✅ Registered successfully!');
    } catch (err) {
      setRegistrationError(err.response?.data?.message || 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterTeam = async (eventId, teamId) => {
    try {
      setLoading(true);
      console.log('📤 Team registration:', eventId, teamId);

      const res = await axios.post(
        `${API_BASE_URL}/events/${eventId}/register-team`,
        { teamId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('✅ Response:', res.data);
      
      setAllEvents(allEvents.map((e) => (e._id === eventId ? res.data.data : e)));
      
      // Refresh my events
      await fetchMyEvents();
      
      setRegistrationError('');
      setSelectedEventId(null);
      alert('✅ Team registered successfully!');
    } catch (err) {
      console.error('❌ Error:', err.response?.data);
      setRegistrationError(err.response?.data?.message || 'Failed to register team');
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

      setAllEvents(allEvents.map((e) => (e._id === eventId ? res.data.data : e)));
      setMyEvents(myEvents.filter((e) => e._id !== eventId));
      alert('✅ Unregistered successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to unregister');
    } finally {
      setLoading(false);
    }
  };

  const isUserRegistered = (event) => {
    return myEvents.some((e) => e._id === event._id);
  };

  const getParticipantCount = (event) => {
    if (event.registrationType === 'individual') {
      return event.participants?.length || 0;
    } else {
      return (
        event.teamRegistrations?.reduce(
          (total, reg) => total + (reg.members?.length || 0),
          0
        ) || 0
      );
    }
  };

  const renderEventCard = (event) => {
    const isRegistered = isUserRegistered(event);

    return (
      <div key={event._id} className="event-card">
        <div className="event-header-card">
          <div>
            <h3>{event.title}</h3>
            <span className="event-type-badge">
              {event.registrationType === 'individual' ? '👤 Individual' : '👥 Team'}
            </span>
          </div>
          {event.organizerId?._id === user._id && (
            <span className="badge-organizer">Organizer</span>
          )}
        </div>

        <p className="event-desc">{event.description}</p>

        <div className="event-info">
          <div>
            <span className="label">📍 Location:</span>
            <span>{event.venue?.location || 'TBD'}</span>
          </div>
          <div>
            <span className="label">📅 Start:</span>
            <span>{new Date(event.dates?.startDate).toLocaleString()}</span>
          </div>
        </div>

        <div className="event-stats">
          <div className="stat">
            <span className="stat-label">Participants</span>
            <span className="stat-value">
              {getParticipantCount(event)}
              {event.maxParticipants ? `/${event.maxParticipants}` : ''}
            </span>
          </div>
        </div>

        <div className="event-action">
          {isRegistered ? (
            <button
              className="btn-secondary"
              onClick={() => handleUnregister(event._id)}
              disabled={loading}
            >
              ✕ Unregister
            </button>
          ) : event.registrationType === 'individual' ? (
            <button
              className="btn-primary"
              onClick={() => handleRegisterIndividual(event._id)}
              disabled={loading}
            >
              ✓ Register
            </button>
          ) : (
            <div className="team-register-dropdown">
              <button
                className="btn-primary"
                onClick={() =>
                  setSelectedEventId(selectedEventId === event._id ? null : event._id)
                }
              >
                👥 Register Team
              </button>

              {selectedEventId === event._id && (
                <div className="team-dropdown">
                  {myTeams.filter((t) => t.leader._id === user._id).length === 0 ? (
                    <p className="no-teams">You don't lead any teams</p>
                  ) : (
                    myTeams
                      .filter((t) => t.leader._id === user._id)
                      .map((team) => (
                        <button
                          key={team._id}
                          className="team-option"
                          onClick={() => handleRegisterTeam(event._id, team._id)}
                          disabled={loading}
                        >
                          <span>{team.name}</span>
                          <span className="member-count">
                            {team.members?.filter((m) => m.status === 'accepted').length || 0}{' '}
                            members
                          </span>
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

  return (
    <div className="event-page">
      <div className="event-header">
        <h1>📅 Events</h1>
        <div className="event-tabs">
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
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {registrationError && <div className="alert alert-error">{registrationError}</div>}

      <div className="events-grid">
        {activeTab === 'all' ? (
          allEvents.length === 0 ? (
            <div className="empty-message">No events available.</div>
          ) : (
            allEvents.map((event) => renderEventCard(event))
          )
        ) : (
          myEvents.length === 0 ? (
            <div className="empty-message">You haven't registered for any events yet.</div>
          ) : (
            myEvents.map((event) => renderEventCard(event))
          )
        )}
      </div>
    </div>
  );
}
