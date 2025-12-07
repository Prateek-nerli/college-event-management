import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import '../styles/TeamPage.css';

const API_BASE_URL = 'http://localhost:5000/api';

export default function TeamPage({ setCurrentPage }) {
  const { user, token } = useAuth();
  const [myTeams, setMyTeams] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamDesc, setTeamDesc] = useState('');
  const [maxMembers, setMaxMembers] = useState(5);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deletingTeamId, setDeletingTeamId] = useState(null);

  useEffect(() => {
    fetchTeams();
  }, [token]);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/teams/my-teams`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMyTeams(res.data.data);

      // Extract invites from user
      if (user?.teamInvites) {
        setInvites(user.teamInvites.filter((i) => i.status === 'pending'));
      }
    } catch (err) {
      console.error('Error fetching teams', err);
      setError('Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!teamName) {
      setError('Team name is required');
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post(
        `${API_BASE_URL}/teams`,
        {
          name: teamName,
          description: teamDesc,
          maxMembers,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMyTeams([res.data.data, ...myTeams]);
      setSuccess('Team created successfully!');
      setTeamName('');
      setTeamDesc('');
      setMaxMembers(5);
      setShowCreateForm(false);

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create team');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteMember = async (teamId) => {
    if (!inviteEmail) {
      setError('Email is required');
      return;
    }

    try {
      setLoading(true);
      // First find user by email
      const userRes = await axios.get(
        `${API_BASE_URL}/users/search?email=${inviteEmail}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!userRes.data.data) {
        setError('User not found');
        return;
      }

      const res = await axios.post(
        `${API_BASE_URL}/teams/${teamId}/invite`,
        { userId: userRes.data.data._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMyTeams(myTeams.map((t) => (t._id === teamId ? res.data.data : t)));
      setSuccess('Invite sent!');
      setInviteEmail('');

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to invite');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTeam = async (teamId) => {
    const confirmDelete = window.confirm(
      '⚠️ Are you sure you want to delete this team? This action cannot be undone.'
    );

    if (!confirmDelete) return;

    try {
      setDeletingTeamId(teamId);
      await axios.delete(
        `${API_BASE_URL}/teams/${teamId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMyTeams(myTeams.filter((t) => t._id !== teamId));
      setSuccess('✅ Team deleted successfully');

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete team');
    } finally {
      setDeletingTeamId(null);
    }
  };

  const handleRespondInvite = async (teamId, accept) => {
    try {
      await axios.post(
        `${API_BASE_URL}/teams/${teamId}/invite/respond`,
        { accept },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setInvites(invites.filter((i) => i.teamId !== teamId));
      setSuccess(accept ? '✅ Joined team!' : '✅ Declined invite');

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to respond');
    }
  };

  return (
    <div className="team-page">
      <div className="team-header">
        <h1>👥 My Teams</h1>
        <button
          className="btn-primary"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? '✕ Cancel' : '➕ Create Team'}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Create Team Form */}
      {showCreateForm && (
        <div className="team-form">
          <h2>Create New Team</h2>
          <form onSubmit={handleCreateTeam}>
            <div className="form-group">
              <label>Team Name *</label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Enter team name"
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={teamDesc}
                onChange={(e) => setTeamDesc(e.target.value)}
                placeholder="Team description (optional)"
                rows="3"
              />
            </div>
            <div className="form-group">
              <label>Max Members</label>
              <input
                type="number"
                min="2"
                max="10"
                value={maxMembers}
                onChange={(e) => setMaxMembers(parseInt(e.target.value))}
              />
            </div>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Team'}
            </button>
          </form>
        </div>
      )}

      {/* Pending Invites */}
      {invites.length > 0 && (
        <div className="invites-section">
          <h2>📬 Pending Invites ({invites.length})</h2>
          <div className="invites-list">
            {invites.map((invite) => (
              <div key={invite.teamId} className="invite-card">
                <div>
                  <h3>Team Invitation</h3>
                  <p>You're invited to join a team</p>
                </div>
                <div className="invite-actions">
                  <button
                    className="btn-primary"
                    onClick={() => handleRespondInvite(invite.teamId, true)}
                  >
                    ✓ Accept
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => handleRespondInvite(invite.teamId, false)}
                  >
                    ✕ Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My Teams */}
      <div className="teams-section">
        <h2>Your Teams ({myTeams.length})</h2>
        {myTeams.length === 0 ? (
          <div className="empty-message">
            <p>No teams yet. Create one to get started!</p>
          </div>
        ) : (
          <div className="teams-grid">
            {myTeams.map((team) => (
              <div key={team._id} className="team-card">
                <div className="team-card-header">
                  <h3>{team.name}</h3>
                  {team.leader._id === user._id && (
                    <span className="badge-leader">Leader</span>
                  )}
                </div>
                <p className="team-desc">{team.description || 'No description'}</p>

                <div className="team-stats">
                  <div className="stat">
                    <span className="stat-label">Members</span>
                    <span className="stat-value">
                      {team.members?.filter((m) => m.status !== 'pending').length}/{team.maxMembers}
                    </span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Events</span>
                    <span className="stat-value">{team.registeredEvents?.length || 0}</span>
                  </div>
                </div>

                {/* Members List */}
                <div className="members-list">
                  <h4>Members</h4>
                  {team.members?.map((member) => (
                    <div key={member.userId._id} className="member-item">
                      <span>{member.userId.profile?.fullName || member.userId.username}</span>
                      <span className="member-status">{member.status}</span>
                    </div>
                  ))}
                </div>

                {/* Invite Member (if leader) */}
                {team.leader._id === user._id && (
                  <div className="invite-form">
                    <input
                      type="email"
                      placeholder="Email to invite"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                    <button
                      className="btn-secondary"
                      onClick={() => handleInviteMember(team._id)}
                      disabled={loading}
                    >
                      Invite
                    </button>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="team-actions">
                  <button
                    className="btn-primary"
                    onClick={() => setCurrentPage('events')}
                    style={{ flex: 1 }}
                  >
                    📋 Register for Events
                  </button>

                  {team.leader._id === user._id && (
                    <button
                      className="btn-danger"
                      onClick={() => handleDeleteTeam(team._id)}
                      disabled={deletingTeamId === team._id}
                      style={{ flex: 1 }}
                    >
                      {deletingTeamId === team._id ? '🗑️ Deleting...' : '🗑️ Delete Team'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
