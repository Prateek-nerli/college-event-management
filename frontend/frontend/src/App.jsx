import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import EventsPage from './pages/EventsPage'
import CreateEventPage from './pages/CreateEventPage'
import EventDetailPage from './pages/EventDetailPage'  
import ProfilePage from './pages/ProfilePage'
import TeamPage from './pages/TeamPage'
import NotificationBell from './components/NotificationBell'
import './App.css'



function AppContent() {
  const { isAuthenticated, logout, loading, user } = useAuth()
  const [currentPage, setCurrentPage] = useState(isAuthenticated ? 'events' : 'login')
  const [selectedEventId, setSelectedEventId] = useState(null)


  if (loading) return <div className="loading">Loading...</div>


  const handleNavClick = (page) => {
    if (!isAuthenticated && page !== 'login' && page !== 'register') {
      setCurrentPage('login')
    } else {
      setCurrentPage(page)
    }
  }


  const handleViewEventDetail = (eventId) => {
    setSelectedEventId(eventId)
    setCurrentPage('event-detail')
  }


  const handleBackFromDetail = () => {
    setSelectedEventId(null)
    setCurrentPage('events')
  }


  return (
    <>
      <nav className="navbar">
        <div className="nav-container">
          <h1 className="logo" style={{cursor: 'pointer'}} onClick={() => handleNavClick('events')}>
            College Events
          </h1>
          <div className="nav-links">
            {isAuthenticated ? (
              <>
                <a onClick={() => handleNavClick('events')} style={{cursor: 'pointer'}}>
                  Events
                </a>
                {user?.role === 'organizer' && (
                  <a onClick={() => handleNavClick('create-event')} style={{cursor: 'pointer'}}>
                    Create Event
                  </a>
                )}
                <a onClick={() => handleNavClick('teams')} style={{cursor: 'pointer'}}>
                  👥 Teams
                </a>
                <a onClick={() => handleNavClick('profile')} style={{cursor: 'pointer'}}>
                  Profile
                </a>
                <NotificationBell />
                <a 
                  onClick={() => { 
                    logout()
                    setCurrentPage('login')
                  }} 
                  style={{cursor: 'pointer'}}
                >
                  Logout
                </a>
              </>
            ) : (
              <>
                <a onClick={() => handleNavClick('login')} style={{cursor: 'pointer'}}>
                  Login
                </a>
                <a onClick={() => handleNavClick('register')} style={{cursor: 'pointer'}}>
                  Register
                </a>
              </>
            )}
          </div>
        </div>
      </nav>


      {/* Authentication Pages */}
      {!isAuthenticated && currentPage === 'login' && <LoginPage setCurrentPage={setCurrentPage} />}
      {!isAuthenticated && currentPage === 'register' && <RegisterPage setCurrentPage={setCurrentPage} />}


      {/* Main Pages */}
      {isAuthenticated && currentPage === 'events' && <EventsPage onSelectEvent={handleViewEventDetail} />}
      {isAuthenticated && currentPage === 'create-event' && user?.role === 'organizer' && (
        <CreateEventPage setCurrentPage={setCurrentPage} />
      )}
      {isAuthenticated && currentPage === 'event-detail' && selectedEventId && (
        <EventDetailPage eventId={selectedEventId} onBack={handleBackFromDetail} setCurrentPage={setCurrentPage} />
      )}
      {isAuthenticated && currentPage === 'profile' && <ProfilePage setCurrentPage={setCurrentPage} />}
      {isAuthenticated && currentPage === 'teams' && <TeamPage setCurrentPage={setCurrentPage} />}
    </>
  )
}


function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}


export default App
