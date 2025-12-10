import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import '../styles/AuthPages.css';

export default function LoginPage({ setCurrentPage }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const result = await login(email, password);
    
    if (result.success) {
      const role = result.user?.role;
      setTimeout(() => {
        if (role === "admin") {
          setCurrentPage("admin-dashboard");
        } else if (role === "collegeAdmin") {
          setCurrentPage("college-admin-dashboard");
        } else {
          setCurrentPage("events");
        }
      }, 500);
    }
    else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Login</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email:</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
          </div>
          <div className="form-group">
            <label>Password:</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <p className="auth-link">
          Don't have account?{' '}
          <a 
            onClick={() => setCurrentPage('register')} 
            style={{cursor: 'pointer', color: '#007bff', textDecoration: 'underline'}}
          >
            Register
          </a>
        </p>
      </div>
    </div>
  );
}
