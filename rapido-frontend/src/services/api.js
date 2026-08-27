import axios from 'axios'

/**
 * API base URL:
 *  - Dev (npm run dev):      empty string → Vite proxy forwards /api → http://localhost:8080
 *  - Prod (served by SB):    empty string → same-origin /api requests
 *  - Prod (Vercel frontend): set VITE_API_URL env var to your Railway/Render backend URL
 *                            e.g. https://rapido-backend.up.railway.app
 */
const BASE_URL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api'

// Create Axios instance
const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// ── Request interceptor — attach JWT from localStorage ────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ── Response interceptor — handle 401 (token expired) ────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// ─────────────────────────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (phoneNumber, password) =>
    api.post('/auth/login', { phoneNumber, password }),

  signup: (data) => api.post('/auth/signup', data),

  /**
   * Verify the OTP sent to the user's phone after normal form signup.
   * Returns a real JWT on success.
   * @param {string} phoneNumber
   * @param {string|number} otp
   */
  verifySignupOtp: (phoneNumber, otp) =>
    api.post('/auth/verify-signup-otp', { phoneNumber, otp }),

  /**
   * Handle Google OAuth credential on the backend.
   * Sends the decoded Google user info (googleId, name, email, picture)
   * obtained from the Google Identity Services JWT.
   * @param {{ googleId: string, name: string, email: string, picture: string }} googleUser
   */
  googleSignup: (googleUser) =>
    api.post('/auth/google-callback', googleUser),

  /**
   * Save a real phone number to a Google-authenticated account (no OTP).
   * Requires the tempToken from googleSignup to be set in localStorage.
   * @param {string} phoneNumber
   */
  savePhone: (phoneNumber) =>
    api.post('/auth/save-phone', { phoneNumber }),

  /**
   * Send (or resend) an OTP to an existing user's phone — used for OTP login.
   * @param {string} phoneNumber
   */
  sendOtp: (phoneNumber) =>
    api.post('/auth/send-otp', { phoneNumber }),

  /**
   * Verify an OTP for login (existing user) or Google phone linking.
   * @param {string} phoneNumber
   * @param {string|number} otp
   */
  verifyOtp: (phoneNumber, otp) =>
    api.post('/auth/verify-otp', { phoneNumber, otp }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Rides
// ─────────────────────────────────────────────────────────────────────────────

export const rideApi = {
  estimateFare: (pickup, drop) =>
    api.post('/ride/estimate', { pickup, drop }),

  bookRide: (pickupLocation, dropLocation, vehicleType) =>
    api.post('/ride/book', { pickupLocation, dropLocation, vehicleType }),

  getNearby: (vehicleType) =>
    api.get(`/ride/nearby/${vehicleType}`),

  getRideHistory: () => api.get('/ride/history'),

  /**
   * Submit a problem report for a completed ride.
   * @param {{ rideId, category, description, driverName, vehicleNumber }} data
   */
  reportProblem: (data) => api.post('/ride/report', data),

  /** Get all reports submitted by the logged-in user */
  getMyReports: () => api.get('/ride/reports'),
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth helpers
// ─────────────────────────────────────────────────────────────────────────────

export const saveAuthData = (authResponse) => {
  localStorage.setItem('token', authResponse.token)
  localStorage.setItem('user', JSON.stringify({
    userId: authResponse.userId,
    name: authResponse.name,
    phoneNumber: authResponse.phoneNumber,
    email: authResponse.email,
  }))
}

export const getUser = () => {
  const raw = localStorage.getItem('user')
  return raw ? JSON.parse(raw) : null
}

export const isLoggedIn = () => !!localStorage.getItem('token')

export const logout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}

export default api
