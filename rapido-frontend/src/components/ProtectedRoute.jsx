import React from 'react'
import { Navigate } from 'react-router-dom'
import { isLoggedIn } from '../services/api.js'

export default function ProtectedRoute({ children }) {
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />
  }
  return children
}
