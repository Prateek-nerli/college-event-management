import { useState } from 'react';
import { eventAPI } from '../services/api';
import '../styles/CreateEventPage.css';

export default function CreateEventPage({ setCurrentPage }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'hackathon',
    venueName: '',
    venueLocation: '',
    venueCapacity: '100',
    startDate: '',
    endDate: '',
    registrationDeadline: '',
    maxParticipants: '100',
    registrationType: 'individual',
    teamMin: '2',
    teamMax: '4',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validation
      if (!formData.title || !formData.description || !formData.startDate || !formData.endDate) {
        setError('Title, description, start date and end date are required');
        setLoading(false);
        return;
      }

      // Build event data
      const eventData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        registrationType: formData.registrationType,
        maxParticipants: parseInt(formData.maxParticipants) || 100,
        
        // Dates
        startDate: formData.startDate,
        endDate: formData.endDate,
        registrationDeadline: formData.registrationDeadline || formData.endDate,
        
        // Venue
        location: formData.venueLocation || 'TBD',
        
        // Team size (if team registration)
        teamSize:
          formData.registrationType === 'team'
            ? {
                min: parseInt(formData.teamMin) || 2,
                max: parseInt(formData.teamMax) || 4,
              }
            : { min: 1, max: 1 },
      };

      console.log('📤 Sending event data:', eventData);

      const response = await eventAPI.createEvent(eventData);
      
      console.log('✅ Event created:', response.data);

      alert('✅ Event created successfully!');
      setCurrentPage('events');
    } catch (err) {
      console.error('❌ Error response:', err.response?.data);
      console.error('❌ Error message:', err.message);
      
      setError(
        err.response?.data?.message || 
        err.response?.data?.error ||
        'Failed to create event'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-event-page">
      <div className="create-event-header">
        <h1>🎯 Create New Event</h1>
        <button className="btn-secondary" onClick={() => setCurrentPage('events')}>
          ← Back to Events
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form className="create-event-form" onSubmit={handleSubmit}>
        {/* Basic details */}
        <div className="form-row">
          <div className="form-group">
            <label>Event Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter event title"
              required
            />
          </div>
          <div className="form-group">
            <label>Category *</label>
            <select name="category" value={formData.category} onChange={handleChange} required>
              <option value="hackathon">Hackathon</option>
              <option value="cultural">Cultural</option>
              <option value="workshop">Workshop</option>
              <option value="sports">Sports</option>
              <option value="technical">Technical</option>
              <option value="competition">Competition</option>
              <option value="seminar">Seminar</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Description *</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe the event..."
              required
            />
          </div>
        </div>

        {/* Venue */}
        <div className="form-row">
          <div className="form-group">
            <label>Venue Name</label>
            <input
              type="text"
              name="venueName"
              value={formData.venueName}
              onChange={handleChange}
              placeholder="e.g., Seminar Hall"
            />
          </div>
          <div className="form-group">
            <label>Venue Location</label>
            <input
              type="text"
              name="venueLocation"
              value={formData.venueLocation}
              onChange={handleChange}
              placeholder="e.g., Block A, 2nd Floor"
            />
          </div>
          <div className="form-group">
            <label>Venue Capacity</label>
            <input
              type="number"
              name="venueCapacity"
              value={formData.venueCapacity}
              onChange={handleChange}
              min="1"
            />
          </div>
        </div>

        {/* Dates */}
        <div className="form-row">
          <div className="form-group">
            <label>Start Date & Time *</label>
            <input
              type="datetime-local"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>End Date & Time *</label>
            <input
              type="datetime-local"
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Registration Deadline</label>
            <input
              type="datetime-local"
              name="registrationDeadline"
              value={formData.registrationDeadline}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Max Participants</label>
            <input
              type="number"
              name="maxParticipants"
              value={formData.maxParticipants}
              onChange={handleChange}
              min="1"
            />
          </div>
        </div>

        {/* Registration type */}
        <div className="form-row">
          <div className="form-group">
            <label>Registration Type *</label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="registrationType"
                  value="individual"
                  checked={formData.registrationType === 'individual'}
                  onChange={handleChange}
                />
                <span>👤 Individual</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="registrationType"
                  value="team"
                  checked={formData.registrationType === 'team'}
                  onChange={handleChange}
                />
                <span>👥 Team</span>
              </label>
            </div>
          </div>

          {formData.registrationType === 'team' && (
            <div className="form-group">
              <label>Team Size (min - max)</label>
              <div className="team-size-row">
                <input
                  type="number"
                  name="teamMin"
                  value={formData.teamMin}
                  onChange={handleChange}
                  min="1"
                />
                <span className="team-size-separator">to</span>
                <input
                  type="number"
                  name="teamMax"
                  value={formData.teamMax}
                  onChange={handleChange}
                  min={formData.teamMin || 1}
                />
              </div>
            </div>
          )}
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? '⏳ Creating...' : '✓ Create Event'}
          </button>
        </div>
      </form>
    </div>
  );
}
