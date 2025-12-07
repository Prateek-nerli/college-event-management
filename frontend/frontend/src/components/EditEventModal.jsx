import { useState, useEffect } from "react";
import axios from "axios";
import "../styles/EditEventModal.css";

const API_BASE_URL = "http://localhost:5000/api";

export default function EditEventModal({ event, token, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    startDate: "",
    endDate: "",
    venue: "",
    city: "",
    maxParticipants: 100,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Initialize form with event data
  useEffect(() => {
    if (event) {
      console.log("📝 Editing event:", event);

      // Handle different date formats
      let startDateStr = "";
      let endDateStr = "";

      if (event.startDate) {
        startDateStr = event.startDate.split("T")[0];
      } else if (event.dates?.startDate) {
        startDateStr = new Date(event.dates.startDate)
          .toISOString()
          .split("T")[0];
      }

      if (event.endDate) {
        endDateStr = event.endDate.split("T")[0];
      } else if (event.dates?.endDate) {
        endDateStr = new Date(event.dates.endDate).toISOString().split("T")[0];
      }

      setFormData({
        title: event.title || "",
        description: event.description || "",
        category: event.category || "WORKSHOP",
        startDate: startDateStr,
        endDate: endDateStr,
        venue: event.venue || event.location?.venue || "",
        city: event.city || event.location?.city || "",
        maxParticipants: event.maxParticipants || 100,
      });

      console.log("✅ Form initialized:", {
        startDate: startDateStr,
        endDate: endDateStr,
        venue: event.venue || event.location?.venue || "",
      });
    }
  }, [event]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Validation
    if (!formData.title || !formData.description || !formData.venue) {
      setError("Please fill in all required fields");
      setLoading(false);
      return;
    }

    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      setError("End date must be after start date");
      setLoading(false);
      return;
    }

    try {
      console.log("📤 Updating event with data:", formData);

      const response = await axios.put(
        `${API_BASE_URL}/events/${event._id}`,
        formData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        console.log("✅ Event updated successfully");
        alert("✅ Event updated successfully!");
        onSuccess(); // Refresh the dashboard
        onClose(); // Close the modal
      }
    } catch (err) {
      console.error("❌ Error updating event:", err);
      const errorMsg = err.response?.data?.message || "Failed to update event";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>✏️ Edit Event</h2>
          <button className="modal-close" onClick={onClose} type="button">
            ✕
          </button>
        </div>

        {error && <div className="error-message">⚠️ {error}</div>}

        <form onSubmit={handleSubmit}>
          {/* Title */}
          <div className="form-group">
            <label htmlFor="title">Event Title *</label>
            <input
              id="title"
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter event title"
              required
            />
          </div>

          {/* Description */}
          <div className="form-group">
            <label htmlFor="description">Description *</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Enter event description"
              rows="4"
              required
            ></textarea>
          </div>

          {/* Category & Max Participants */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="category">Category *</label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
              >
                <option value="workshop">Workshop</option>
                <option value="hackathon">Hackathon</option>
                <option value="seminar">Seminar</option>
                <option value="conference">Conference</option>
                <option value="meetup">Meetup</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="maxParticipants">Max Participants *</label>
              <input
                id="maxParticipants"
                type="number"
                name="maxParticipants"
                value={formData.maxParticipants}
                onChange={handleChange}
                min="1"
                required
              />
            </div>
          </div>

          {/* Start Date & End Date */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="startDate">Start Date *</label>
              <input
                id="startDate"
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="endDate">End Date *</label>
              <input
                id="endDate"
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* Venue & City */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="venue">Venue *</label>
              <input
                id="venue"
                type="text"
                name="venue"
                value={formData.venue}
                onChange={handleChange}
                placeholder="e.g., Auditorium, Lab 2, etc."
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="city">City *</label>
              <input
                id="city"
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="e.g., Bengaluru"
                required
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-save" disabled={loading}>
              {loading ? "💾 Saving..." : "✅ Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
