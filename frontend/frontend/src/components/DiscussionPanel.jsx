import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import "../styles/DiscussionPanel.css"; // Import the CSS file

const API_BASE_URL = "http://localhost:5000/api";

// Helper: Get a CSS class based on the first letter of the name
const getAvatarClass = (name) => {
  const classes = [
    "avatar-red", "avatar-orange", "avatar-amber", 
    "avatar-green", "avatar-emerald", "avatar-teal", 
    "avatar-cyan", "avatar-sky", "avatar-blue", 
    "avatar-indigo", "avatar-violet", "avatar-purple", 
    "avatar-fuchsia", "avatar-pink", "avatar-rose"
  ];
  const index = name ? name.charCodeAt(0) % classes.length : 0;
  return classes[index];
};

// Helper: Format relative time
const timeAgo = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
};

export default function DiscussionPanel({ eventId }) {
  const { token, user } = useAuth();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [eventId]);

  const fetchComments = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/comments/${eventId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setComments(res.data.data);
    } catch (err) {
      console.error("Failed to load comments", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setLoading(true);
      const res = await axios.post(
        `${API_BASE_URL}/comments/${eventId}`,
        { text: newComment },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setComments([res.data.data, ...comments]);
      setNewComment("");
      setIsFocused(false);
    } catch (err) {
      alert("Failed to post comment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="discussion-container">
      {/* Header */}
      <div className="discussion-header">
        <h3>Discussion Board</h3>
        <span className="comment-count-badge">
          {comments.length}
        </span>
      </div>

      <div className="discussion-card">
        
        {/* Input Section */}
        <div className={`input-section ${isFocused ? 'focused' : ''}`}>
          <div className="input-wrapper">
            <div className="current-user-avatar">
               <div className="avatar avatar-current">
                 {user?.username?.[0]?.toUpperCase()}
               </div>
            </div>
            
            <form onSubmit={handleSubmit} className="comment-form">
              <textarea
                className="comment-textarea"
                placeholder="Ask a question or share your thoughts..."
                rows={isFocused ? 3 : 1}
                value={newComment}
                onFocus={() => setIsFocused(true)}
                onChange={(e) => setNewComment(e.target.value)}
                style={{ minHeight: isFocused ? "80px" : "44px" }}
              />
              
              {/* Divider Line Animation */}
              <div className={`focus-line ${isFocused ? 'active' : 'inactive'}`} />

              {/* Action Bar */}
              {(isFocused || newComment) && (
                <div className="action-bar">
                  <button
                    type="button"
                    onClick={() => { setIsFocused(false); setNewComment(""); }}
                    className="btn-cancel"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !newComment.trim()}
                    className="btn-post"
                  >
                    {loading ? (
                      <>
                        <svg className="spinner" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Posting...
                      </>
                    ) : (
                      "Post Comment"
                    )}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Divider */}
        <div className="divider"></div>

        {/* Comments List */}
        <div className="comments-list-container">
          {comments.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon-wrapper">
                <span className="empty-icon">💬</span>
              </div>
              <h4 className="empty-title">No discussions yet</h4>
              <p className="empty-subtitle">Be the first to start the conversation!</p>
            </div>
          ) : (
            <div className="comments-list">
              {comments.map((comment) => {
                const isOrganizer = comment.user?.role === 'organizer';
                const avatarClass = getAvatarClass(comment.user?.username || "?");
                
                return (
                  <div key={comment._id} className="comment-item">
                    <div className="comment-flex">
                      {/* Avatar */}
                      <div className={`avatar ${isOrganizer ? 'avatar-organizer' : avatarClass}`}>
                        {comment.user?.username?.[0]?.toUpperCase() || "?"}
                      </div>

                      <div className="comment-content-wrapper">
                        <div className="comment-meta">
                          <div className="meta-left">
                            <span className="user-name">
                              {comment.user?.profile?.fullName || comment.user?.username || "Unknown User"}
                            </span>
                            
                            {isOrganizer && (
                              <span className="organizer-badge">
                                Organizer
                              </span>
                            )}
                            
                            <span className="time-ago">
                              • {timeAgo(comment.createdAt)}
                            </span>
                          </div>
                        </div>

                        <div className="comment-text">
                          {comment.text}
                        </div>
                        
                        <div className="comment-actions">
                           <button className="btn-reply">Reply</button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}