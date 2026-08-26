import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi, saveAuthData, isLoggedIn } from '../services/api.js'
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

// ── Google Client ID — replace with your own from console.cloud.google.com ───
// For dev/demo: uses a placeholder that shows the button UI only
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '958477394526-r2rrdejev42hpt3a9imi5a2fbfspfpsh.apps.googleusercontent.com'

export default function LoginPage() {
  const navigate = useNavigate()

  // Login mode: 'password' | 'otp'
  const [mode, setMode]           = useState('password')

  // Password login
  const [phone, setPhone]         = useState('')
  const [password, setPassword]   = useState('')
  const [showPass, setShowPass]   = useState(false)

  // OTP login
  const [otpPhone, setOtpPhone]   = useState('')
  const [otp, setOtp]             = useState('')
  const [otpSent, setOtpSent]     = useState(false)
  const [otpValue, setOtpValue]   = useState('') // shown in dev mode
  const [otpTimer, setOtpTimer]   = useState(0)

  // Google OAuth — after OAuth if no phone: ask for phone
  const [googleUser, setGoogleUser]   = useState(null) // {name, email, googleId}
  const [googlePhone, setGooglePhone] = useState('')
  const [googleOtp, setGoogleOtp]     = useState('')
  const [googleOtpSent, setGoogleOtpSent] = useState(false)
  const [googleTempToken, setGoogleTempToken] = useState('')

  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [inputFocus, setFocus]  = useState({})

  // Redirect if already logged in
  useEffect(() => { if (isLoggedIn()) navigate('/', { replace: true }) }, [])

  // Countdown for OTP resend
  useEffect(() => {
    if (otpTimer <= 0) return
    const t = setTimeout(() => setOtpTimer(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [otpTimer])

  // ── Google SSO init ────────────────────────────────────────────────────────
  useEffect(() => {
    loadGoogleScript().then(ok => {
      if (!ok || !window.google?.accounts?.id) return
      if (GOOGLE_CLIENT_ID.includes('YOUR_GOOGLE_CLIENT_ID')) return // placeholder, skip init
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential,
        auto_select: false,
      })
      window.google.accounts.id.renderButton(
        document.getElementById('google-signin-btn'),
        { theme: 'filled_black', size: 'large', shape: 'pill', width: 340, text: 'signin_with' }
      )
    })
  }, [])

  // ── Handle Google credential response ─────────────────────────────────────
  const handleGoogleCredential = async (credentialResponse) => {
    setError('')
    setLoading(true)
    try {
      const payload = JSON.parse(atob(credentialResponse.credential.split('.')[1]))
      const gUser = { googleId: payload.sub, name: payload.name, email: payload.email, picture: payload.picture }

      const res = await api.post('/auth/google-callback', gUser)

      if (res.data.needsPhone) {
        // New Google user — needs to add a phone number (no OTP required)
        setGoogleUser({ name: gUser.name, email: gUser.email })
        setGoogleTempToken(res.data.tempToken)
        localStorage.setItem('token', res.data.tempToken)
      } else {
        // Returning user — log in directly
        saveAuthData(res.data)
        navigate('/')
      }
    } catch (e) {
      setError('Google login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Save phone number after Google sign-in (no OTP) ───────────────────────
  const handleSaveGooglePhone = async () => {
    if (!googlePhone.trim() || googlePhone.trim().length < 10) {
      setError('Enter a valid 10-digit phone number')
      return
    }
    setError(''); setLoading(true)
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
      setError(e.response?.data?.message || 'Failed to save phone. Try again.')
    } finally { setLoading(false) }
  }

  // ── Password login ─────────────────────────────────────────────────────────
  const handlePasswordLogin = async (e) => {
    e.preventDefault()
    if (!phone.trim()) { setError('Enter phone number'); return }
    if (!password)     { setError('Enter password');     return }
    setError(''); setLoading(true)
    try {
      const res = await authApi.login(phone.trim(), password)
      saveAuthData(res.data)
      navigate('/')
    } catch (e) {
      setError(e.response?.data?.message || 'Invalid phone or password')
    } finally { setLoading(false) }
  }

  // ── OTP login ─────────────────────────────────────────────────────────────
  const handleSendOtp = async () => {
    if (!otpPhone.trim() || otpPhone.length < 10) { setError('Enter a valid 10-digit phone'); return }
    setError(''); setLoading(true)
    try {
      const res = await api.post('/auth/send-otp', { phoneNumber: otpPhone })
      setOtpSent(true)
      setOtpTimer(30)
      if (res.data.otp) setOtpValue(String(res.data.otp)) // dev only
    } catch (e) {
      setError(e.response?.data?.message || 'User not found. Please signup first.')
    } finally { setLoading(false) }
  }

  const handleVerifyOtp = async () => {
    if (!otp.trim()) { setError('Enter the OTP'); return }
    setError(''); setLoading(true)
    try {
      const res = await api.post('/auth/verify-otp', { phoneNumber: otpPhone, otp })
      saveAuthData({ token: res.data.token, name: res.data.name, email: res.data.email, phoneNumber: otpPhone, userId: res.data.userId })
      navigate('/')
    } catch (e) {
      setError(e.response?.data?.message || 'Invalid or expired OTP')
    } finally { setLoading(false) }
  }

  const f = (name) => inputFocus[name]
    ? { borderColor: '#FFD700', boxShadow: '0 0 0 3px rgba(255,215,0,0.15)' }
    : {}

  // ══════════════════════════════════════════════════════════════════════════
  // GOOGLE PHONE SCREEN — collect phone number, no OTP required
  // ══════════════════════════════════════════════════════════════════════════
  if (googleUser) {
    return (
      <div style={S.wrap}>
        <div style={S.card}>
          <div style={S.logoRow}>
            <div style={S.bolt}>⚡</div>
            <span style={S.appName}>CABkaro</span>
          </div>

          <div style={S.googleUserBanner}>
            <div style={S.gAvatar}>{googleUser.name?.[0]?.toUpperCase() || 'G'}</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>{googleUser.name}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{googleUser.email}</div>
            </div>
            <div style={S.gBadge}>Google</div>
          </div>

          <h2 style={S.title}>Add your phone number 📱</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 20 }}>
            Enter your mobile number. It must be unique and will be used for future logins.
          </p>

          <div style={S.formGroup}>
            <label style={S.label}>Mobile Number</label>
            <input
              style={{ ...S.input, ...f('gphone') }}
              type="tel" placeholder="9876543210"
              value={googlePhone}
              onChange={e => { setGooglePhone(e.target.value.replace(/\D/g, '')); setError('') }}
              onFocus={() => setFocus(p => ({ ...p, gphone: true }))}
              onBlur={() => setFocus(p => ({ ...p, gphone: false }))}
              maxLength={10}
              autoFocus
            />
          </div>

          {error && <div style={S.errBox}>⚠️ {error}</div>}

          <button style={S.submitBtn} onClick={handleSaveGooglePhone} disabled={loading}>
            {loading ? <><span style={S.spinner}/> Saving…</> : '✅ Save & Continue'}
          </button>
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MAIN LOGIN SCREEN
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div style={S.wrap}>
      <div style={S.card}>

        {/* Brand */}
        <div style={S.logoSection}>
          <div style={S.boltWrap}><span style={{ fontSize: 36 }}>⚡</span></div>
          <span style={S.appName}>CABkaro</span>
          <span style={S.tagline}>Your ride, your way</span>
        </div>

        <h2 style={S.title}>Welcome back</h2>

        {/* Mode tabs */}
        <div style={S.modeTabs}>
          <button style={{ ...S.modeTab, ...(mode === 'password' ? S.modeTabActive : {}) }} onClick={() => { setMode('password'); setError('') }}>
            🔑 Password
          </button>
          <button style={{ ...S.modeTab, ...(mode === 'otp' ? S.modeTabActive : {}) }} onClick={() => { setMode('otp'); setError('') }}>
            📲 OTP Login
          </button>
        </div>

        {/* ── Password login ── */}
        {mode === 'password' && (
          <form onSubmit={handlePasswordLogin} noValidate>
            <div style={S.formGroup}>
              <label style={S.label}>Phone Number</label>
              <input
                type="tel" placeholder="9876543210"
                value={phone}
                onChange={e => { setPhone(e.target.value); setError('') }}
                onFocus={() => setFocus(p => ({ ...p, phone: true }))}
                onBlur={() => setFocus(p => ({ ...p, phone: false }))}
                style={{ ...S.input, ...f('phone') }}
                autoComplete="tel"
              />
            </div>
            <div style={S.formGroup}>
              <label style={S.label}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  onFocus={() => setFocus(p => ({ ...p, pass: true }))}
                  onBlur={() => setFocus(p => ({ ...p, pass: false }))}
                  style={{ ...S.input, paddingRight: 44, ...f('pass') }}
                  autoComplete="current-password"
                />
                <button type="button" style={S.eyeBtn} onClick={() => setShowPass(v => !v)}>
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            {error && <div style={S.errBox}>⚠️ {error}</div>}
            <button type="submit" style={S.submitBtn} disabled={loading}>
              {loading ? <><span style={S.spinner}/> Logging in…</> : '🚀 Login'}
            </button>
          </form>
        )}

        {/* ── OTP login ── */}
        {mode === 'otp' && (
          <div>
            <div style={S.formGroup}>
              <label style={S.label}>Phone Number</label>
              <input
                type="tel" placeholder="9876543210"
                value={otpPhone}
                onChange={e => { setOtpPhone(e.target.value); setError('') }}
                onFocus={() => setFocus(p => ({ ...p, otpph: true }))}
                onBlur={() => setFocus(p => ({ ...p, otpph: false }))}
                style={{ ...S.input, ...f('otpph') }}
                disabled={otpSent}
              />
            </div>
            {!otpSent ? (
              <button style={S.submitBtn} onClick={handleSendOtp} disabled={loading}>
                {loading ? <><span style={S.spinner}/> Sending…</> : '📲 Send OTP'}
              </button>
            ) : (
              <>
                <div style={S.formGroup}>
                  <label style={S.label}>Enter 6-digit OTP</label>
                  <input
                    type="number"
                    placeholder="• • • • • •"
                    value={otp}
                    onChange={e => { setOtp(e.target.value); setError('') }}
                    onFocus={() => setFocus(p => ({ ...p, otp: true }))}
                    onBlur={() => setFocus(p => ({ ...p, otp: false }))}
                    style={{ ...S.input, letterSpacing: 10, fontSize: 22, textAlign: 'center', ...f('otp') }}
                    maxLength={6}
                  />
                  {otpValue && <p style={S.devOtp}>Dev mode OTP: <b>{otpValue}</b></p>}
                </div>
                <button style={S.submitBtn} onClick={handleVerifyOtp} disabled={loading}>
                  {loading ? <><span style={S.spinner}/> Verifying…</> : '✓ Verify OTP & Login'}
                </button>
                <div style={{ textAlign: 'center', marginTop: 12 }}>
                  {otpTimer > 0
                    ? <span style={S.timerText}>Resend in {otpTimer}s</span>
                    : <button style={S.resendBtn} onClick={() => { setOtpSent(false); setOtp(''); setOtpValue('') }}>↺ Resend OTP</button>
                  }
                </div>
              </>
            )}
            {error && <div style={S.errBox}>⚠️ {error}</div>}
          </div>
        )}

        {/* ── Divider ── */}
        <div style={S.divider}><span style={S.dividerText}>OR</span></div>

        {/* ── Google Sign-In — rendered entirely by the Google Identity Services SDK ── */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div id="google-signin-btn" />
        </div>

        {/* Signup link */}
        <p style={S.bottomText}>
          Don't have an account?{' '}
          <Link to="/signup" style={S.link}>Sign up free</Link>
        </p>
      </div>
    </div>
  )
}

const S = {
  wrap: { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(160deg,#0a0a0a 0%,#0d0d1a 40%,#111827 100%)', padding:'24px 16px' },
  card: { width:'100%', maxWidth:420, background:'#111', border:'1px solid rgba(255,255,255,0.07)', borderRadius:24, padding:'40px 32px 36px', boxShadow:'0 24px 64px rgba(0,0,0,0.6)' },
  logoSection: { textAlign:'center', marginBottom:32 },
  logoRow: { display:'flex', alignItems:'center', justifyContent:'center', gap:12, marginBottom:24 },
  boltWrap: { display:'inline-flex', alignItems:'center', justifyContent:'center', width:72, height:72, borderRadius:'50%', background:'#FFD700', boxShadow:'0 0 32px rgba(255,215,0,0.4)', marginBottom:14 },
  bolt: { width:44, height:44, background:'#FFD700', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 },
  appName: { display:'block', fontSize:32, fontWeight:900, color:'#FFD700', letterSpacing:'-0.5px' },
  tagline: { display:'block', fontSize:13, color:'rgba(255,255,255,0.5)', marginTop:6 },
  title: { fontSize:20, fontWeight:700, color:'white', marginBottom:20, marginTop:0 },

  modeTabs: { display:'flex', gap:4, background:'rgba(255,255,255,0.05)', borderRadius:12, padding:4, marginBottom:20 },
  modeTab: { flex:1, background:'none', border:'none', color:'rgba(255,255,255,0.5)', borderRadius:9, padding:'9px 12px', cursor:'pointer', fontSize:13, fontWeight:600 },
  modeTabActive: { background:'rgba(255,215,0,0.15)', color:'#FFD700' },

  formGroup: { marginBottom:16 },
  label: { display:'block', fontSize:12, fontWeight:600, color:'rgba(255,255,255,0.5)', letterSpacing:'0.6px', textTransform:'uppercase', marginBottom:7 },
  input: { width:'100%', padding:'13px 16px', background:'rgba(255,255,255,0.06)', border:'1.5px solid rgba(255,255,255,0.1)', borderRadius:12, color:'white', fontSize:15, outline:'none', boxSizing:'border-box', transition:'border-color 0.18s, box-shadow 0.18s' },
  eyeBtn: { position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:18, color:'rgba(255,255,255,0.4)' },
  errBox: { marginTop:12, padding:'11px 14px', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:10, color:'#FF5252', fontSize:13 },
  submitBtn: { marginTop:4, width:'100%', padding:15, background:'#FFD700', color:'#111', border:'none', borderRadius:14, fontSize:16, fontWeight:800, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:10, boxShadow:'0 4px 20px rgba(255,215,0,0.3)', marginBottom:4 },
  spinner: { width:18, height:18, border:'2.5px solid rgba(0,0,0,0.25)', borderTopColor:'#111', borderRadius:'50%', display:'inline-block', animation:'spin 0.7s linear infinite' },
  devOtp: { fontSize:12, color:'#4CAF50', marginTop:6, textAlign:'center' },
  timerText: { fontSize:13, color:'rgba(255,255,255,0.4)', textAlign:'center' },
  resendBtn: { background:'none', border:'none', color:'#FFD700', cursor:'pointer', fontSize:13, fontWeight:600, padding:0 },

  divider: { position:'relative', textAlign:'center', margin:'24px 0' },
  dividerText: { background:'#111', padding:'0 12px', color:'rgba(255,255,255,0.3)', fontSize:12, position:'relative', zIndex:1 },

  googleBtn: {
    width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:12,
    background:'rgba(255,255,255,0.07)', border:'1.5px solid rgba(255,255,255,0.12)',
    color:'white', borderRadius:14, padding:'13px 20px', fontSize:15, fontWeight:600,
    cursor:'pointer', transition:'background 0.2s, border-color 0.2s',
  },

  bottomText: { textAlign:'center', marginTop:22, fontSize:14, color:'rgba(255,255,255,0.5)' },
  link: { color:'#FFD700', fontWeight:700, textDecoration:'none' },

  // Google phone link screen
  googleUserBanner: { display:'flex', alignItems:'center', gap:12, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, padding:'12px 16px', marginBottom:20 },
  gAvatar: { width:42, height:42, background:'linear-gradient(135deg,#FFD700,#FFA000)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', color:'#111', fontWeight:800, fontSize:18, flexShrink:0 },
  gBadge: { marginLeft:'auto', background:'rgba(66,133,244,0.15)', border:'1px solid rgba(66,133,244,0.3)', color:'#4285F4', borderRadius:8, padding:'3px 10px', fontSize:11, fontWeight:700 },
}
