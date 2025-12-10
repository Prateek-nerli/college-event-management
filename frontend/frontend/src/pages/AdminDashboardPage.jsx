import { useEffect, useState } from "react";
import { principalAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await principalAPI.getRequests();
      setRequests(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleApprove = async (id) => {
    try {
      await principalAPI.approve(id);
      await loadRequests();
      alert("Principal approved and account created");
    } catch (err) {
      alert(err.response?.data?.message || "Approval failed");
    }
  };

  const handleReject = async (id) => {
    const notes = prompt("Reason for rejection (optional):") || "";
    try {
      await principalAPI.reject(id, notes);
      await loadRequests();
    } catch (err) {
      alert(err.response?.data?.message || "Rejection failed");
    }
  };

  return (
    <div style={{ padding: "24px" }}>
      <h1>Admin Dashboard</h1>
      <p>Welcome, {user?.profile?.fullName || user?.username}</p>

      <h2 style={{ marginTop: "24px" }}>Pending Principal Requests</h2>
      {error && <div className="error-message">{error}</div>}
      {loading ? (
        <p>Loading...</p>
      ) : requests.length === 0 ? (
        <p>No pending requests.</p>
      ) : (
        <table className="requests-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>College</th>
              <th>College Code</th>
              <th>Email</th>
              <th>Mobile</th>
              <th>Submitted At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r._id}>
                <td>{r.name}</td>
                <td>{r.collegeName}</td>
                <td>{r.collegeCode}</td>
                <td>{r.email}</td>
                <td>{r.mobile}</td>
                <td>{new Date(r.createdAt).toLocaleString()}</td>
                <td>
                  <button onClick={() => handleApprove(r._id)}>Approve</button>
                  <button
                    onClick={() => handleReject(r._id)}
                    style={{ marginLeft: 8 }}
                  >
                    Reject
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
