import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import '../styles/EventDetailPage.css';

const API_BASE_URL = 'http://localhost:5000/api';

const EventDetailPage = ({ eventId, onBack, setCurrentPage }) => {
  const [event, setEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);
  const [registering, setRegistering] = useState(false);
  const { user, token } = useAuth();

  console.log('EventDetailPage - Props:', { eventId });
  console.log('EventDetailPage - Auth:', { user, token });

  useEffect(() => {
    if (!eventId) {
      setError('No event ID provided');
      setLoading(false);
      return;
    }
    if (!token) {
      setError('No authentication token - Please login');
      setLoading(false);
      return;
    }
    fetchEventDetails();
  }, [eventId, token]);

  const fetchEventDetails = async () => {
    try {
      setLoading(true);
      setError('');
      
      const url = `${API_BASE_URL}/events/${eventId}`;
      console.log('Fetching from URL:', url);
      
      const response = await axios.get(url, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Event data received:', response.data);
      const eventData = response.data.data;
      setEvent(eventData);

      // Check if user is in participants array (handle both object and string IDs)
      const isUserRegistered = eventData.participants?.some(
        participant => {
          const participantId = participant._id ? participant._id.toString() : participant.toString();
          return participantId === user._id.toString();
        }
      );

      console.log('Registration check:', {
        participants: eventData.participants,
        user_id: user._id,
        isUserRegistered: isUserRegistered
      });

      setIsRegistered(isUserRegistered);

      // Fetch participants list if user is organizer
      if (user && user._id === eventData.organizerId) {
        fetchParticipants();
      }
    } catch (err) {
      console.error('❌ Full Error:', {
        message: err.message,
        status: err.response?.status,
        statusText: err.response?.statusText,
        responseData: err.response?.data,
        url: err.config?.url,
      });
      
      if (err.response?.status === 401) {
        setError('Unauthorized - Please login again');
      } else if (err.response?.status === 404) {
        setError('Event not found');
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Failed to load event: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchParticipants = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/events/${eventId}/participants`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setParticipants(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch participants:', err);
    }
  };

  const handleRegister = async () => {
    try {
      setRegistering(true);
      const response = await axios.post(
        `${API_BASE_URL}/events/${eventId}/register`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        setIsRegistered(true);
        fetchEventDetails();
        alert('✅ Successfully registered for event!');
      }
    } catch (err) {
      alert('❌ ' + (err.response?.data?.message || 'Registration failed'));
    } finally {
      setRegistering(false);
    }
  };

  const handleUnregister = async () => {
    if (window.confirm('Are you sure you want to unregister?')) {
      try {
        setRegistering(true);
        const response = await axios.delete(
          `${API_BASE_URL}/events/${eventId}/register`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        if (response.data.success) {
          setIsRegistered(false);
          fetchEventDetails();
          alert('✅ Successfully unregistered!');
        }
      } catch (err) {
        alert('❌ ' + (err.response?.data?.message || 'Unregistration failed'));
      } finally {
        setRegistering(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="event-detail-container">
        <p className="loading">⏳ Loading event details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="event-detail-container">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <p className="error">⚠️ {error}</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="event-detail-container">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <p>❌ Event not found</p>
      </div>
    );
  }

  const isOrganizer = user && user._id === event.organizerId;
  
  console.log('Debug isOrganizer:', {
    user_id: user?._id,
    event_organizerId: event?.organizerId,
    isOrganizer: isOrganizer,
    isRegistered: isRegistered
  });

  const eventDate = new Date(event.dates?.startDate || new Date());

  return (
    <div className="event-detail-container">
      <button className="back-btn" onClick={onBack}>← Back to Events</button>

      <div className="event-detail-header">
        <div>
          <h1>{event.title}</h1>
          <p className="category-badge">{event.category}</p>
        </div>
      </div>

      <div className="event-detail-content">
        <div className="event-info">
          <div className="detail-section">
            <h3>📅 Date & Time</h3>
            <p>{eventDate.toDateString()}</p>
            <p className="time">{eventDate.toLocaleTimeString()}</p>
          </div>

          <div className="detail-section">
            <h3>📍 Location</h3>
            <p>{event.venue?.name || event.location || 'Not specified'}</p>
          </div>

          <div className="detail-section">
            <h3>📝 Description</h3>
            <p>{event.description}</p>
          </div>

          <div className="detail-section">
            <h3>👤 Organizer</h3>
            <p>
                {event.organizerId?.profile?.fullName || 
                     event.organizerId?.username || 
                            'Organization'}
            </p>
          </div>

          <div className="registration-section">
            <div className="participant-count">
              <strong>Participants:</strong> <span className="count">{event.participants?.length || 0}</span>
            </div>

            {user ? (
              <div className="register-actions">
                {isOrganizer ? (
                  <>
                    <button className="btn btn-edit" onClick={() => alert('✏️ Edit Event - Coming Soon!')}>
                      ✏️ Edit Event
                    </button>
                    <button className="btn btn-danger" onClick={() => alert('🗑️ Delete Event - Coming Soon!')}>
                      🗑️ Delete Event
                    </button>
                  </>
                ) : isRegistered ? (
                  <button className="btn btn-danger" onClick={handleUnregister} disabled={registering}>
                    {registering ? 'Unregistering...' : '❌ Unregister'}
                  </button>
                ) : (
                  <button className="btn btn-primary" onClick={handleRegister} disabled={registering}>
                    {registering ? 'Registering...' : '✅ Register'}
                  </button>
                )}
              </div>
            ) : (
              <p className="login-prompt">Please login to register</p>
            )}
          </div>
        </div>

        {isOrganizer && (
          <div className="participants-list">
            <h3>👥 Participants ({participants.length})</h3>
            {participants.length > 0 ? (
              <div className="participants-grid">
                {participants.map(p => (
                  <div key={p._id} className="participant-card">
                    <p className="participant-name">{p.name}</p>
                    <p className="participant-email">{p.email}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-participants">No participants yet</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventDetailPage;
