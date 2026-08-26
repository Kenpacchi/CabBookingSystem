import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUser, logout } from '../services/api.js'

const QUICK_DESTINATIONS = [
  { icon: '🏠', label: 'Home',        poi: null,         sublabel: 'Saved location' },
  { icon: '💼', label: 'Work',        poi: null,         sublabel: 'Saved location' },
  { icon: '🏥', label: 'Hospital',    poi: 'hospital',   sublabel: 'Find nearby' },
  { icon: '🛒', label: 'Market',      poi: 'market',     sublabel: 'Find nearby' },
  { icon: '🏫', label: 'School',      poi: 'school',     sublabel: 'Find nearby' },
  { icon: '🍽️', label: 'Restaurant',  poi: 'restaurant', sublabel: 'Find nearby' },
]

const VEHICLE_CARDS = [
  { type: 'BIKE', emoji: '🏍️', name: 'Bike',  tagline: 'Zip through traffic', color: '#FFD700', eta: '2 min', fare: 'From ₹30' },
  { type: 'AUTO', emoji: '🛺',  name: 'Auto',  tagline: 'Comfortable & quick', color: '#4FC3F7', eta: '4 min', fare: 'From ₹45' },
  { type: 'CAB',  emoji: '🚕',  name: 'Cab',   tagline: 'AC, spacious ride',   color: '#A5D6A7', eta: '5 min', fare: 'From ₹70' },
]

const STATS = [
  { val: '60+', label: 'Active Drivers' },
  { val: '4.8★', label: 'Avg Rating' },
  { val: '< 5min', label: 'Avg Pickup' },
  { val: '₹9/km', label: 'From' },
]

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  if (h < 21) return 'Good evening'
  return 'Good night'
}

export default function HomePage() {
  const navigate = useNavigate()
  const user = getUser()
  const [time, setTime] = useState(new Date())
  const [recentRides] = useState([
    { from: 'MG Road', to: 'Koramangala', vehicle: '🏍️', fare: 78, date: 'Yesterday' },
    { from: 'Indiranagar', to: 'Whitefield', vehicle: '🚕', fare: 245, date: '2 days ago' },
  ])

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  const firstName = user?.name?.split(' ')[0] || 'Rider'
  const hour = time.getHours()
  // Surge indicator
  const isSurge = (hour >= 8 && hour < 10) || (hour >= 17 && hour < 21)

  return (
    <div style={S.page}>

      {/* ── Hero section ────────────────────────────────────────────────────── */}
      <div style={S.hero}>
        <div style={S.heroOverlay} />
        <div style={S.heroContent}>
          <div style={S.greeting}>{getGreeting()}, {firstName} 👋</div>
          <h1 style={S.heroTitle}>Where to?</h1>
          <p style={S.heroSub}>
            {isSurge
              ? '⚡ Surge pricing active · High demand right now'
              : '🟢 Normal pricing · Great time to ride'}
          </p>

          {/* ── Fake search bar → goes to booking ── */}
          <div style={S.searchBar} onClick={() => navigate('/book')}>
            <span style={S.searchIcon}>🔍</span>
            <span style={S.searchPlaceholder}>Search for destination…</span>
            <span style={S.searchArrow}>→</span>
          </div>
        </div>
      </div>

      {/* ── Stats strip ─────────────────────────────────────────────────────── */}
      <div style={S.statsStrip}>
        {STATS.map(s => (
          <div key={s.label} style={S.statItem}>
            <div style={S.statVal}>{s.val}</div>
            <div style={S.statLbl}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={S.content}>

        {/* ── Quick destinations ─────────────────────────────────────────────── */}
        <section style={S.section}>
          <div style={S.sectionHeader}>
            <h2 style={S.sectionTitle}>Quick go</h2>
          </div>
          <div style={S.quickGrid}>
            {QUICK_DESTINATIONS.map(d => (
              <div key={d.label} style={S.quickCard} onClick={() => d.poi ? navigate(`/book?poi=${d.poi}`) : navigate('/book')}>
                <div style={S.quickIcon}>{d.icon}</div>
                <div style={S.quickLabel}>{d.label}</div>
                <div style={S.quickSub}>{d.sublabel}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Vehicle options ────────────────────────────────────────────────── */}
        <section style={S.section}>
          <div style={S.sectionHeader}>
            <h2 style={S.sectionTitle}>Choose your ride</h2>
            {isSurge && <span style={S.surgeBadge}>⚡ Surge active</span>}
          </div>
          <div style={S.vehicleList}>
            {VEHICLE_CARDS.map(v => (
              <div
                key={v.type}
                style={S.vehicleCard}
                onClick={() => navigate('/book')}
                onMouseEnter={e => e.currentTarget.style.borderColor = v.color}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}
              >
                <div style={{ ...S.vehicleEmoji, color: v.color }}>{v.emoji}</div>
                <div style={S.vehicleInfo}>
                  <div style={S.vehicleName}>{v.name}</div>
                  <div style={S.vehicleTagline}>{v.tagline}</div>
                </div>
                <div style={S.vehicleRight}>
                  <div style={{ ...S.vehicleFare, color: v.color }}>{v.fare}</div>
                  <div style={S.vehicleEta}>⏱ {v.eta}</div>
                </div>
                <div style={S.vehicleArrow}>›</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Recent rides ──────────────────────────────────────────────────── */}
        <section style={S.section}>
          <div style={S.sectionHeader}>
            <h2 style={S.sectionTitle}>Recent rides</h2>
            <button style={S.viewAll} onClick={() => navigate('/history')}>View all →</button>
          </div>
          {recentRides.map((r, i) => (
            <div key={i} style={S.rideCard} onClick={() => navigate('/book')}>
              <div style={S.rideVehicle}>{r.vehicle}</div>
              <div style={S.rideRoute}>
                <div style={S.rideFrom}>{r.from}</div>
                <div style={S.rideDivider}>→</div>
                <div style={S.rideTo}>{r.to}</div>
              </div>
              <div style={S.rideRight}>
                <div style={S.rideFare}>₹{r.fare}</div>
                <div style={S.rideDate}>{r.date}</div>
              </div>
            </div>
          ))}
        </section>

        {/* ── Safety & features strip ────────────────────────────────────────── */}
        <section style={S.section}>
          <div style={S.featuresGrid}>
            {[
              { icon: '🛡️', text: 'Safe rides' },
              { icon: '💳', text: 'Cash / UPI' },
              { icon: '⭐', text: 'Rate driver' },
              { icon: '📞', text: '24/7 support' },
            ].map(f => (
              <div key={f.text} style={S.featureItem}>
                <div style={S.featureIcon}>{f.icon}</div>
                <div style={S.featureText}>{f.text}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Big CTA ────────────────────────────────────────────────────────── */}
        <button style={S.ctaBtn} onClick={() => navigate('/book')}>
          🚀 Book a Ride Now
        </button>

        <div style={{ height: 32 }} />
      </div>
    </div>
  )
}

const S = {
  page: {
    minHeight: '100vh',
    background: '#0a0a0a',
    color: 'white',
    fontFamily: "'Inter', -apple-system, sans-serif",
    paddingTop: 56, // navbar height
  },

  // Hero
  hero: {
    position: 'relative',
    background: 'linear-gradient(160deg, #1a1200 0%, #0d0d0d 60%)',
    padding: '36px 20px 28px',
    overflow: 'hidden',
    borderBottom: '1px solid rgba(255,215,0,0.1)',
  },
  heroOverlay: {
    position: 'absolute', inset: 0,
    background: 'radial-gradient(ellipse 80% 80% at 50% -20%, rgba(255,215,0,0.12) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  heroContent: { position: 'relative', zIndex: 1, maxWidth: 480, margin: '0 auto' },
  greeting: { fontSize: 14, color: 'rgba(255,215,0,0.7)', marginBottom: 4, fontWeight: 500 },
  heroTitle: { fontSize: 34, fontWeight: 800, margin: '0 0 6px', letterSpacing: -0.5 },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 20 },

  searchBar: {
    display: 'flex', alignItems: 'center', gap: 12,
    background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 16, padding: '14px 16px',
    cursor: 'pointer', transition: 'all 0.2s',
  },
  searchIcon: { fontSize: 16, opacity: 0.6 },
  searchPlaceholder: { flex: 1, color: 'rgba(255,255,255,0.4)', fontSize: 15 },
  searchArrow: { fontSize: 18, color: '#FFD700', fontWeight: 700 },

  // Stats strip
  statsStrip: {
    display: 'flex', background: '#111',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  statItem: {
    flex: 1, textAlign: 'center', padding: '12px 8px',
    borderRight: '1px solid rgba(255,255,255,0.05)',
  },
  statVal: { fontSize: 15, fontWeight: 700, color: '#FFD700', marginBottom: 2 },
  statLbl: { fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Content
  content: { padding: '0 16px', maxWidth: 520, margin: '0 auto' },
  section: { paddingTop: 24 },
  sectionHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: 700, color: 'white', margin: 0 },
  surgeBadge: {
    background: 'rgba(255,152,0,0.15)', color: '#FF9800',
    borderRadius: 10, padding: '3px 10px', fontSize: 12, fontWeight: 700,
  },
  viewAll: {
    background: 'none', border: 'none', color: '#FFD700',
    cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: 0,
  },

  // Quick go grid
  quickGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 },
  quickCard: {
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 14, padding: '14px 8px', textAlign: 'center',
    cursor: 'pointer', transition: 'all 0.2s',
  },
  quickIcon: { fontSize: 24, marginBottom: 6 },
  quickLabel: { fontSize: 13, fontWeight: 600, color: 'white', marginBottom: 2 },
  quickSub: { fontSize: 10, color: 'rgba(255,255,255,0.4)' },

  // Vehicle list
  vehicleList: { display: 'flex', flexDirection: 'column', gap: 10 },
  vehicleCard: {
    display: 'flex', alignItems: 'center', gap: 14,
    background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.07)',
    borderRadius: 16, padding: '14px 16px', cursor: 'pointer',
    transition: 'border-color 0.2s', userSelect: 'none',
  },
  vehicleEmoji: { fontSize: 32, lineHeight: 1, flexShrink: 0 },
  vehicleInfo: { flex: 1 },
  vehicleName: { fontSize: 16, fontWeight: 700, color: 'white', marginBottom: 3 },
  vehicleTagline: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  vehicleRight: { textAlign: 'right' },
  vehicleFare: { fontSize: 14, fontWeight: 700, marginBottom: 4 },
  vehicleEta: { fontSize: 11, color: 'rgba(255,255,255,0.4)' },
  vehicleArrow: { fontSize: 22, color: 'rgba(255,255,255,0.2)', flexShrink: 0 },

  // Recent rides
  rideCard: {
    display: 'flex', alignItems: 'center', gap: 14,
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 14, padding: '14px 16px', marginBottom: 10,
    cursor: 'pointer', transition: 'background 0.2s',
  },
  rideVehicle: { fontSize: 24, flexShrink: 0 },
  rideRoute: { flex: 1, display: 'flex', alignItems: 'center', gap: 6 },
  rideFrom: { fontSize: 13, fontWeight: 600, color: 'white' },
  rideDivider: { fontSize: 12, color: 'rgba(255,255,255,0.3)' },
  rideTo: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  rideRight: { textAlign: 'right' },
  rideFare: { fontSize: 15, fontWeight: 700, color: '#FFD700', marginBottom: 3 },
  rideDate: { fontSize: 11, color: 'rgba(255,255,255,0.4)' },

  // Features
  featuresGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10,
  },
  featureItem: {
    background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '14px 8px',
    textAlign: 'center',
  },
  featureIcon: { fontSize: 22, marginBottom: 6 },
  featureText: { fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 500 },

  // CTA
  ctaBtn: {
    width: '100%', background: 'linear-gradient(135deg, #FFD700, #FFA000)',
    color: '#111', border: 'none', borderRadius: 16, padding: '16px',
    fontSize: 17, fontWeight: 800, cursor: 'pointer', marginTop: 20,
    letterSpacing: 0.5, boxShadow: '0 4px 24px rgba(255,215,0,0.35)',
  },
}
