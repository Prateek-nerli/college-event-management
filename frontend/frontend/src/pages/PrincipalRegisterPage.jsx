import { useState } from "react";
import { principalAPI } from "../services/api";
import "../styles/AuthPages.css";

export default function PrincipalRegisterPage({ setCurrentPage }) {
  const [form, setForm] = useState({
    name: "",
    mobile: "",
    collegeName: "",
    collegeCode: "",
    usnPrefix: "",           // NEW
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const res = await principalAPI.register(form);
      if (res.data.success) {
        setSuccess("Request submitted. Admin will verify and approve your account.");
        setForm({
          name: "",
          mobile: "",
          collegeName: "",
          collegeCode: "",
          usnPrefix: "",
          email: "",
          password: "",
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Principal Registration</h2>
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Principal Name</label>
            <input
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Mobile Number</label>
            <input
              name="mobile"
              type="tel"
              value={form.mobile}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>College Name</label>
            <input
              name="collegeName"
              type="text"
              value={form.collegeName}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>College Code</label>
            <input
              name="collegeCode"
              type="text"
              value={form.collegeCode}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>USN Prefix (e.g., 1SI, 2CS)</label>
            <input
              name="usnPrefix"
              type="text"
              value={form.usnPrefix}
              onChange={handleChange}
              placeholder="e.g., 1SI"
              required
            />
          </div>

          <div className="form-group">
            <label>Official Email (principal.&lt;college&gt;.edu)</label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Create Password</label>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Submitting..." : "Submit for Approval"}
          </button>
        </form>

        <p className="auth-link">
          Already approved?{" "}
          <a
            onClick={() => setCurrentPage("login")}
            style={{ cursor: "pointer", color: "#007bff", textDecoration: "underline" }}
          >
            Login
          </a>
        </p>
      </div>
    </div>
  );
}
