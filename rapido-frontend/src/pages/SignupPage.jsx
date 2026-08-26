import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi, saveAuthData } from '../services/api.js'
import api from '../services/api.js'

// ── Load Google Identity Services SDK ────────────────────────────────────────
function loadGoogleScript() {
  return new Promise((resolve) => {
    if (window.google?.accounts?.id) return resolve(true)
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.defer = true
    s.onload = () => resolve(true)
    s.onerror = () => resolve(false)
    document.head.appendChild(s)
  })
}

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID || '958477394526-r2rrdejev42hpt3a9imi5a2fbfspfpsh.apps.googleusercontent.com'

/* ─── Default fallback coordinates: Bengaluru city centre ─────────────────── */
const BENGALURU_LAT = '12.9716'
const BENGALURU_LNG = '77.5946'

/* ─── Inline style objects ─────────────────────────────────────────────────── */
const S = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    background: 'linear-gradient(160deg, var(--black) 0%, #0d0d1a 40%, #111827 100%)',
    padding: '28px 16px 40px',
    fontFamily: 'var(--font)',
  },
  card: {
    width: '100%',
    maxWidth: '460px',
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: '24px',
    padding: '36px 32px 32px',
    boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
    animation: 'slideUp 0.35s var(--ease) both',
  },
  logoSection: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' },
  boltWrap: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: '52px', height: '52px', borderRadius: '50%', background: 'var(--yellow)',
    boxShadow: '0 0 24px rgba(255,214,0,0.40)', flexShrink: 0,
  },
  boltEmoji: { fontSize: '26px', lineHeight: 1 },
  appName: {
    display: 'block', fontSize: '24px', fontWeight: '900', color: 'var(--yellow)',
    letterSpacing: '-0.3px', lineHeight: 1.1, textShadow: '0 0 18px rgba(255,214,0,0.30)',
  },
  tagline: { display: 'block', fontSize: '12px', color: 'var(--muted)', marginTop: '3px', letterSpacing: '0.4px' },
  title: { fontSize: '20px', fontWeight: '700', color: 'var(--text)', marginBottom: '20px', marginTop: 0 },
  formGroup: { marginBottom: '14px' },
  label: {
    display: 'block', fontSize: '11.5px', fontWeight: '600', color: 'var(--muted)',
    letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: '6px',
  },
  input: {
    width: '100%', padding: '12px 15px', background: 'var(--dark)',
    border: '1.5px solid var(--border)', borderRadius: '11px',
    color: 'var(--text)', fontSize: '15px', outline: 'none',
    transition: 'border-color 0.18s, box-shadow 0.18s', boxSizing: 'border-box',
  },
  passwordWrap: { position: 'relative' },
  passwordInput: {
    width: '100%', padding: '12px 46px 12px 15px', background: 'var(--dark)',
    border: '1.5px solid var(--border)', borderRadius: '11px',
    color: 'var(--text)', fontSize: '15px', outline: 'none',
    transition: 'border-color 0.18s, box-shadow 0.18s', boxSizing: 'border-box',
  },
  eyeBtn: {
    position: 'absolute', right: '11px', top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
    lineHeight: 1, fontSize: '17px', color: 'var(--muted)', transition: 'color 0.15s',
  },
  locationSection: {
    marginTop: '6px', marginBottom: '14px', padding: '16px',
    background: 'rgba(255,214,0,0.04)', border: '1px solid rgba(255,214,0,0.14)', borderRadius: '14px',
  },
  locationTitle: {
    fontSize: '12px', fontWeight: '600', color: 'var(--muted)',
    letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '10px',
  },
  detectBtn: {
    width: '100%', padding: '11px 15px', background: 'rgba(255,214,0,0.10)',
    border: '1.5px solid rgba(255,214,0,0.30)', borderRadius: '11px',
    color: 'var(--yellow)', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    transition: 'background 0.15s, border-color 0.15s', marginBottom: '10px',
  },
  detectBtnDisabled: { opacity: 0.55, cursor: 'not-allowed' },
  detectedBadge: {
    display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 12px',
    background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.25)',
    borderRadius: '9px', fontSize: '13px', color: 'var(--green)', fontWeight: '600', marginBottom: '10px',
  },
  coordRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
  coordLabel: {
    display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--muted)',
    letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '5px',
  },
  coordInput: {
    width: '100%', padding: '10px 12px', background: 'var(--dark)',
    border: '1.5px solid var(--border)', borderRadius: '10px',
    color: 'var(--text)', fontSize: '14px', outline: 'none',
    transition: 'border-color 0.18s, box-shadow 0.18s', boxSizing: 'border-box',
  },
  coordHint: { fontSize: '11px', color: 'var(--muted)', marginTop: '6px', textAlign: 'center' },
  passwordMatch: {
    fontSize: '12px', color: 'var(--green)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px',
  },
  passwordMismatch: {
    fontSize: '12px', color: 'var(--red)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px',
  },
  errorBox: {
    marginTop: '14px', padding: '11px 14px', background: 'rgba(239,68,68,0.12)',
    border: '1px solid rgba(239,68,68,0.35)', borderRadius: '10px',
    color: 'var(--red)', fontSize: '13.5px', display: 'flex', alignItems: 'center', gap: '8px',
  },
  successBox: {
    marginTop: '14px', padding: '11px 14px', background: 'rgba(34,197,94,0.10)',
    border: '1px solid rgba(34,197,94,0.30)', borderRadius: '10px',
    color: 'var(--green)', fontSize: '13.5px', display: 'flex', alignItems: 'center', gap: '8px',
  },
  submitBtn: {
    marginTop: '20px', width: '100%', padding: '15px', background: 'var(--yellow)',
    color: 'var(--black)', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: '800',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
    letterSpacing: '0.3px', boxShadow: '0 4px 20px rgba(255,214,0,0.35)', transition: 'opacity 0.15s, transform 0.15s',
  },
  submitBtnDisabled: { opacity: 0.65, cursor: 'not-allowed' },
  spinner: {
    width: '17px', height: '17px', border: '2.5px solid rgba(0,0,0,0.25)',
    borderTopColor: 'var(--black)', borderRadius: '50%', display: 'inline-block',
    animation: 'spin 0.7s linear infinite',
  },
  bottomText: { textAlign: 'center', marginTop: '20px', fontSize: '14px', color: 'var(--muted)' },
  link: { color: 'var(--yellow)', fontWeight: '700', textDecoration: 'none' },
  divider: { position: 'relative', textAlign: 'center', margin: '20px 0 16px' },
  dividerLine: { position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.08)' },
  dividerText: { background: 'var(--card)', padding: '0 12px', color: 'rgba(255,255,255,0.3)', fontSize: 12, position: 'relative' },

  /* OTP screen specific */
  otpHint: { fontSize: '13px', color: 'var(--muted)', marginBottom: '20px' },
  otpInput: {
    width: '100%', padding: '16px', background: 'var(--dark)',
    border: '1.5px solid var(--border)', borderRadius: '14px',
    color: 'var(--text)', fontSize: '28px', letterSpacing: '12px', textAlign: 'center',
    outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.18s, box-shadow 0.18s',
  },
  devOtpBadge: {
    display: 'inline-block', marginTop: '10px', padding: '6px 12px',
    background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.30)',
    borderRadius: '8px', fontSize: '12px', color: '#FBB724', fontWeight: 600,
  },
  timerText: { fontSize: '13px', color: 'var(--muted)', textAlign: 'center', marginTop: '10px' },
  resendBtn: {
    background: 'none', border: 'none', color: 'var(--yellow)', cursor: 'pointer',
    fontSize: '13px', fontWeight: '600', padding: 0, marginTop: '10px', display: 'block', width: '100%', textAlign: 'center',
  },

  /* Google button */
  googleBtn: {
    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
    background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.1)',
    color: 'white', borderRadius: 14, padding: '13px 20px', fontSize: 15, fontWeight: 600,
    cursor: 'pointer', transition: 'background 0.2s, border-color 0.2s',
  },

  /* Google phone-link screen */
  googleUserBanner: {
    display: 'flex', alignItems: 'center', gap: 12,
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 14, padding: '12px 16px', marginBottom: 20,
  },
  gAvatar: {
    width: 42, height: 42, background: 'linear-gradient(135deg,#FFD700,#FFA000)',
    borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#111', fontWeight: 800, fontSize: 18, flexShrink: 0,
  },
  gBadge: {
    marginLeft: 'auto', background: 'rgba(66,133,244,0.15)',
    border: '1px solid rgba(66,133,244,0.3)', color: '#4285F4',
    borderRadius: 8, padding: '3px 10px', fontSize: 11, fontWeight: 700,
  },
}

// ── Brand logo section (shared) ───────────────────────────────────────────────
function BrandHeader() {
  return (
    <div style={S.logoSection}>
      <div style={S.boltWrap}><span style={S.boltEmoji}>⚡</span></div>
      <div>
        <span style={S.appName}>CABkaro</span>
        <span style={S.tagline}>Your ride, your way</span>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
export default function SignupPage() {
  const navigate = useNavigate()

  // ── Screen state: 'form' | 'otp' | 'google-phone' ───────────────────────
  const [screen, setScreen] = useState('form')

  // ── Normal signup form ────────────────────────────────────────────────────
  const [form, setForm] = useState({
    name: '', phoneNumber: '', email: '',
    password: '', confirmPassword: '', latitude: '', longitude: '',
  })
  const [showPassword,        setShowPassword]        = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // ── Post-signup OTP verification ──────────────────────────────────────────
  const [signupOtp,       setSignupOtp]       = useState('')
  const [signupOtpValue,  setSignupOtpValue]  = useState('') // dev mode
  const [signupPhoneRef,  setSignupPhoneRef]  = useState('') // phone used during signup
  const [otpTimer,        setOtpTimer]        = useState(0)

  // ── Google OAuth flow ─────────────────────────────────────────────────────
  const [googleUser,      setGoogleUser]      = useState(null) // { name, email }
  const [googlePhone,     setGooglePhone]     = useState('')
  const [googleTempToken, setGoogleTempToken] = useState('')

  // ── Shared UI state ───────────────────────────────────────────────────────
  const [error,           setError]           = useState('')
  const [loading,         setLoading]         = useState(false)
  const [detecting,       setDetecting]       = useState(false)
  const [locationDetected,setLocationDetected]= useState(false)
  const [inputFocus,      setInputFocus]      = useState({})

  // ── OTP countdown ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (otpTimer <= 0) return
    const t = setTimeout(() => setOtpTimer(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [otpTimer])

  // ── Google SDK init ───────────────────────────────────────────────────────
  useEffect(() => {
    loadGoogleScript().then(ok => {
      if (!ok || !window.google?.accounts?.id) return
      if (GOOGLE_CLIENT_ID.includes('YOUR_GOOGLE_CLIENT_ID')) return

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential,
        auto_select: false,
      })
      // Render the official button inside #google-signup-btn
      const container = document.getElementById('google-signup-btn')
      if (container) {
        window.google.accounts.id.renderButton(container, {
          theme: 'filled_black', size: 'large', shape: 'pill',
          width: 360, text: 'signup_with',
        })
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handle Google credential ───────────────────────────────────────────────
  const handleGoogleCredential = async (credentialResponse) => {
    setError('')
    setLoading(true)
    try {
      const payload = JSON.parse(atob(credentialResponse.credential.split('.')[1]))
      const gUser = {
        googleId: payload.sub,
        name:     payload.name,
        email:    payload.email,
        picture:  payload.picture,
      }
      const res = await api.post('/auth/google-callback', gUser)

      if (res.data.needsPhone) {
        // New user — store temp token and show phone-entry screen
        setGoogleUser({ name: gUser.name, email: gUser.email })
        setGoogleTempToken(res.data.tempToken)
        localStorage.setItem('token', res.data.tempToken)
        setScreen('google-phone')
      } else {
        // Returning user — already has phone, log in directly
        saveAuthData(res.data)
        navigate('/')
      }
    } catch (e) {
      setError('Google sign-up failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Save phone number after Google sign-up (no OTP) ──────────────────────
  const handleSaveGooglePhone = async () => {
    if (!googlePhone.trim() || googlePhone.trim().length < 10) {
      setError('Enter a valid 10-digit phone number')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/auth/save-phone', { phoneNumber: googlePhone.trim() })
      saveAuthData({
        token:       res.data.token,
        name:        res.data.name,
        email:       res.data.email,
        phoneNumber: res.data.phoneNumber,
        userId:      res.data.userId,
      })
      navigate('/')
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to save phone. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    if (error) setError('')
  }
  const handleFocus = (name) => setInputFocus(p => ({ ...p, [name]: true }))
  const handleBlur  = (name) => setInputFocus(p => ({ ...p, [name]: false }))
  const focusStyle  = (name) =>
    inputFocus[name]
      ? { borderColor: 'var(--yellow)', boxShadow: '0 0 0 3px rgba(255,214,0,0.16)' }
      : {}

  // ── Geolocation ───────────────────────────────────────────────────────────
  const detectLocation = () => {
    if (!navigator.geolocation) { setError('Geolocation is not supported.'); return }
    setDetecting(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(prev => ({
          ...prev,
          latitude:  pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }))
        setLocationDetected(true)
        setDetecting(false)
      },
      () => {
        setForm(prev => ({ ...prev, latitude: BENGALURU_LAT, longitude: BENGALURU_LNG }))
        setLocationDetected(false)
        setDetecting(false)
      },
      { timeout: 8000 }
    )
  }

  const passwordsEntered = form.password.length > 0 && form.confirmPassword.length > 0
  const passwordsMatch   = form.password === form.confirmPassword

  // ── Normal form submit — calls /api/auth/signup ───────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim())        { setError('Full name is required');                   return }
    if (!form.phoneNumber.trim()) { setError('Phone number is required');                return }
    if (!form.email.trim())       { setError('Email address is required');               return }
    if (!form.password)           { setError('Password is required');                    return }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return }
    if (!form.confirmPassword)    { setError('Please confirm your password');            return }
    if (!passwordsMatch)          { setError('Passwords do not match');                  return }

    setLoading(true)
    setError('')

    try {
      const payload = {
        name:        form.name.trim(),
        phoneNumber: form.phoneNumber.trim(),
        email:       form.email.trim().toLowerCase(),
        password:    form.password,
        latitude:    parseFloat(form.latitude)  || parseFloat(BENGALURU_LAT),
        longitude:   parseFloat(form.longitude) || parseFloat(BENGALURU_LNG),
      }

      const res = await authApi.signup(payload)

      if (res.data.needsPhoneVerification) {
        // Store the temp token so the verify-signup-otp call is authenticated
        localStorage.setItem('token', res.data.token)
        setSignupPhoneRef(form.phoneNumber.trim())
        if (res.data.otp) setSignupOtpValue(String(res.data.otp)) // dev only
        setOtpTimer(30)
        setScreen('otp')
      } else {
        // Should not happen in normal flow, but handle gracefully
        saveAuthData(res.data)
        navigate('/')
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        (err.response?.status === 409
          ? 'An account with this phone/email already exists.'
          : 'Signup failed. Please try again.')
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // ── Verify OTP after normal signup ────────────────────────────────────────
  const handleVerifySignupOtp = async () => {
    if (!signupOtp.trim()) { setError('Enter the OTP sent to your phone'); return }
    setError('')
    setLoading(true)
    try {
      const res = await authApi.verifySignupOtp(signupPhoneRef, signupOtp)
      saveAuthData(res.data)
      navigate('/')
    } catch (e) {
      setError(e.response?.data?.message || 'Invalid or expired OTP')
    } finally {
      setLoading(false)
    }
  }

  // ── Resend OTP (calls /send-otp) ──────────────────────────────────────────
  const handleResendOtp = async () => {
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/auth/send-otp', { phoneNumber: signupPhoneRef })
      if (res.data.otp) setSignupOtpValue(String(res.data.otp)) // dev only
      setOtpTimer(30)
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to resend OTP')
    } finally {
      setLoading(false)
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SCREEN: OTP verification after normal form signup
  // ═══════════════════════════════════════════════════════════════════════════
  if (screen === 'otp') {
    return (
      <div style={S.wrapper}>
        <div style={S.card}>
          <BrandHeader />
          <h2 style={S.title}>Verify your phone 📲</h2>
          <p style={S.otpHint}>
            We sent a 6-digit OTP to <strong style={{ color: 'var(--yellow)' }}>{signupPhoneRef}</strong>.
            Enter it below to complete your signup.
          </p>

          <div style={S.formGroup}>
            <label style={S.label}>6-Digit OTP</label>
            <input
              type="number"
              placeholder="• • • • • •"
              value={signupOtp}
              onChange={e => { setSignupOtp(e.target.value); setError('') }}
              onFocus={() => handleFocus('signupOtp')}
              onBlur={() => handleBlur('signupOtp')}
              maxLength={6}
              style={{ ...S.otpInput, ...focusStyle('signupOtp') }}
              autoFocus
            />
            {/* Dev-mode OTP hint */}
            {signupOtpValue && (
              <div style={{ textAlign: 'center' }}>
                <span style={S.devOtpBadge}>🔧 Dev OTP: <strong>{signupOtpValue}</strong></span>
              </div>
            )}
          </div>

          {error && (
            <div style={S.errorBox} role="alert">
              <span>⚠️</span><span>{error}</span>
            </div>
          )}

          <button
            style={{ ...S.submitBtn, ...(loading ? S.submitBtnDisabled : {}) }}
            onClick={handleVerifySignupOtp}
            disabled={loading}
          >
            {loading ? <><span style={S.spinner} /> Verifying…</> : '✅ Verify & Continue'}
          </button>

          <div style={{ textAlign: 'center' }}>
            {otpTimer > 0
              ? <p style={S.timerText}>Resend OTP in {otpTimer}s</p>
              : <button style={S.resendBtn} onClick={handleResendOtp} disabled={loading}>
                  ↺ Resend OTP
                </button>
            }
          </div>

          <p style={S.bottomText}>
            Wrong number?{' '}
            <button
              style={{ ...S.link, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              onClick={() => { setScreen('form'); setSignupOtp(''); setError('') }}
            >
              Go back
            </button>
          </p>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SCREEN: Enter phone number after Google sign-up (no OTP)
  // ═══════════════════════════════════════════════════════════════════════════
  if (screen === 'google-phone') {
    return (
      <div style={S.wrapper}>
        <div style={S.card}>
          <BrandHeader />

          {/* Google user badge */}
          <div style={S.googleUserBanner}>
            <div style={S.gAvatar}>{googleUser?.name?.[0]?.toUpperCase() || 'G'}</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{googleUser?.name}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{googleUser?.email}</div>
            </div>
            <div style={S.gBadge}>Google</div>
          </div>

          <h2 style={S.title}>Add your phone number 📱</h2>
          <p style={S.otpHint}>
            Enter your mobile number to complete sign-up. This will be your login number.
          </p>

          <div style={S.formGroup}>
            <label style={S.label}>Mobile Number</label>
            <input
              type="tel"
              placeholder="9876543210"
              value={googlePhone}
              onChange={e => { setGooglePhone(e.target.value.replace(/\D/g, '')); setError('') }}
              onFocus={() => setInputFocus(p => ({ ...p, gphone: true }))}
              onBlur={() => setInputFocus(p => ({ ...p, gphone: false }))}
              maxLength={10}
              style={{
                ...S.input,
                ...(inputFocus.gphone ? { borderColor: 'var(--yellow)', boxShadow: '0 0 0 3px rgba(255,214,0,0.16)' } : {}),
              }}
              autoFocus
            />
          </div>

          {error && (
            <div style={S.errorBox} role="alert">
              <span>⚠️</span><span>{error}</span>
            </div>
          )}

          <button
            style={{ ...S.submitBtn, ...(loading ? S.submitBtnDisabled : {}) }}
            onClick={handleSaveGooglePhone}
            disabled={loading}
          >
            {loading ? <><span style={S.spinner} /> Saving…</> : '✅ Save & Continue'}
          </button>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SCREEN: Main signup form
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div style={S.wrapper}>
      <div style={S.card}>

        <BrandHeader />

        <h2 style={S.title}>Create an account</h2>

        <form onSubmit={handleSubmit} noValidate>

          {/* Full Name */}
          <div style={S.formGroup}>
            <label style={S.label} htmlFor="name">Full Name</label>
            <input
              id="name" name="name" type="text" placeholder="John Doe"
              value={form.name} onChange={handleChange}
              onFocus={() => handleFocus('name')} onBlur={() => handleBlur('name')}
              autoComplete="name"
              style={{ ...S.input, ...focusStyle('name') }}
            />
          </div>

          {/* Phone */}
          <div style={S.formGroup}>
            <label style={S.label} htmlFor="phoneNumber">Phone Number</label>
            <input
              id="phoneNumber" name="phoneNumber" type="tel" placeholder="+91 98765 43210"
              value={form.phoneNumber} onChange={handleChange}
              onFocus={() => handleFocus('phoneNumber')} onBlur={() => handleBlur('phoneNumber')}
              autoComplete="tel"
              style={{ ...S.input, ...focusStyle('phoneNumber') }}
            />
          </div>

          {/* Email */}
          <div style={S.formGroup}>
            <label style={S.label} htmlFor="email">Email Address</label>
            <input
              id="email" name="email" type="email" placeholder="you@example.com"
              value={form.email} onChange={handleChange}
              onFocus={() => handleFocus('email')} onBlur={() => handleBlur('email')}
              autoComplete="email"
              style={{ ...S.input, ...focusStyle('email') }}
            />
          </div>

          {/* Password */}
          <div style={S.formGroup}>
            <label style={S.label} htmlFor="password">Password</label>
            <div style={S.passwordWrap}>
              <input
                id="password" name="password"
                type={showPassword ? 'text' : 'password'} placeholder="Min 6 characters"
                value={form.password} onChange={handleChange}
                onFocus={() => handleFocus('password')} onBlur={() => handleBlur('password')}
                autoComplete="new-password"
                style={{ ...S.passwordInput, ...focusStyle('password') }}
              />
              <button type="button" style={S.eyeBtn}
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div style={S.formGroup}>
            <label style={S.label} htmlFor="confirmPassword">Confirm Password</label>
            <div style={S.passwordWrap}>
              <input
                id="confirmPassword" name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'} placeholder="Repeat your password"
                value={form.confirmPassword} onChange={handleChange}
                onFocus={() => handleFocus('confirmPassword')} onBlur={() => handleBlur('confirmPassword')}
                autoComplete="new-password"
                style={{
                  ...S.passwordInput, ...focusStyle('confirmPassword'),
                  ...(passwordsEntered && !passwordsMatch ? { borderColor: 'var(--red)' } : {}),
                  ...(passwordsEntered && passwordsMatch  ? { borderColor: 'var(--green)' } : {}),
                }}
              />
              <button type="button" style={S.eyeBtn}
                onClick={() => setShowConfirmPassword(v => !v)}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {passwordsEntered && (
              <div style={passwordsMatch ? S.passwordMatch : S.passwordMismatch}>
                {passwordsMatch ? '✅ Passwords match' : '❌ Passwords do not match'}
              </div>
            )}
          </div>

          {/* Location section */}
          <div style={S.locationSection}>
            <div style={S.locationTitle}>📍 Your Location</div>
            <button
              type="button"
              style={{ ...S.detectBtn, ...(detecting ? S.detectBtnDisabled : {}) }}
              onClick={detectLocation} disabled={detecting}
            >
              {detecting ? '📡 Detecting…' : '📍 Detect My Location'}
            </button>
            {form.latitude && form.longitude && (
              <div style={S.detectedBadge}>
                <span>✅</span>
                <span>
                  Using: <strong>{parseFloat(form.latitude).toFixed(4)}</strong>,{' '}
                  <strong>{parseFloat(form.longitude).toFixed(4)}</strong>
                  {!locationDetected && (
                    <span style={{ color: 'var(--muted)', fontWeight: 400, marginLeft: '6px' }}>
                      (Bengaluru default)
                    </span>
                  )}
                </span>
              </div>
            )}
            <div style={S.coordRow}>
              <div>
                <label style={S.coordLabel} htmlFor="latitude">Latitude</label>
                <input
                  id="latitude" name="latitude" type="number" step="any" placeholder="12.9716"
                  value={form.latitude} onChange={handleChange}
                  onFocus={() => handleFocus('latitude')} onBlur={() => handleBlur('latitude')}
                  style={{ ...S.coordInput, ...focusStyle('latitude') }}
                />
              </div>
              <div>
                <label style={S.coordLabel} htmlFor="longitude">Longitude</label>
                <input
                  id="longitude" name="longitude" type="number" step="any" placeholder="77.5946"
                  value={form.longitude} onChange={handleChange}
                  onFocus={() => handleFocus('longitude')} onBlur={() => handleBlur('longitude')}
                  style={{ ...S.coordInput, ...focusStyle('longitude') }}
                />
              </div>
            </div>
            <p style={S.coordHint}>Defaults to Bengaluru if location access is denied</p>
          </div>

          {/* Error alert */}
          {error && (
            <div style={S.errorBox} role="alert">
              <span>⚠️</span><span>{error}</span>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit" disabled={loading}
            style={{ ...S.submitBtn, ...(loading ? S.submitBtnDisabled : {}) }}
          >
            {loading
              ? <><span style={S.spinner} /> Creating account…</>
              : '🎉 Create Account'
            }
          </button>
        </form>

        {/* Login link */}
        <p style={S.bottomText}>
          Already have an account?{' '}
          <Link to="/login" style={S.link}>Login</Link>
        </p>

        {/* Divider */}
        <div style={S.divider}>
          <div style={S.dividerLine} />
          <span style={S.dividerText}>OR</span>
        </div>

        {/* ── Google Sign-Up — rendered entirely by the Google Identity Services SDK ── */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div id="google-signup-btn" />
        </div>
      </div>
    </div>
  )
}
