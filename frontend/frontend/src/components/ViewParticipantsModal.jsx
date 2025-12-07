import { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/ViewParticipantsModal.css';

const API_BASE_URL = 'http://localhost:5000/api';

export default function ViewParticipantsModal({ event, token, onClose }) {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');

  useEffect(() => {
    fetchParticipants();
  }, []);

  const fetchParticipants = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await axios.get(
        `${API_BASE_URL}/events/${event._id}/participants`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        setParticipants(response.data.participants);
        console.log(`✅ Loaded ${response.data.participants.length} participants`);
      }
    } catch (err) {
      console.error('Error fetching participants:', err);
      const errorMsg = err.response?.data?.message || 'Failed to load participants';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Filter participants based on search term
  const filteredParticipants = participants.filter((p) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      p.name?.toLowerCase().includes(searchLower) ||
      p.email?.toLowerCase().includes(searchLower) ||
      p.username?.toLowerCase().includes(searchLower) ||
      p.collegeId?.toLowerCase().includes(searchLower)
    );
  });

  // Sort participants
  const sortedParticipants = [...filteredParticipants].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return (a.name || '').localeCompare(b.name || '');
      case 'email':
        return (a.email || '').localeCompare(b.email || '');
      case 'department':
        return (a.profile?.department || '').localeCompare(b.profile?.department || '');
      default:
        return 0;
    }
  });

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Name', 'Email', 'Username', 'College ID', 'Department', 'Year'];
    
    const csvContent = [
      headers.join(','),
      ...sortedParticipants.map((p) =>
        [
          `"${p.name || ''}"`,
          `"${p.email || ''}"`,
          `"${p.username || ''}"`,
          `"${p.collegeId || ''}"`,
          `"${p.profile?.department || ''}"`,
          `"${p.profile?.year || ''}"`,
        ].join(',')
      ),
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.title}-participants-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    console.log(`✅ Exported ${sortedParticipants.length} participants to CSV`);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content participants-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>👥 Event Participants</h2>
            <p className="event-title">{event.title}</p>
          </div>
          <button className="modal-close" onClick={onClose} type="button">
            ✕
          </button>
        </div>

        {error && <div className="error-message">⚠️ {error}</div>}

        {loading ? (
          <div className="loader"></div>
        ) : (
          <>
            {/* Stats */}
            <div className="participants-stats">
              <div className="stat">
                <span className="label">Total Registered:</span>
                <span className="value">{participants.length}</span>
              </div>
              <div className="stat">
                <span className="label">Max Capacity:</span>
                <span className="value">{event.maxParticipants || 'Unlimited'}</span>
              </div>
              <div className="stat">
                <span className="label">Occupancy:</span>
                <span className="value">
                  {event.maxParticipants
                    ? `${Math.round((participants.length / event.maxParticipants) * 100)}%`
                    : 'N/A'}
                </span>
              </div>
            </div>

            {/* Filters */}
            <div className="filters-section">
              <div className="search-box">
                <input
                  type="text"
                  placeholder="🔍 Search by name, email, username, or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>

              <div className="filter-controls">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="sort-select"
                >
                  <option value="name">Sort by: Name</option>
                  <option value="email">Sort by: Email</option>
                  <option value="department">Sort by: Department</option>
                </select>

                <button className="btn-export" onClick={exportToCSV}>
                  📥 Export to CSV
                </button>
              </div>
            </div>

            {/* Participants Table */}
            {sortedParticipants.length > 0 ? (
              <div className="participants-table-wrapper">
                <table className="participants-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Username</th>
                      <th>College ID</th>
                      <th>Department</th>
                      <th>Year</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedParticipants.map((participant, index) => (
                      <tr key={participant._id} className="participant-row">
                        <td className="index">{index + 1}</td>
                        <td className="name">
                          <strong>{participant.name || '-'}</strong>
                        </td>
                        <td className="email">
                          <a href={`mailto:${participant.email}`}>{participant.email || '-'}</a>
                        </td>
                        <td className="username">@{participant.username || '-'}</td>
                        <td className="college-id">{participant.collegeId || '-'}</td>
                        <td className="department">{participant.profile?.department || '-'}</td>
                        <td className="year">
                          {participant.profile?.year ? `${participant.profile.year}${participant.profile.year === '1' ? 'st' : participant.profile.year === '2' ? 'nd' : participant.profile.year === '3' ? 'rd' : 'th'} Year` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <p>😔 No participants found matching your search</p>
              </div>
            )}

            {/* Results Info */}
            <div className="results-info">
              Showing {sortedParticipants.length} of {participants.length} participants
            </div>
          </>
        )}

        {/* Close Button */}
        <div className="modal-footer">
          <button className="btn-close" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}