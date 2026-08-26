import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage       from './pages/LoginPage.jsx'
import SignupPage      from './pages/SignupPage.jsx'
import HomePage        from './pages/HomePage.jsx'
import BookingPage     from './pages/BookingPage.jsx'
import RideHistoryPage from './pages/RideHistoryPage.jsx'
import ProfilePage     from './pages/ProfilePage.jsx'
import SupportChatPage from './pages/SupportChatPage.jsx'
import ProtectedRoute  from './components/ProtectedRoute.jsx'
import Navbar          from './components/Navbar.jsx'

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public */}
        <Route path="/login"  element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Protected — with Navbar */}
        <Route path="/" element={<ProtectedRoute><Navbar /><HomePage /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute><Navbar /><RideHistoryPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Navbar /><ProfilePage /></ProtectedRoute>} />
        <Route path="/support" element={<ProtectedRoute><Navbar /><SupportChatPage /></ProtectedRoute>} />

        {/* Booking — full-screen map, no shared Navbar */}
        <Route path="/book" element={<ProtectedRoute><BookingPage /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}
