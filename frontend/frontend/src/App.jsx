import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import EventsPage from "./pages/EventsPage";
import CreateEventPage from "./pages/CreateEventPage";
import EventDetailPage from "./pages/EventDetailPage";
import ProfilePage from "./pages/ProfilePage";
import TeamPage from "./pages/TeamPage";
import NotificationBell from "./components/NotificationBell";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import PrincipalRegisterPage from "./pages/PrincipalRegisterPage";
import CollegeAdminDashboardPage from "./pages/CollegeAdminDashboardPage";
import CollegeAdminEventsPage from "./pages/CollegeAdminEventsPage";
import CertificateTemplateEditor from "./components/certificates/CertificateTemplateEditor";

import "./App.css";

function AppContent() {
  const { isAuthenticated, logout, loading, user } = useAuth();
  const [currentPage, setCurrentPage] = useState("login");
  const [selectedEventId, setSelectedEventId] = useState(null);

  // Helper to check if user is College Admin OR Principal
  const isCollegeAdmin = user?.role === "collegeAdmin" || user?.role === "principal";

  // Sync currentPage with auth status and handle all roles
  useEffect(() => {
    if (loading) return;

    // 1. Handle Initial Login Redirects
    if (
      isAuthenticated &&
      (currentPage === "login" || currentPage === "register")
    ) {
      if (!user || !user.role) return; // Wait for user data

      if (user.role === "admin") {
        setCurrentPage("admin-dashboard");
      } else if (isCollegeAdmin) {
        setCurrentPage("college-admin-dashboard");
      } else {
        setCurrentPage("events");
      }
    } 
    // 2. ✅ FIX: Role Enforcement (Prevents the "Flash" to wrong page)
    // If a Principal/Admin somehow lands on the student 'events' page, redirect them.
    else if (isAuthenticated && currentPage === 'events') {
       if (isCollegeAdmin) {
         setCurrentPage("college-admin-dashboard");
       } else if (user?.role === "admin") {
         setCurrentPage("admin-dashboard");
       }
    }
    // 3. Handle Logout/Unauthenticated state
    else if (
      !isAuthenticated &&
      currentPage !== "login" &&
      currentPage !== "register" &&
      currentPage !== "principal-register"
    ) {
      setCurrentPage("login");
    }
  }, [isAuthenticated, loading, user, currentPage, isCollegeAdmin]);

  if (loading) return <div className="loading">Loading...</div>;

  const handleNavClick = (page) => {
    if (!isAuthenticated && page !== "login" && page !== "register" && page !== "principal-register") {
      setCurrentPage("login");
    } else {
      setCurrentPage(page);
    }
  };

  const handleViewEventDetail = (eventId) => {
    setSelectedEventId(eventId);
    setCurrentPage("event-detail");
  };

  const handleBackFromDetail = () => {
    setSelectedEventId(null);
    setCurrentPage("events");
  };

  const handleOpenCertEditor = (eventId) => {
    setSelectedEventId(eventId); 
    setCurrentPage("certificate-editor"); 
  };

  // Full-screen Certificate Editor Route
  if (isAuthenticated && currentPage === "certificate-editor" && selectedEventId) {
    return (
      <div className="w-full h-screen bg-gray-50 flex flex-col overflow-hidden">
         <div className="bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm shrink-0">
            <h2 className="text-xl font-bold text-gray-800">Certificate Editor</h2>
            <button 
              onClick={() => setCurrentPage("profile")} 
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition"
            >
              ← Back to Profile
            </button>
         </div>
         <div className="flex-1 overflow-hidden relative">
            <CertificateTemplateEditor eventId={selectedEventId} />
         </div>
      </div>
    );
  }

  return (
    <>
      <nav className="navbar">
        <div className="nav-container">
          <h1
            className="logo"
            style={{ cursor: "pointer" }}
            onClick={() => {
              if (isCollegeAdmin) {
                handleNavClick("college-admin-dashboard");
              } else if (user?.role === "admin") {
                handleNavClick("admin-dashboard");
              } else {
                handleNavClick("events");
              }
            }}
          >
            🎓 College Events
          </h1>
          <div className="nav-links">
            {isAuthenticated ? (
              <>
                {user?.role === "admin" ? (
                  <a onClick={() => handleNavClick("admin-dashboard")} style={{ cursor: "pointer" }}>
                    🔐 Admin Dashboard
                  </a>
                ) : isCollegeAdmin ? (
                  /* ✅ Unified Menu for Principal/CollegeAdmin */
                  <>
                    <a onClick={() => handleNavClick("college-admin-dashboard")} style={{ cursor: "pointer" }}>
                      Dashboard
                    </a>
                    <a onClick={() => handleNavClick("college-admin-events")} style={{ cursor: "pointer" }}>
                      Events
                    </a>
                  </>
                ) : (
                  /* Student/Organizer Menu */
                  <>
                    <a onClick={() => handleNavClick("events")} style={{ cursor: "pointer" }}>
                      Events
                    </a>
                    {user?.role === "organizer" && (
                      <a onClick={() => handleNavClick("create-event")} style={{ cursor: "pointer" }}>
                        Create Event
                      </a>
                    )}
                    <a onClick={() => handleNavClick("teams")} style={{ cursor: "pointer" }}>
                      👥 Teams
                    </a>
                    <a onClick={() => handleNavClick("profile")} style={{ cursor: "pointer" }}>
                      Profile
                    </a>
                    <NotificationBell />
                  </>
                )}
                <a
                  onClick={() => {
                    logout();
                    setCurrentPage("login");
                  }}
                  style={{ cursor: "pointer" }}
                >
                  Logout
                </a>
              </>
            ) : (
              <>
                <a onClick={() => handleNavClick("login")} style={{ cursor: "pointer" }}>
                  Login
                </a>
                <a onClick={() => handleNavClick("register")} style={{ cursor: "pointer" }}>
                  Register
                </a>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Authentication Pages */}
      {!isAuthenticated && currentPage === "login" && (
        <LoginPage setCurrentPage={setCurrentPage} />
      )}
      {!isAuthenticated && currentPage === "register" && (
        <RegisterPage setCurrentPage={setCurrentPage} />
      )}
      {!isAuthenticated && currentPage === "principal-register" && (
        <PrincipalRegisterPage setCurrentPage={setCurrentPage} />
      )}

      {/* Main Pages */}
      {isAuthenticated && currentPage === "events" && (
        <EventsPage onSelectEvent={handleViewEventDetail} />
      )}
      {isAuthenticated &&
        currentPage === "create-event" &&
        user?.role === "organizer" && (
          <CreateEventPage setCurrentPage={setCurrentPage} />
        )}
      {isAuthenticated && currentPage === "event-detail" && selectedEventId && (
        <EventDetailPage
          eventId={selectedEventId}
          onBack={handleBackFromDetail}
          setCurrentPage={setCurrentPage}
        />
      )}
      {isAuthenticated && currentPage === "profile" && (
        <ProfilePage 
          setCurrentPage={setCurrentPage}
          onManageCertificates={handleOpenCertEditor}
        />
      )}
      {isAuthenticated && currentPage === "teams" && (
        <TeamPage setCurrentPage={setCurrentPage} />
      )}

      {/* Admin Dashboard */}
      {isAuthenticated &&
        currentPage === "admin-dashboard" &&
        user?.role === "admin" && (
          <AdminDashboardPage setCurrentPage={setCurrentPage} />
        )}

      {/* College Admin Dashboard */}
      {isAuthenticated &&
        currentPage === "college-admin-dashboard" &&
        isCollegeAdmin && (
          <CollegeAdminDashboardPage setCurrentPage={setCurrentPage} />
        )}

      {/* College Admin Events Page */}
      {isAuthenticated &&
        currentPage === "college-admin-events" &&
        isCollegeAdmin && (
          <CollegeAdminEventsPage setCurrentPage={setCurrentPage} />
        )}
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;