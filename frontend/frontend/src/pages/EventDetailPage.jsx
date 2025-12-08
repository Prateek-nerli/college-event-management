
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import '../styles/EventDetailPage.css';

const API_BASE_URL = 'http://localhost:5000/api';

export default function EventDetailPage({ eventId, onBack }) {
  const { user, token } = useAuth();
  const [event, setEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    if (!eventId) {
      setError('No event ID provided');
      setLoading(false);
      return;
    }
    fetchEventDetails();
  }, [eventId, token]);

  const fetchEventDetails = async () => {
    try {
      setLoading(true);
      setError('');

      const res = await axios.get(`${API_BASE_URL}/events/${eventId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const eventData = res.data.data;
      setEvent(eventData);

      const isUserReg = eventData.participants?.some((p) => {
        const id = p?._id ? p._id.toString() : p.toString();
        return user && id === user._id.toString();
      });
      setIsRegistered(!!isUserReg);

      if (user && eventData.organizerId?.toString?.() === user._id.toString()) {
        fetchParticipants();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load event');
    } finally {
      setLoading(false);
    }
  };

  const fetchParticipants = async () => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/events/${eventId}/participants`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setParticipants(res.data.participants || []);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const getParticipantCount = (ev) => {
    if (!ev) return 0;
    if (ev.registrationType === 'individual') {
      return ev.participants?.length || 0;
    }
    return (
      ev.teamRegistrations?.reduce(
        (total, reg) => total + (reg.members?.length || 0),
        0
      ) || 0
    );
  };

  const handleRegister = async () => {
    if (!token) {
      alert('Please login to register');
      return;
    }
    try {
      setRegistering(true);
      const res = await axios.post(
        `${API_BASE_URL}/events/${eventId}/register`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        setIsRegistered(true);
        await fetchEventDetails();
        alert('✅ Registered successfully!');
      }
    } catch (err) {
      alert('❌ ' + (err.response?.data?.message || 'Registration failed'));
    } finally {
      setRegistering(false);
    }
  };

  const handleUnregister = async () => {
    if (!token) {
      alert('Please login first');
      return;
    }
    if (!window.confirm('Unregister from this event?')) return;
    try {
      setRegistering(true);
      const res = await axios.post(
        `${API_BASE_URL}/events/${eventId}/unregister`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        setIsRegistered(false);
        await fetchEventDetails();
        alert('✅ Unregistered successfully!');
      }
    } catch (err) {
      alert('❌ ' + (err.response?.data?.message || 'Unregistration failed'));
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className="detail-container">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="detail-container">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <div className="error">{error}</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="detail-container">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <div className="error">Event not found</div>
      </div>
    );
  }

  const eventDate = new Date(event.dates?.startDate || new Date());
  const isOrganizer = user && (event.organizerId?._id || event.organizerId)?.toString() === user._id.toString();
  const participantsCount = getParticipantCount(event);

  return (
    <div className="detail-container">
      <button className="back-btn" onClick={onBack}>← Back</button>

      <div className="detail-content">
        <div className="detail-header">
          <h1>{event.title}</h1>
          <p className="category-badge">{event.category}</p>
          <p className="type-badge">
            {event.registrationType === 'individual' ? '👤 Individual Event' : '👥 Team Event'}
          </p>
        </div>

        <div className="detail-info">
          <div className="info-row">
            <span className="info-label">📅 Date & Time:</span>
            <span>{eventDate.toLocaleString()}</span>
          </div>
          <div className="info-row">
            <span className="info-label">📍 Location:</span>
            <span>{event.venue?.location || event.venue?.name || 'Not specified'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">👤 Organizer:</span>
            <span>{event.organizerId?.profile?.fullName || event.organizerId?.username || 'Organization'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">👥 Participants:</span>
            <span>{participantsCount} {event.maxParticipants ? `/ ${event.maxParticipants}` : ''}</span>
          </div>
        </div>

        <div className="detail-description">
          <h2>About</h2>
          <p>{event.description}</p>
        </div>

        <div className="detail-actions">
          {user ? (
            <>
              {isOrganizer ? (
                <p className="organizer-notice">✓ You are organizing this event</p>
              ) : isRegistered ? (
                <button 
                  className="btn btn-unregister"
                  onClick={handleUnregister}
                  disabled={registering}
                >
                  {registering ? 'Unregistering...' : 'Unregister'}
                </button>
              ) : (
                <button 
                  className="btn btn-register"
                  onClick={handleRegister}
                  disabled={registering}
                >
                  {registering ? 'Registering...' : 'Register'}
                </button>
              )}
            </>
          ) : (
            <p className="login-notice">Please login to register</p>
          )}
        </div>

        {isOrganizer && participants.length > 0 && (
          <div className="participants-section">
            <h2>Registered Participants ({participants.length})</h2>
            <div className="participants-list">
              {participants.map((p) => (
                <div key={p._id} className="participant-item">
                  <div>
                    <p className="participant-name">
                      {p.profile?.fullName || p.username || p.name}
                    </p>
                    <p className="participant-email">{p.email}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}