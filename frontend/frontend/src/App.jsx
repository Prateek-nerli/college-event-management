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


import "./App.css";

function AppContent() {
  const { isAuthenticated, logout, loading, user } = useAuth();
  const [currentPage, setCurrentPage] = useState("login");
  const [selectedEventId, setSelectedEventId] = useState(null);

  // ✅ UPDATED: Sync currentPage with auth status and handle all roles
  useEffect(() => {
    if (loading) return;

    if (
      isAuthenticated &&
      (currentPage === "login" || currentPage === "register")
    ) {
      // Route based on user role
      if (user?.role === "admin") {
        setCurrentPage("admin-dashboard");
      } else if (user?.role === "collegeAdmin") {
        setCurrentPage("college-admin-dashboard");
      } else if (user?.role === "principal") {
        setCurrentPage("principal-dashboard");
      } else {
        // student, organizer
        setCurrentPage("events");
      }
    } else if (
      !isAuthenticated &&
      currentPage !== "login" &&
      currentPage !== "register" &&
      currentPage !== "principal-register"
    ) {
      setCurrentPage("login");
    }
  }, [isAuthenticated, loading, user?.role]);

  if (loading) return <div className="loading">Loading...</div>;

  const handleNavClick = (page) => {
    if (
      !isAuthenticated &&
      page !== "login" &&
      page !== "register" &&
      page !== "principal-register"
    ) {
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

  return (
    <>
      <nav className="navbar">
        <div className="nav-container">
          <h1
            className="logo"
            style={{ cursor: "pointer" }}
            onClick={() => {
              if (user?.role === "collegeAdmin") {
                handleNavClick("college-admin-dashboard");
              } else if (user?.role === "admin") {
                handleNavClick("admin-dashboard");
              } else if (user?.role === "principal") {
                handleNavClick("principal-dashboard");
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
                  // Admin Navigation
                  <>
                    <a
                      onClick={() => handleNavClick("admin-dashboard")}
                      style={{ cursor: "pointer" }}
                    >
                      🔐 Admin Dashboard
                    </a>
                  </>
                ) : user?.role === "collegeAdmin" ? (
                  // College Admin Navigation ✅ UPDATED
                  <>
                    <a
                      onClick={() => handleNavClick("college-admin-dashboard")}
                      style={{ cursor: "pointer" }}
                    >
                      Dashboard
                    </a>
                    <a
                      onClick={() => handleNavClick("college-admin-events")}
                      style={{ cursor: "pointer" }}
                    >
                      Events
                    </a>
                  </>
                ) : user?.role === "principal" ? (
                  // Principal Navigation ✅ UPDATED
                  <>
                    <a
                      onClick={() => handleNavClick("principal-dashboard")}
                      style={{ cursor: "pointer" }}
                    >
                      👨‍💼 Principal
                    </a>
                  </>
                ) : (
                  // Regular User Navigation (Student/Organizer)
                  <>
                    <a
                      onClick={() => handleNavClick("events")}
                      style={{ cursor: "pointer" }}
                    >
                      Events
                    </a>
                    {user?.role === "organizer" && (
                      <a
                        onClick={() => handleNavClick("create-event")}
                        style={{ cursor: "pointer" }}
                      >
                        Create Event
                      </a>
                    )}
                    <a
                      onClick={() => handleNavClick("teams")}
                      style={{ cursor: "pointer" }}
                    >
                      👥 Teams
                    </a>
                    <a
                      onClick={() => handleNavClick("profile")}
                      style={{ cursor: "pointer" }}
                    >
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
                <a
                  onClick={() => handleNavClick("login")}
                  style={{ cursor: "pointer" }}
                >
                  Login
                </a>
                <a
                  onClick={() => handleNavClick("register")}
                  style={{ cursor: "pointer" }}
                >
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
        <ProfilePage setCurrentPage={setCurrentPage} />
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

      {/* College Admin Dashboard ✅ UPDATED */}
      {isAuthenticated &&
        currentPage === "college-admin-dashboard" &&
        user?.role === "collegeAdmin" && (
          <CollegeAdminDashboardPage setCurrentPage={setCurrentPage} />
        )}

      {/* College Admin Events Page ✅ NEW */}
      {isAuthenticated &&
        currentPage === "college-admin-events" &&
        user?.role === "collegeAdmin" && (
          <CollegeAdminEventsPage setCurrentPage={setCurrentPage} />
        )}

      {/* Principal Dashboard ✅ UPDATED */}
      {isAuthenticated &&
        currentPage === "principal-dashboard" &&
        user?.role === "principal" && (
          <PrincipalDashboard setCurrentPage={setCurrentPage} />
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
