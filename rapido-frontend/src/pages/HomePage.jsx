import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api, { getUser, rideApi } from '../services/api.js'
import {
  IconBike, IconAuto, IconCab,
  IconHome, IconWork, IconHospital, IconMarket, IconSchool, IconRestaurant,
  IconSearch, IconArrowRight, IconShield, IconPayment, IconStar, IconPhone,
  IconClock, IconSurge, IconBolt,
} from '../components/icons.jsx'

const RIDE_STORAGE_KEY = 'cabkaro_active_ride'

// ── Quick destination config — label matches what backend stores ──────────────
const QUICK_DESTINATIONS = [
  { label: 'Home',       savedKey: 'HOME',     IconComponent: IconHome,       poi: null,         sublabel: 'Saved location', color: '#F59E0B' },
  { label: 'Work',       savedKey: 'WORK',     IconComponent: IconWork,       poi: null,         sublabel: 'Saved location', color: '#2563EB' },
  { label: 'Hospital',   savedKey: 'HOSPITAL', IconComponent: IconHospital,   poi: 'hospital',   sublabel: 'Find nearby',    color: '#DC2626' },
  { label: 'Market',     savedKey: 'MARKET',   IconComponent: IconMarket,     poi: 'market',     sublabel: 'Find nearby',    color: '#059669' },
  { label: 'School',     savedKey: 'SCHOOL',   IconComponent: IconSchool,     poi: 'school',     sublabel: 'Find nearby',    color: '#7C3AED' },
  { label: 'Restaurant', savedKey: null,        IconComponent: IconRestaurant, poi: 'restaurant', sublabel: 'Find nearby',    color: '#EA580C' },
]

const VEHICLE_CARDS = [
  { type: 'BIKE', Icon: IconBike, name: 'Bike',      tagline: 'Zip through traffic', accentColor: '#F59E0B', borderColor: '#FCD34D', bgColor: '#FEF3C7', eta: '2 min', fare: 'From ₹30' },
  { type: 'AUTO', Icon: IconAuto, name: 'Auto',      tagline: 'Comfortable & quick', accentColor: '#2563EB', borderColor: '#93C5FD', bgColor: '#DBEAFE', eta: '4 min', fare: 'From ₹45' },
  { type: 'CAB',  Icon: IconCab,  name: 'Prime Cab', tagline: 'AC, spacious ride',   accentColor: '#059669', borderColor: '#6EE7B7', bgColor: '#D1FAE5', eta: '5 min', fare: 'From ₹70' },
]

const STATS = [
  { val: '120+',   label: 'Active Drivers' },
  { val: '4.8★',  label: 'Avg Rating' },
  { val: '< 5min', label: 'Avg Pickup' },
  { val: '₹9/km',  label: 'From' },
]

const FEATURES = [
  { Icon: IconShield,  text: 'Safe rides',   color: '#059669', bg: '#D1FAE5' },
  { Icon: IconPayment, text: 'Cash / UPI',   color: '#2563EB', bg: '#DBEAFE' },
  { Icon: IconStar,    text: 'Rate driver',  color: '#F59E0B', bg: '#FEF3C7' },
  { Icon: IconPhone,   text: '24/7 support', color: '#7C3AED', bg: '#EDE9FE' },
]

const VEHICLE_EMOJIS = { BIKE: '🏍️', AUTO: '🛺', CAB: '🚕' }

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  if (h < 21) return 'Good evening'
  return 'Good night'
}

function truncate(str, n) {
  if (!str) return ''
  return str.length > n ? str.slice(0, n) + '…' : str
}

// ── Active ride banner ────────────────────────────────────────────────────────
function ActiveRideBanner({ ride, onResume }) {
  const info   = ride.rideInfo   || {}
  const driver = ride.driverFound || {}
  const pickup = ride.pickup     || {}
  const drop   = ride.drop       || {}
  const vType  = ride.selectedVehicle || info.vehicleType || 'CAB'
  const emoji  = VEHICLE_EMOJIS[vType] || '🚕'
  const fare   = info.fareAndCost || info.fare || '—'

  return (
    <div style={AS.banner} onClick={onResume}>
      <div style={AS.headerStrip}>
        <span style={AS.dot} />
        <span style={AS.headerLabel}>RIDE IN PROGRESS</span>
        <span style={AS.tapHint}>Tap to resume →</span>
      </div>
      <div style={AS.body}>
        <div style={AS.vehicleBox}>
          <span style={{ fontSize: 30 }}>{emoji}</span>
          <span style={AS.vType}>{vType}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={AS.routeRow}>
            <span style={AS.greenDot} />
            <span style={AS.routeText}>{truncate(pickup.address, 36) || 'Pickup'}</span>
          </div>
          <div style={AS.connLine} />
          <div style={AS.routeRow}>
            <span style={AS.redDot} />
            <span style={AS.routeText}>{truncate(drop.address, 36) || 'Drop'}</span>
          </div>
        </div>
        <div style={AS.fareCol}>
          <div style={AS.fare}>₹{fare}</div>
          {info.distanceKm && <div style={AS.km}>{info.distanceKm} km</div>}
        </div>
      </div>
      {driver.name && (
        <div style={AS.driverRow}>
          <span style={AS.driverAva}>{driver.name[0]?.toUpperCase()}</span>
          <span style={AS.driverName}>{driver.name}</span>
          {driver.vehicle && <span style={AS.vNum}>{driver.vehicle}</span>}
        </div>
      )}
      <div style={AS.cta}>Resume Ride ›</div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const navigate = useNavigate()
  const user = getUser()
  const [time, setTime]             = useState(new Date())
  const [activeRide, setActiveRide] = useState(null)
  const [recentRides, setRecentRides] = useState([])
  // savedLocations: { HOME: {label,address,latitude,longitude}, WORK: {...}, ... }
  const [savedLocations, setSavedLocations] = useState({})

  // ── Check localStorage for active ride ─────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RIDE_STORAGE_KEY)
      if (raw) {
        const saved = JSON.parse(raw)
        if (saved?.stage === 'riding') setActiveRide(saved)
      }
    } catch {}
  }, [])

  // ── Fetch saved quick locations from backend ────────────────────────────────
  useEffect(() => {
    api.get('/user/quick-locations')
      .then(res => {
        const map = {}
        if (Array.isArray(res.data)) {
          res.data.forEach(loc => { map[loc.label] = loc })
        }
        setSavedLocations(map)
      })
      .catch(() => {}) // silent — user may not have saved any
  }, [])

  // ── Fetch recent completed rides ────────────────────────────────────────────
  useEffect(() => {
    rideApi.getRideHistory()
      .then(res => {
        const data = Array.isArray(res.data) ? res.data : []
        setRecentRides(data.filter(r => r.status !== 'IN_PROGRESS').slice(0, 2))
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  const firstName = user?.name?.split(' ')[0] || 'Rider'
  const hour = time.getHours()
  const isSurge = (hour >= 8 && hour < 10) || (hour >= 17 && hour < 21)

  // ── Handle quick destination tap ───────────────────────────────────────────
  const handleQuickTap = (dest) => {
    // Check if there's a saved location for this key
    if (dest.savedKey && savedLocations[dest.savedKey]) {
      const loc = savedLocations[dest.savedKey]
      // Navigate to book page with drop pre-set via query params
      navigate(
        `/book?dropLat=${loc.latitude}&dropLng=${loc.longitude}&dropAddr=${encodeURIComponent(loc.address)}`
      )
    } else if (dest.poi) {
      // POI search on map
      navigate(`/book?poi=${dest.poi}`)
    } else {
      navigate('/book')
    }
  }

  const rideVehicleIcon = (type) => {
    if (type === 'BIKE') return <IconBike size={22} color="#F59E0B" />
    if (type === 'AUTO') return <IconAuto size={22} color="#2563EB" />
    return <IconCab size={22} color="#059669" />
  }

  return (
    <div style={S.page}>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div style={S.hero}>
        <div style={S.heroOverlay} />
        <div style={S.heroContent}>
          <div style={S.greeting}>{getGreeting()}, {firstName} 👋</div>
          <h1 style={S.heroTitle}>Where to?</h1>
          <p style={S.heroSub}>
            {isSurge ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <IconSurge size={14} color="#EA580C" />
                Surge pricing active · High demand right now
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#059669', display: 'inline-block' }} />
                Normal pricing · Great time to ride
              </span>
            )}
          </p>
          <div style={S.searchBar} onClick={() => navigate('/book')}>
            <IconSearch size={18} color="#A0AEC0" />
            <span style={S.searchPlaceholder}>Search for destination…</span>
            <div style={S.searchArrowWrap}><IconArrowRight size={16} color="#F59E0B" /></div>
          </div>
        </div>
      </div>

      {/* ── Stats strip ──────────────────────────────────────────────────── */}
      <div style={S.statsStrip}>
        {STATS.map((s, i) => (
          <div key={s.label} style={{ ...S.statItem, borderRight: i < STATS.length - 1 ? '1px solid #E2E8F0' : 'none' }}>
            <div style={S.statVal}>{s.val}</div>
            <div style={S.statLbl}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={S.content}>

        {/* ── Active ride banner ────────────────────────────────────────── */}
        {activeRide && (
          <section style={{ paddingTop: 20 }}>
            <div style={S.sectionHeader}>
              <h2 style={{ ...S.sectionTitle, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#EA580C', display: 'inline-block', boxShadow: '0 0 0 3px rgba(234,88,12,0.2)' }} />
                Active Ride
              </h2>
            </div>
            <ActiveRideBanner ride={activeRide} onResume={() => navigate('/book')} />
          </section>
        )}

        {/* ── Quick go ─────────────────────────────────────────────────── */}
        <section style={S.section}>
          <div style={S.sectionHeader}>
            <h2 style={S.sectionTitle}>Quick go</h2>
            <span style={S.savedHint}>
              {Object.keys(savedLocations).length > 0
                ? `${Object.keys(savedLocations).length} saved`
                : 'Save in Profile'}
            </span>
          </div>
          <div style={S.quickGrid}>
            {QUICK_DESTINATIONS.map(d => {
              const isSaved = d.savedKey && savedLocations[d.savedKey]
              return (
                <div
                  key={d.label}
                  style={{
                    ...S.quickCard,
                    ...(isSaved ? { borderColor: d.color, boxShadow: `0 0 0 2px ${d.color}22` } : {}),
                  }}
                  onClick={() => handleQuickTap(d)}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 4px 12px rgba(0,0,0,0.1)`; e.currentTarget.style.borderColor = d.color }}
                  onMouseLeave={e => {
                    e.currentTarget.style.boxShadow = isSaved ? `0 0 0 2px ${d.color}22` : '0 1px 3px rgba(0,0,0,0.06)'
                    e.currentTarget.style.borderColor = isSaved ? d.color : '#E2E8F0'
                  }}
                >
                  <div style={{ ...S.quickIconWrap, background: d.color + '18', border: `1.5px solid ${d.color}30` }}>
                    <d.IconComponent size={20} color={d.color} />
                  </div>
                  <div style={S.quickLabel}>{d.label}</div>
                  <div style={{ ...S.quickSub, color: isSaved ? d.color : '#A0AEC0', fontWeight: isSaved ? 600 : 400 }}>
                    {isSaved ? '📍 Saved' : d.sublabel}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* ── Choose your ride ─────────────────────────────────────────── */}
        <section style={S.section}>
          <div style={S.sectionHeader}>
            <h2 style={S.sectionTitle}>Choose your ride</h2>
            {isSurge && (
              <span style={S.surgeBadge}>
                <IconSurge size={12} color="#EA580C" /> Surge active
              </span>
            )}
          </div>
          <div style={S.vehicleList}>
            {VEHICLE_CARDS.map(v => (
              <div
                key={v.type}
                style={{ ...S.vehicleCard, borderLeft: `4px solid ${v.accentColor}` }}
                onClick={() => navigate(`/book?vehicle=${v.type}`)}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; e.currentTarget.style.borderColor = v.borderColor }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor = '#E2E8F0' }}
              >
                <div style={{ ...S.vehicleIconWrap, background: v.bgColor, border: `1.5px solid ${v.borderColor}` }}>
                  <v.Icon size={24} color={v.accentColor} />
                </div>
                <div style={S.vehicleInfo}>
                  <div style={S.vehicleName}>{v.name}</div>
                  <div style={S.vehicleTagline}>{v.tagline}</div>
                </div>
                <div style={S.vehicleRight}>
                  <div style={{ ...S.vehicleFare, color: v.accentColor }}>{v.fare}</div>
                  <div style={S.vehicleEta}>
                    <IconClock size={11} color="#A0AEC0" style={{ marginRight: 3 }} />
                    {v.eta}
                  </div>
                </div>
                <IconArrowRight size={18} color="#CBD5E0" />
              </div>
            ))}
          </div>
        </section>

        {/* ── Recent rides ─────────────────────────────────────────────── */}
        <section style={S.section}>
          <div style={S.sectionHeader}>
            <h2 style={S.sectionTitle}>Recent rides</h2>
            <button style={S.viewAll} onClick={() => navigate('/history')}>
              View all <IconArrowRight size={13} color="#F59E0B" />
            </button>
          </div>
          {recentRides.length > 0 ? recentRides.map((r, i) => (
            <div
              key={i}
              style={S.rideCard}
              onClick={() => navigate('/book')}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'}
            >
              <div style={S.rideVehicleWrap}>{rideVehicleIcon(r.vehicleType)}</div>
              <div style={S.rideRoute}>
                <div style={S.rideFrom}>{truncate(r.pickupAddress || r.from, 18)}</div>
                <IconArrowRight size={12} color="#CBD5E0" />
                <div style={S.rideTo}>{truncate(r.dropAddress || r.to, 18)}</div>
              </div>
              <div style={S.rideRight}>
                <div style={S.rideFare}>₹{r.fare}</div>
                <div style={S.rideDate}>{r.bookedAt ? new Date(r.bookedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}</div>
              </div>
            </div>
          )) : (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#A0AEC0', fontSize: 13 }}>
              No past rides yet
            </div>
          )}
        </section>

        {/* ── Features ─────────────────────────────────────────────────── */}
        <section style={S.section}>
          <div style={S.featuresGrid}>
            {FEATURES.map(f => (
              <div key={f.text} style={S.featureItem}>
                <div style={{ ...S.featureIconWrap, background: f.bg }}>
                  <f.Icon size={18} color={f.color} />
                </div>
                <div style={S.featureText}>{f.text}</div>
              </div>
            ))}
          </div>
        </section>

        <button style={S.ctaBtn} onClick={() => navigate('/book')}>
          <IconBolt size={18} color="#fff" />
          Book a Ride Now
        </button>

        <div style={{ height: 32 }} />
      </div>
    </div>
  )
}

// ── Active ride banner styles ─────────────────────────────────────────────────
const AS = {
  banner:      { border: '2px solid #EA580C', borderRadius: 18, overflow: 'hidden', cursor: 'pointer', boxShadow: '0 4px 20px rgba(234,88,12,0.15)', background: '#FFFFFF', marginBottom: 4 },
  headerStrip: { background: 'linear-gradient(135deg, #EA580C, #DC2626)', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8 },
  dot:         { display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#FFF', flexShrink: 0 },
  headerLabel: { fontSize: 11, fontWeight: 800, color: '#FFF', letterSpacing: 1, flex: 1 },
  tapHint:     { fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: 600 },
  body:        { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' },
  vehicleBox:  { display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#FEF3C7', border: '1.5px solid #FCD34D', borderRadius: 12, padding: '8px 10px', flexShrink: 0, minWidth: 52 },
  vType:       { fontSize: 9, fontWeight: 800, color: '#D97706', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 3 },
  routeRow:    { display: 'flex', alignItems: 'center', gap: 7 },
  routeText:   { fontSize: 13, color: '#1A202C', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 },
  connLine:    { width: 2, height: 10, background: '#E2E8F0', margin: '3px 0 3px 3px' },
  greenDot:    { width: 7, height: 7, borderRadius: '50%', background: '#059669', flexShrink: 0, display: 'inline-block' },
  redDot:      { width: 7, height: 7, borderRadius: '50%', background: '#DC2626', flexShrink: 0, display: 'inline-block' },
  fareCol:     { textAlign: 'right', flexShrink: 0 },
  fare:        { fontSize: 20, fontWeight: 800, color: '#F59E0B' },
  km:          { fontSize: 11, color: '#A0AEC0', marginTop: 2 },
  driverRow:   { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderTop: '1px solid #FEE2E2', background: '#FFF7F5' },
  driverAva:   { width: 24, height: 24, borderRadius: '50%', background: '#FEF3C7', color: '#D97706', fontWeight: 800, fontSize: 11, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #FCD34D', flexShrink: 0 },
  driverName:  { fontSize: 12, fontWeight: 600, color: '#1A202C', flex: 1 },
  vNum:        { fontSize: 11, color: '#718096', background: '#F5F7FA', border: '1px solid #E2E8F0', borderRadius: 6, padding: '2px 8px' },
  cta:         { background: 'linear-gradient(135deg, #EA580C, #DC2626)', color: '#FFF', fontWeight: 800, fontSize: 14, textAlign: 'center', padding: '11px', letterSpacing: 0.3 },
}

// ── Page styles ───────────────────────────────────────────────────────────────
const S = {
  page:        { minHeight: '100vh', background: '#F5F7FA', color: '#1A202C', fontFamily: "'Inter', -apple-system, sans-serif", paddingTop: 60 },
  hero:        { position: 'relative', background: 'linear-gradient(160deg, #FFFBEB 0%, #FFFFFF 60%)', padding: '32px 20px 28px', overflow: 'hidden', borderBottom: '1px solid #E2E8F0' },
  heroOverlay: { position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 70% at 50% -10%, rgba(245,158,11,0.10) 0%, transparent 70%)', pointerEvents: 'none' },
  heroContent: { position: 'relative', zIndex: 1, maxWidth: 480, margin: '0 auto' },
  greeting:    { fontSize: 14, color: '#D97706', marginBottom: 4, fontWeight: 500 },
  heroTitle:   { fontSize: 34, fontWeight: 800, margin: '0 0 6px', letterSpacing: -0.5, color: '#1A202C' },
  heroSub:     { fontSize: 13, color: '#718096', marginBottom: 20, display: 'flex', alignItems: 'center' },
  searchBar:   { display: 'flex', alignItems: 'center', gap: 12, background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: '13px 16px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' },
  searchPlaceholder: { flex: 1, color: '#A0AEC0', fontSize: 15 },
  searchArrowWrap: { width: 28, height: 28, borderRadius: '50%', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  statsStrip:  { display: 'flex', background: '#FFFFFF', borderBottom: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' },
  statItem:    { flex: 1, textAlign: 'center', padding: '12px 8px' },
  statVal:     { fontSize: 15, fontWeight: 700, color: '#F59E0B', marginBottom: 2 },
  statLbl:     { fontSize: 10, color: '#A0AEC0', textTransform: 'uppercase', letterSpacing: 0.5 },
  content:     { padding: '0 16px', maxWidth: 520, margin: '0 auto' },
  section:     { paddingTop: 24 },
  sectionHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitle:  { fontSize: 18, fontWeight: 700, color: '#1A202C', margin: 0 },
  savedHint:   { fontSize: 12, color: '#A0AEC0', fontWeight: 500 },
  surgeBadge:  { background: '#FFEDD5', color: '#EA580C', borderRadius: 10, padding: '3px 10px', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 },
  viewAll:     { background: 'none', border: 'none', color: '#F59E0B', cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: 0, display: 'flex', alignItems: 'center', gap: 4 },
  quickGrid:   { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 },
  quickCard:   { background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: '14px 8px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
  quickIconWrap: { width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' },
  quickLabel:  { fontSize: 13, fontWeight: 600, color: '#1A202C', marginBottom: 2 },
  quickSub:    { fontSize: 10, color: '#A0AEC0' },
  vehicleList: { display: 'flex', flexDirection: 'column', gap: 10 },
  vehicleCard: { display: 'flex', alignItems: 'center', gap: 14, background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: '14px 16px', cursor: 'pointer', transition: 'all 0.2s', userSelect: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
  vehicleIconWrap: { width: 50, height: 50, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  vehicleInfo: { flex: 1 },
  vehicleName: { fontSize: 16, fontWeight: 700, color: '#1A202C', marginBottom: 3 },
  vehicleTagline: { fontSize: 12, color: '#718096' },
  vehicleRight: { textAlign: 'right' },
  vehicleFare: { fontSize: 14, fontWeight: 700, marginBottom: 4 },
  vehicleEta:  { fontSize: 11, color: '#A0AEC0', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2 },
  rideCard:    { display: 'flex', alignItems: 'center', gap: 14, background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: '14px 16px', marginBottom: 10, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
  rideVehicleWrap: { width: 40, height: 40, borderRadius: 10, background: '#F5F7FA', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rideRoute:   { flex: 1, display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' },
  rideFrom:    { fontSize: 13, fontWeight: 600, color: '#1A202C', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  rideTo:      { fontSize: 13, color: '#718096', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  rideRight:   { textAlign: 'right', flexShrink: 0 },
  rideFare:    { fontSize: 15, fontWeight: 700, color: '#F59E0B', marginBottom: 3 },
  rideDate:    { fontSize: 11, color: '#A0AEC0' },
  featuresGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 },
  featureItem: { background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '14px 8px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' },
  featureIconWrap: { width: 38, height: 38, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' },
  featureText: { fontSize: 11, color: '#718096', fontWeight: 500 },
  ctaBtn:      { width: '100%', background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#fff', border: 'none', borderRadius: 16, padding: 16, fontSize: 17, fontWeight: 800, cursor: 'pointer', marginTop: 20, letterSpacing: 0.3, boxShadow: '0 4px 24px rgba(245,158,11,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 },
}
