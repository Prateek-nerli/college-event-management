import { useState } from 'react';
import { eventAPI } from '../services/api'; // Ensure this uses your axios instance
// import { useAuth } from '../context/AuthContext'; // Not needed if eventAPI handles auth
import '../styles/CreateEventPage.css';

export default function CreateEventPage({ setCurrentPage }) {
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'hackathon',
    
    // Venue
    venueName: '',      
    venueLocation: '',  
    maxParticipants: '100', 
    
    // Dates
    startDate: '',
    endDate: '',
    registrationDeadline: '',
    
    // Team
    registrationType: 'individual',
    teamMin: '2',
    teamMax: '4',
    
    // Fees & Prizes
    isPaid: 'free',
    fee: '',
    prizes: '',
    
    // URLs (optional if you want to paste links)
    rulebookUrl: ''
  });

  // Separate state for the actual File objects
  const [posterFile, setPosterFile] = useState(null);
  const [rulebookFile, setRulebookFile] = useState(null);
  
  // Preview URL just for showing the user what they picked
  const [posterPreview, setPosterPreview] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ✅ FIX: Simple file handler. Just saves file to state.
  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (type === 'poster') {
      setPosterFile(file);
      // Create a local preview URL so user can see what they picked
      setPosterPreview(URL.createObjectURL(file));
    } else if (type === 'rulebook') {
      setRulebookFile(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
        // 1. Validation
        if (!formData.title || !formData.startDate || !formData.endDate || !formData.venueName) {
            setError('Please fill in all required fields');
            setLoading(false);
            return;
        }

        // 2. Create FormData
        const data = new FormData();

        // --- Basic Fields ---
        data.append("title", formData.title.trim());
        data.append("description", formData.description.trim());
        data.append("category", formData.category);
        data.append("registrationType", formData.registrationType);
        data.append("maxParticipants", parseInt(formData.maxParticipants) || 100);
        
        // --- Dates ---
        data.append("startDate", formData.startDate);
        data.append("endDate", formData.endDate);
        data.append("registrationDeadline", formData.registrationDeadline || formData.endDate);

        // --- ✅ FIX: Append the Poster File ---
        // This 'poster' key must match upload.single('poster') in backend
        if (posterFile) {
            data.append("poster", posterFile);
        }

        // --- Complex Objects (Stringified) ---
        
        // Venue
        const venueObj = {
            name: formData.venueName,
            location: formData.venueLocation || "Campus",
            capacity: parseInt(formData.maxParticipants) || 100
        };
        data.append("venue", JSON.stringify(venueObj));

        // Team Size
        const teamSizeObj = formData.registrationType === 'team'
            ? { min: parseInt(formData.teamMin) || 2, max: parseInt(formData.teamMax) || 4 }
            : { min: 1, max: 1 };
        data.append("teamSize", JSON.stringify(teamSizeObj));

        // Prizes
        if (formData.prizes) {
            const prizesArray = [{ position: "General", prize: formData.prizes, amount: 0 }];
            data.append("prizes", JSON.stringify(prizesArray));
        }
        
        // Fees & Rulebook
        data.append("isPaid", formData.isPaid === 'paid');
        data.append("fee", formData.isPaid === 'paid' ? (parseInt(formData.fee) || 0) : 0);
        // If you handle rulebook upload in backend too, append 'rulebookFile' here.
        // For now, if you only fixed poster in backend, we skip rulebook file upload to avoid errors.

        console.log('📤 Sending FormData...');

        // 3. Send to API
        await eventAPI.createEvent(data);
        
        alert('✅ Event created successfully!');
        setCurrentPage('events');

    } catch (err) {
        console.error('Create Error:', err);
        setError(err.response?.data?.message || 'Failed to create event');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="create-event-page">
      <div className="create-event-header">
        <h1>🎯 Create New Event</h1>
        <button className="btn-secondary" onClick={() => setCurrentPage('events')}>
          ← Back
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form className="create-event-form" onSubmit={handleSubmit}>
        
        {/* SECTION 1: BASIC INFO */}
        <h3 className="section-title">📝 Basic Details</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Event Title *</label>
            <input type="text" name="title" value={formData.title} onChange={handleChange} placeholder="e.g. Tech Nova 2025" required />
          </div>
          <div className="form-group">
            <label>Category *</label>
            <select name="category" value={formData.category} onChange={handleChange}>
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

        <div className="form-group">
          <label>Description *</label>
          <textarea name="description" value={formData.description} onChange={handleChange} required rows="4" placeholder="Describe the event..." />
        </div>

        {/* SECTION 2: DATE & TIME */}
        <h3 className="section-title">📅 Date & Time</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Start Date *</label>
            <input type="datetime-local" name="startDate" value={formData.startDate} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>End Date *</label>
            <input type="datetime-local" name="endDate" value={formData.endDate} onChange={handleChange} required />
          </div>
        </div>
        <div className="form-row">
           <div className="form-group">
             <label>Registration Deadline</label>
             <input type="datetime-local" name="registrationDeadline" value={formData.registrationDeadline} onChange={handleChange} />
           </div>
        </div>

        {/* SECTION 3: VENUE & CAPACITY */}
        <h3 className="section-title">📍 Venue & Capacity</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Venue Name *</label>
            <input 
              type="text" 
              name="venueName" 
              value={formData.venueName} 
              onChange={handleChange} 
              placeholder="e.g. Main Auditorium" 
              required 
            />
          </div>
          <div className="form-group">
            <label>Venue Location (Building/Floor)</label>
            <input 
              type="text" 
              name="venueLocation" 
              value={formData.venueLocation} 
              onChange={handleChange} 
              placeholder="e.g. Block A, 2nd Floor" 
            />
          </div>
          <div className="form-group">
            <label>Max Participants *</label>
            <input 
              type="number" 
              name="maxParticipants" 
              value={formData.maxParticipants} 
              onChange={handleChange} 
              min="1" 
              required 
            />
          </div>
        </div>

        {/* SECTION 4: MEDIA */}
        <h3 className="section-title">🖼️ Media</h3>
        <div className="form-row">
          {/* Poster Upload */}
          <div className="form-group">
            <label>Event Poster (Image) *</label>
            <div className="upload-box">
              <input 
                type="file" 
                accept="image/*" 
                // ✅ FIX: Call handleFileChange
                onChange={(e) => handleFileChange(e, 'poster')} 
              />
              {posterFile && <span className="upload-success">Selected: {posterFile.name} ✅</span>}
            </div>
            {/* Show Local Preview */}
            {posterPreview && (
              <img src={posterPreview} alt="Preview" className="poster-preview" style={{marginTop: '10px', maxHeight: '200px', borderRadius: '8px'}} />
            )}
          </div>
        </div>

        {/* SECTION 5: PRIZES & FEES */}
        <h3 className="section-title">🏆 Prizes & Fees</h3>
        <div className="form-row">
           <div className="form-group">
              <label>Prizes Description</label>
              <input 
                type="text" 
                name="prizes" 
                value={formData.prizes} 
                onChange={handleChange} 
                placeholder="e.g. 1st: ₹5000, 2nd: ₹3000" 
              />
           </div>
           
           <div className="form-group">
             <label>Registration Fee *</label>
             <div className="radio-group">
               <label className="radio-label">
                 <input 
                   type="radio" 
                   name="isPaid" 
                   value="free" 
                   checked={formData.isPaid === 'free'} 
                   onChange={handleChange} 
                 /> 
                 Free
               </label>
               <label className="radio-label">
                 <input 
                   type="radio" 
                   name="isPaid" 
                   value="paid" 
                   checked={formData.isPaid === 'paid'} 
                   onChange={handleChange} 
                 /> 
                 Paid
               </label>
             </div>
             
             {formData.isPaid === 'paid' && (
               <input 
                 type="number" 
                 name="fee" 
                 value={formData.fee} 
                 onChange={handleChange} 
                 placeholder="Enter Amount (₹)" 
                 className="mt-2"
                 required
               />
             )}
           </div>
        </div>

        {/* SECTION 6: TEAM SETTINGS */}
        <h3 className="section-title">👥 Team Settings</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Registration Type</label>
            <div className="radio-group">
              <label className="radio-label">
                <input type="radio" name="registrationType" value="individual" checked={formData.registrationType === 'individual'} onChange={handleChange} /> Individual
              </label>
              <label className="radio-label">
                <input type="radio" name="registrationType" value="team" checked={formData.registrationType === 'team'} onChange={handleChange} /> Team
              </label>
            </div>
            {formData.registrationType === 'team' && (
               <div className="team-size-row mt-2">
                 <input type="number" name="teamMin" value={formData.teamMin} onChange={handleChange} placeholder="Min" />
                 <span>-</span>
                 <input type="number" name="teamMax" value={formData.teamMax} onChange={handleChange} placeholder="Max" />
               </div>
            )}
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creating...' : '✓ Create Event'}
          </button>
        </div>
      </form>
    </div>
  );
}