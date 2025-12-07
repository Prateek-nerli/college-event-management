import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import '../styles/DashboardPage.css';

const API_BASE_URL = 'http://localhost:5000/api';

export default function DashboardPage({ onSelectEvent, setCurrentPage }) {
  const [registeredEvents, setRegisteredEvents] = useState([]);
  const [createdEvents, setCreatedEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('registered');
  const { user, token } = useAuth();

  console.log('DashboardPage - User:', user);

  useEffect(() => {
    if (!user || !token) {
      setError('Please login to view dashboard');
      setLoading(false);
      return;
    }
    fetchDashboardData();
  }, [user, token]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
  
      // Fetch all events
      const response = await axios.get(`${API_BASE_URL}/events`, {
        headers: { Authorization: `Bearer ${token}` }
      });
  
      const allEvents = response.data.data || [];
      console.log('All events from API:', allEvents); // Debug
  
      // Separate registered and created events
      // Separate registered and created events
const registered = allEvents.filter(event => {
  const isRegistered = event.participants?.some(
    participant => {
      const participantId = participant._id ? participant._id.toString() : participant.toString();
      return participantId === user._id.toString();
    }
  );
  console.log(`Event "${event.title}" - Registered:`, isRegistered);
  return isRegistered;
});

      const created = allEvents.filter(event => {
        console.log('Checking event:', {
          eventId: event._id,
          eventOrganizerId: event.organizerId,
          userId: user._id,
          match: event.organizerId === user._id
        });
        return event.organizerId === user._id;
      });
      
  
      console.log('Registered events:', registered);
      console.log('Created events:', created);
  
      setRegisteredEvents(registered);
      setCreatedEvents(created);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  

  const handleUnregister = async (eventId) => {
    if (window.confirm('Are you sure you want to unregister?')) {
      try {
        const response = await axios.delete(
          `${API_BASE_URL}/events/${eventId}/register`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.data.success) {
          alert('✅ Unregistered successfully');
          fetchDashboardData();
        }
      } catch (err) {
        alert('❌ ' + (err.response?.data?.message || 'Unregister failed'));
      }
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        const response = await axios.delete(
          `${API_BASE_URL}/events/${eventId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.data.success) {
          alert('✅ Event deleted successfully');
          fetchDashboardData();
        }
      } catch (err) {
        alert('❌ ' + (err.response?.data?.message || 'Delete failed'));
      }
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>📊 My Dashboard</h1>
        <p className="subtitle">Welcome, {user?.name}! 👋</p>
      </div>

      {error && (
        <div className="error-message">
          <p>⚠️ {error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="dashboard-tabs">
        <button
          className={`tab-btn ${activeTab === 'registered' ? 'active' : ''}`}
          onClick={() => setActiveTab('registered')}
        >
          📝 Registered Events ({registeredEvents.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'created' ? 'active' : ''}`}
          onClick={() => setActiveTab('created')}
        >
          🎯 My Events ({createdEvents.length})
        </button>
      </div>

      {/* Registered Events Tab */}
      {activeTab === 'registered' && (
        <div className="tab-content">
          {registeredEvents.length === 0 ? (
            <div className="empty-state">
              <p className="empty-icon">📭</p>
              <p className="empty-title">No Registered Events</p>
              <p className="empty-desc">You haven't registered for any events yet</p>
              <button
                className="btn-browse"
                onClick={() => setCurrentPage('events')}
              >
                Browse Events →
              </button>
            </div>
          ) : (
            <div className="events-list">
              {registeredEvents.map(event => {
                const eventDate = new Date(event.eventDate || event.dates?.startDate);
                return (
                  <div key={event._id} className="event-item">
                    <div className="event-item-left">
                      <h3>{event.title}</h3>
                      <p className="event-category">{event.category}</p>
                      <p className="event-desc">{event.description.substring(0, 80)}...</p>

                      <div className="event-meta">
                        <span>📅 {eventDate.toLocaleDateString()}</span>
                        <span>📍 {event.venue?.name || 'TBA'}</span>
                        <span>👥 {event.participants?.length} registered</span>
                      </div>
                    </div>

                    <div className="event-item-actions">
                      <button
                        className="btn btn-view"
                        onClick={() => onSelectEvent(event._id)}
                      >
                        View Details
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => handleUnregister(event._id)}
                      >
                        Unregister
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Created Events Tab */}
      {activeTab === 'created' && (
        <div className="tab-content">
          {createdEvents.length === 0 ? (
            <div className="empty-state">
              <p className="empty-icon">🎪</p>
              <p className="empty-title">No Created Events</p>
              <p className="empty-desc">You haven't created any events yet</p>
              <button
                className="btn-create"
                onClick={() => setCurrentPage('create')}
              >
                Create Event →
              </button>
            </div>
          ) : (
            <div className="events-list">
             {createdEvents.map(event => {
  // Use dates.startDate instead of eventDate
  const eventDate = new Date(event.dates?.startDate || new Date());
  
  return (
    <div key={event._id} className="event-item">
      <div className="event-item-left">
        <h3>{event.title}</h3>
        <p className="event-category">{event.category}</p>
        <p className="event-desc">{event.description?.substring(0, 80)}...</p>

        <div className="event-meta">
          <span>📅 {eventDate.toLocaleDateString('en-IN')}</span>
          <span>📍 {event.venue?.name || 'TBA'}</span>
          <span>👥 {event.participants?.length || 0} registered</span>
        </div>

        <div className="event-stats">
          <div className="stat">
            <span className="stat-label">Registrations</span>
            <span className="stat-value">{event.participants?.length || 0}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Status</span>
            <span className="stat-value active">{event.status || 'Active'}</span>
          </div>
        </div>
      </div>

      <div className="event-item-actions">
        <button
          className="btn btn-view"
          onClick={() => onSelectEvent(event._id)}
        >
          View
        </button>
        <button
          className="btn btn-edit"
          onClick={() => alert('Edit coming soon!')}
        >
          Edit
        </button>
        <button
          className="btn btn-danger"
          onClick={() => handleDeleteEvent(event._id)}
        >
          Delete
        </button>
      </div>
    </div>
  );


              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
