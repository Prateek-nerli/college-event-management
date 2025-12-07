import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import '../styles/NotificationBell.css';

const API_BASE_URL = 'http://localhost:5000/api';

export default function NotificationBell() {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 10000);
      return () => clearInterval(interval);
    }
  }, [token]);

  const fetchNotifications = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      //console.log('✅ Fetched notifications:', res.data.data);
      setNotifications(res.data.data || []);
    } catch (err) {
      console.error('❌ Error fetching notifications', err);
    }
  };

  const handleAcceptTeamInvite = async (notificationId, teamId) => {
    try {
      setLoading(true);
      console.log('📤 Accepting invite for team:', teamId);

      await axios.post(
        `${API_BASE_URL}/teams/${teamId}/invite/respond`,
        { accept: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('✅ Invitation accepted, refreshing notifications...');

      // Immediately refresh the notifications list
      await fetchNotifications();

      alert('✅ Joined team successfully!');
      
      // Close dropdown
      setTimeout(() => {
        setShowDropdown(false);
      }, 500);
    } catch (err) {
      console.error('❌ Accept error:', err);
      alert('❌ ' + (err.response?.data?.message || 'Failed to join team'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeclineTeamInvite = async (notificationId, teamId) => {
    try {
      setLoading(true);
      console.log('📤 Declining invite for team:', teamId);

      await axios.post(
        `${API_BASE_URL}/teams/${teamId}/invite/respond`,
        { accept: false },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('✅ Invitation declined, refreshing notifications...');

      // Immediately refresh the notifications list
      await fetchNotifications();

      alert('✅ Declined invite');

      // Close dropdown
      setTimeout(() => {
        setShowDropdown(false);
      }, 500);
    } catch (err) {
      console.error('❌ Decline error:', err);
      alert('❌ ' + (err.response?.data?.message || 'Failed to decline'));
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async (notificationId) => {
    try {
      console.log('🗑️ Dismissing notification:', notificationId);

      await axios.delete(
        `${API_BASE_URL}/notifications/${notificationId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('✅ Notification dismissed, refreshing list...');

      // Immediately refresh the notifications list
      await fetchNotifications();
    } catch (err) {
      console.error('❌ Error dismissing notification', err);
      alert('Failed to dismiss notification');
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="notification-bell">
      <button
        className="bell-btn"
        onClick={() => setShowDropdown(!showDropdown)}
        title={`${notifications.length} notification${notifications.length !== 1 ? 's' : ''}`}
      >
        🔔
        {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
      </button>

      {showDropdown && (
        <div className="notification-dropdown">
          <div className="dropdown-header">
            <h3>Notifications ({notifications.length})</h3>
            <button
              className="close-btn"
              onClick={() => setShowDropdown(false)}
            >
              ✕
            </button>
          </div>

          <div className="notifications-list">
            {notifications.length === 0 ? (
              <div className="empty-notif">📭 No notifications yet</div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif._id}
                  className={`notification-item ${notif.read ? 'read' : 'unread'}`}
                >
                  <div className="notif-content">
                    <div className="notif-header">
                      <h4>{notif.title}</h4>
                      {notif.type === 'team_invite' && (
                        <span className="notif-badge">Team Invite</span>
                      )}
                    </div>
                    <p>{notif.message}</p>
                    <small>{new Date(notif.createdAt).toLocaleDateString()}</small>
                  </div>

                  <div className="notif-action-bar">
                    {notif.type === 'team_invite' ? (
                      <div className="action-buttons">
                        <button
                          className="btn-action btn-accept"
                          onClick={() =>
                            handleAcceptTeamInvite(notif._id, notif.data?.teamId)
                          }
                          disabled={loading}
                        >
                          {loading ? '⏳ ...' : '✓ Accept'}
                        </button>
                        <button
                          className="btn-action btn-decline"
                          onClick={() =>
                            handleDeclineTeamInvite(notif._id, notif.data?.teamId)
                          }
                          disabled={loading}
                        >
                          {loading ? '⏳ ...' : '✕ Decline'}
                        </button>
                      </div>
                    ) : (
                      <button
                        className="btn-action btn-dismiss"
                        onClick={() => handleDismiss(notif._id)}
                        disabled={loading}
                      >
                        Dismiss
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
