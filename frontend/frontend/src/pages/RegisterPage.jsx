import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import '../styles/AuthPages.css';

export default function RegisterPage({ setCurrentPage }) {
  const [formData, setFormData] = useState({
    username: '', email: '', password: '', fullName: '', collegeId: '',
    department: '', year: 1, phone: '', role: 'student'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const result = await register(formData);
    
    if (result.success) {
      // ✅ ADD THIS - Navigate to events page after successful registration
      setTimeout(() => {
        setCurrentPage('events');
      }, 500);
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Register</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Username:</label>
              <input type="text" name="username" value={formData.username} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Email:</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Password:</label>
              <input type="password" name="password" value={formData.password} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Full Name:</label>
              <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>College ID:</label>
              <input type="text" name="collegeId" value={formData.collegeId} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Phone:</label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Department:</label>
              <input type="text" name="department" value={formData.department} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Year:</label>
              <select name="year" value={formData.year} onChange={handleChange}>
                <option value={1}>1st Year</option>
                <option value={2}>2nd Year</option>
                <option value={3}>3rd Year</option>
                <option value={4}>4th Year</option>
              </select>
            </div>
            <div className="form-group">
              <label>Role:</label>
              <select name="role" value={formData.role} onChange={handleChange}>
                <option value="student">Student</option>
                <option value="organizer">Organizer</option>
              </select>
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
        <p className="auth-link">
             Already have account?{' '}
              <a 
                onClick={() => setCurrentPage('login')} 
                style={{cursor: 'pointer', color: '#007bff', textDecoration: 'underline'}}
                > Login
                </a>
        </p>

      </div>
    </div>
  );
}
