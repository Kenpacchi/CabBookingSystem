import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { rideApi } from '../services/api.js'
import {
  IconArrowLeft, IconBike, IconAuto, IconCab,
  IconClose, IconRoute, IconLocationPin, IconClock,
  IconSurge, IconBolt,
} from '../components/icons.jsx'

// ── Constants ─────────────────────────────────────────────────────────────────

const VEHICLE_EMOJIS = { BIKE: '🏍️', AUTO: '🛺', CAB: '🚕' }
const RIDE_STORAGE_KEY = 'cabkaro_active_ride'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleString('en-IN', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function getFavoriteVehicle(rides) {
  if (!rides.length) return '—'
  const counts = rides.reduce((acc, r) => { acc[r.vehicleType] = (acc[r.vehicleType] || 0) + 1; return acc }, {})
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
  return top ? `${VEHICLE_EMOJIS[top[0]] || ''} ${top[0]}` : '—'
}

function getStatusStyle(status) {
  switch (status) {
    case 'COMPLETED':   return { background: '#D1FAE5', color: '#059669', label: 'Completed' }
    case 'IN_PROGRESS': return { background: '#FFEDD5', color: '#EA580C', label: 'In Progress' }
    case 'CANCELLED':   return { background: '#FEE2E2', color: '#DC2626', label: 'Cancelled' }
    default:            return { background: '#F0F2F5', color: '#718096', label: status || '—' }
  }
}

function VehicleIcon({ type, size = 22 }) {
  if (type === 'BIKE') return <IconBike size={size} color="#F59E0B" />
  if (type === 'AUTO') return <IconAuto size={size} color="#2563EB" />
  return <IconCab size={size} color="#059669" />
}

function truncate(str, n) {
  if (!str) return '—'
  return str.length > n ? str.slice(0, n) + '…' : str
}

/**
 * Build the localStorage payload that BookingPage expects,
 * derived from a RideHistory backend record.
 */
function buildStoragePayload(ride) {
  return {
    stage: 'riding',
    rideInfo: {
      rideId:              ride.id,
      message:             'Ride booked successfully!',
      driverName:          ride.driverName,
      driverPhone:         ride.driverPhone,
      driverMobileNumber:  ride.driverPhone,
      vehicleNumber:       ride.vehicleNumber,
      vehicleType:         ride.vehicleType,
      distanceKm:          ride.distanceKm,
      fareAndCost:         ride.fare,
      surgeMultiplier:     ride.surgeMultiplier || 1,
      status:              'IN_PROGRESS',
    },
    driverFound: {
      name:    ride.driverName    || 'Driver',
      vehicle: ride.vehicleNumber || '',
      rating:  '4.7',
      phone:   ride.driverPhone   || '',
    },
    pickup: {
      lat:     ride.pickupLat,
      lng:     ride.pickupLng,
      address: ride.pickupAddress || '',
    },
    drop: {
      lat:     ride.dropLat,
      lng:     ride.dropLng,
      address: ride.dropAddress || '',
    },
    pickupQuery:     ride.pickupAddress || '',
    dropQuery:       ride.dropAddress   || '',
    selectedVehicle: ride.vehicleType   || 'CAB',
    estimates: {
      bikeFare:         ride.vehicleType === 'BIKE' ? ride.fare : null,
      autoFare:         ride.vehicleType === 'AUTO' ? ride.fare : null,
      cabFare:          ride.vehicleType === 'CAB'  ? ride.fare : null,
      distanceKm:       ride.distanceKm,
      surgeMultiplier:  ride.surgeMultiplier || 1,
    },
    roadDistKm:   ride.distanceKm || null,
    routePoints:  [],
  }
}

// ── Skeleton card ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div style={sk.wrap}>
      <div style={sk.row}>
        <div style={sk.badge} className="shimmer" />
        <div style={{ flex: 1 }}>
          <div style={{ ...sk.line, width: '55%', marginBottom: 8 }} className="shimmer" />
          <div style={{ ...sk.line, width: '80%' }} className="shimmer" />
        </div>
        <div style={{ ...sk.line, width: 48, height: 24, borderRadius: 20 }} className="shimmer" />
      </div>
      <div style={{ ...sk.line, width: '100%', height: 1, margin: '14px 0' }} className="shimmer" />
      <div style={sk.row}>
        <div style={{ ...sk.line, width: '30%' }} className="shimmer" />
        <div style={{ ...sk.line, width: 36, height: 20 }} className="shimmer" />
      </div>
    </div>
  )
}

const sk = {
  wrap: { background:'#FFFFFF', borderRadius:16, padding:18, marginBottom:12, border:'1px solid #E2E8F0', maxWidth:480, margin:'0 auto 12px', boxShadow:'0 1px 3px rgba(0,0,0,0.06)' },
  row:  { display:'flex', alignItems:'center', gap:12 },
  badge:{ width:48, height:48, borderRadius:12, background:'#F0F2F5', flexShrink:0 },
  line: { height:12, borderRadius:6, background:'#F0F2F5' },
}

// ═══════════════════════════════════════════════════════════════════════════════
// Active Ride Banner
// ═══════════════════════════════════════════════════════════════════════════════

function ActiveRideCard({ ride, onResume }) {
  const pickupText = truncate(ride.pickupAddress, 38)
  const dropText   = truncate(ride.dropAddress,   38)
  const vehicleKey = ride.vehicleType || 'CAB'

  return (
    <div style={S.activeCard} onClick={onResume}>
      {/* Pulsing header strip */}
      <div style={S.activeHeader}>
        <span style={S.activeDot} />
        <span style={S.activeLabel}>RIDE IN PROGRESS</span>
        <span style={S.activeTime}>{formatDate(ride.bookedAt)}</span>
      </div>

      <div style={S.activeBody}>
        {/* Vehicle badge */}
        <div style={S.activeVBadge}>
          <span style={{ fontSize: 28 }}>{VEHICLE_EMOJIS[vehicleKey] || '🚕'}</span>
          <span style={S.activeVType}>{vehicleKey}</span>
        </div>

        {/* Route */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={S.activeRouteRow}>
            <span style={S.greenDotSm} />
            <span style={S.activeRouteText}>{pickupText}</span>
          </div>
          <div style={S.routeConnLine} />
          <div style={S.activeRouteRow}>
            <span style={S.redDotSm} />
            <span style={S.activeRouteText}>{dropText}</span>
          </div>
        </div>

        {/* Fare */}
        <div style={S.activeFareCol}>
          <div style={S.activeFare}>₹{ride.fare}</div>
          {ride.distanceKm && <div style={S.activeKm}>{ride.distanceKm} km</div>}
        </div>
      </div>

      {/* Driver row */}
      {ride.driverName && (
        <div style={S.activeDriverRow}>
          <span style={S.driverAva}>{ride.driverName[0]?.toUpperCase()}</span>
          <span style={S.activeDriverName}>{ride.driverName}</span>
          {ride.vehicleNumber && <span style={S.activeVNum}>{ride.vehicleNumber}</span>}
        </div>
      )}

      {/* Resume button */}
      <div style={S.resumeBtn}>
        <span>Resume Ride</span>
        <span style={{ marginLeft: 6 }}>→</span>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// RideHistoryPage
// ═══════════════════════════════════════════════════════════════════════════════

export default function RideHistoryPage() {
  const navigate = useNavigate()
  const [rides, setRides]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => {
    rideApi.getRideHistory()
      .then(res => setRides(Array.isArray(res.data) ? res.data : []))
      .catch(err => setError(err.response?.data?.message || 'Failed to load rides.'))
      .finally(() => setLoading(false))
  }, [])

  // Split active vs past
  const activeRides = rides.filter(r => r.status === 'IN_PROGRESS')
  const pastRides   = rides.filter(r => r.status !== 'IN_PROGRESS')

  // Stats (all rides)
  const totalSpent      = rides.reduce((s, r) => s + (Number(r.fare) || 0), 0)
  const favoriteVehicle = getFavoriteVehicle(rides)

  // Resume an in-progress ride → write to localStorage then navigate to booking
  const handleResume = (ride) => {
    try {
      localStorage.setItem(RIDE_STORAGE_KEY, JSON.stringify(buildStoragePayload(ride)))
    } catch {}
    navigate('/book')
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={styles.page}>
        <PageHeader onBack={() => navigate('/')} />
        <div style={styles.content}>{[1, 2, 3].map(i => <SkeletonCard key={i} />)}</div>
      </div>
    )
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={styles.page}>
        <PageHeader onBack={() => navigate('/')} />
        <div style={styles.centered}>
          <div style={styles.bigIconWrap}><IconClose size={40} color="#DC2626" /></div>
          <div style={styles.emptyTitle}>Something went wrong</div>
          <p style={styles.emptyText}>{error}</p>
          <button style={styles.retryBtn} onClick={() => {
            setError(''); setLoading(true)
            rideApi.getRideHistory().then(r => setRides(r.data)).catch(e => setError(e.message)).finally(() => setLoading(false))
          }}>Try Again</button>
        </div>
      </div>
    )
  }

  // ── Empty ────────────────────────────────────────────────────────────────
  if (rides.length === 0) {
    return (
      <div style={styles.page}>
        <PageHeader onBack={() => navigate('/')} />
        <div style={styles.centered}>
          <div style={styles.bigIconWrap}><IconRoute size={40} color="#F59E0B" /></div>
          <div style={styles.emptyTitle}>No rides yet</div>
          <p style={styles.emptyText}>Your completed trips will appear here once you book a ride.</p>
          <button style={styles.bookBtn} onClick={() => navigate('/book')}>
            <IconBolt size={16} color="#fff" style={{ marginRight: 6 }} />
            Book a Ride
          </button>
        </div>
      </div>
    )
  }

  // ── Main ─────────────────────────────────────────────────────────────────
  return (
    <div style={styles.page}>
      <PageHeader onBack={() => navigate('/')} count={rides.length} />

      <div style={styles.content}>

        {/* ── Active rides section ─────────────────────────────────────────── */}
        {activeRides.length > 0 && (
          <div style={S.section}>
            <div style={S.sectionHeader}>
              <span style={S.sectionDot} />
              <span style={S.sectionTitle}>Active Rides</span>
              <span style={S.sectionCount}>{activeRides.length}</span>
            </div>
            {activeRides.map(ride => (
              <ActiveRideCard key={ride.id} ride={ride} onResume={() => handleResume(ride)} />
            ))}
          </div>
        )}

        {/* ── Stats card ───────────────────────────────────────────────────── */}
        <div style={styles.statsCard}>
          <div style={styles.statCol}>
            <div style={styles.statVal}>{rides.length}</div>
            <div style={styles.statLbl}>Total Rides</div>
          </div>
          <div style={styles.statDivider} />
          <div style={styles.statCol}>
            <div style={styles.statVal}>₹{totalSpent.toFixed(0)}</div>
            <div style={styles.statLbl}>Total Spent</div>
          </div>
          <div style={styles.statDivider} />
          <div style={styles.statCol}>
            <div style={{ ...styles.statVal, fontSize: 15 }}>{favoriteVehicle}</div>
            <div style={styles.statLbl}>Favorite</div>
          </div>
        </div>

        {/* ── Past rides section ───────────────────────────────────────────── */}
        {pastRides.length > 0 && (
          <>
            <div style={S.sectionHeader}>
              <span style={{ ...S.sectionDot, background: '#A0AEC0' }} />
              <span style={S.sectionTitle}>Past Rides</span>
              <span style={{ ...S.sectionCount, background: '#F0F2F5', color: '#718096', border: '1px solid #E2E8F0' }}>{pastRides.length}</span>
            </div>
            {pastRides.map(ride => <PastRideCard key={ride.id} ride={ride} />)}
          </>
        )}
      </div>

      <div style={{ height: 80 }} />
    </div>
  )
}

// ── Past ride card (existing design, unchanged) ───────────────────────────────

function PastRideCard({ ride }) {
  const statusStyle = getStatusStyle(ride.status)
  const pickupText = truncate(ride.pickupAddress  || `${ride.pickupLat?.toFixed(4)}, ${ride.pickupLng?.toFixed(4)}`, 35)
  const dropText   = truncate(ride.dropAddress    || `${ride.dropLat?.toFixed(4)}, ${ride.dropLng?.toFixed(4)}`,   35)

  return (
    <div style={styles.rideCard}>
      <div style={styles.cardTop}>
        <div style={styles.vehicleBadge}>
          <VehicleIcon type={ride.vehicleType} size={26} />
          <span style={styles.vehicleTypeLbl}>{ride.vehicleType}</span>
        </div>
        <div style={styles.routeBlock}>
          <div style={styles.routeRow}><span style={styles.greenDot} /><span style={styles.routeText}>{pickupText}</span></div>
          <div style={styles.routeConnector}><div style={styles.routeLine} /><span style={styles.arrowText}>↓</span><div style={styles.routeLine} /></div>
          <div style={styles.routeRow}><span style={styles.redDot} /><span style={styles.routeText}>{dropText}</span></div>
        </div>
        <div style={{ ...styles.statusBadge, background: statusStyle.background, color: statusStyle.color }}>
          {statusStyle.label}
        </div>
      </div>

      <div style={styles.divider} />

      <div style={styles.cardBottom}>
        <div>
          <span style={styles.fareAmt}>₹{ride.fare}</span>
          {ride.surgeMultiplier > 1 && (
            <span style={styles.surgeBadge}>
              <IconSurge size={10} color="#EA580C" /> {ride.surgeMultiplier}×
            </span>
          )}
        </div>
        <div style={styles.metaRight}>
          {ride.distanceKm != null && (
            <span style={styles.metaChip}>
              <IconLocationPin size={10} color="#A0AEC0" /> {ride.distanceKm} km
            </span>
          )}
          <span style={styles.metaChip}>
            <IconClock size={10} color="#A0AEC0" /> {formatDate(ride.bookedAt)}
          </span>
        </div>
      </div>

      {ride.driverName && (
        <div style={styles.driverRow}>
          <span style={styles.driverAvatar}>{ride.driverName[0]?.toUpperCase()}</span>
          <span style={styles.driverNameText}>{ride.driverName}</span>
          {ride.vehicleNumber && <span style={styles.vehicleNumber}>{ride.vehicleNumber}</span>}
        </div>
      )}
    </div>
  )
}

// ── PageHeader ────────────────────────────────────────────────────────────────

function PageHeader({ onBack, count }) {
  return (
    <div style={styles.header}>
      <button style={styles.backBtn} onClick={onBack} aria-label="Go back">
        <IconArrowLeft size={18} color="#1A202C" />
      </button>
      <h1 style={styles.headerTitle}>My Rides</h1>
      {count != null
        ? <span style={styles.countBadge}>{count}</span>
        : <div style={{ width: 36 }} />}
    </div>
  )
}

// ── Active ride card styles ───────────────────────────────────────────────────

const S = {
  section: { marginBottom: 8 },
  sectionHeader: {
    display: 'flex', alignItems: 'center', gap: 8,
    marginBottom: 10, marginTop: 4,
  },
  sectionDot: {
    display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
    background: '#EA580C', flexShrink: 0,
    boxShadow: '0 0 0 3px rgba(234,88,12,0.2)',
  },
  sectionTitle: { fontSize: 14, fontWeight: 700, color: '#1A202C' },
  sectionCount: {
    fontSize: 11, fontWeight: 700, padding: '2px 8px',
    borderRadius: 20, background: '#FFEDD5', color: '#EA580C',
    border: '1px solid #FED7AA',
  },

  // Active card
  activeCard: {
    background: '#FFFFFF',
    border: '2px solid #EA580C',
    borderRadius: 18,
    marginBottom: 14,
    overflow: 'hidden',
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(234,88,12,0.12)',
    transition: 'transform 0.15s, box-shadow 0.15s',
  },
  activeHeader: {
    background: 'linear-gradient(135deg, #EA580C, #DC2626)',
    padding: '8px 16px',
    display: 'flex', alignItems: 'center', gap: 8,
  },
  activeDot: {
    display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
    background: '#FFF', flexShrink: 0,
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  activeLabel: {
    fontSize: 11, fontWeight: 800, color: '#FFFFFF',
    letterSpacing: 1, textTransform: 'uppercase', flex: 1,
  },
  activeTime: { fontSize: 10, color: 'rgba(255,255,255,0.8)' },

  activeBody: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '14px 16px',
  },
  activeVBadge: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    background: '#FEF3C7', border: '1.5px solid #FCD34D',
    borderRadius: 14, padding: '10px 8px', flexShrink: 0, minWidth: 52,
  },
  activeVType: { fontSize: 9, fontWeight: 800, color: '#D97706', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 3 },

  activeRouteRow: { display: 'flex', alignItems: 'center', gap: 7 },
  activeRouteText: { fontSize: 13, color: '#1A202C', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 },
  routeConnLine: { width: 2, height: 12, background: '#E2E8F0', margin: '4px 0 4px 3px' },

  greenDotSm: { display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#059669', flexShrink: 0 },
  redDotSm:   { display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#DC2626', flexShrink: 0 },

  activeFareCol: { textAlign: 'right', flexShrink: 0 },
  activeFare:    { fontSize: 20, fontWeight: 800, color: '#F59E0B' },
  activeKm:      { fontSize: 11, color: '#A0AEC0', marginTop: 2 },

  activeDriverRow: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 16px', borderTop: '1px solid #FEE2E2',
    background: '#FFF7F5',
  },
  driverAva: {
    width: 26, height: 26, borderRadius: '50%',
    background: '#FEF3C7', color: '#D97706',
    fontWeight: 800, fontSize: 12,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, border: '1.5px solid #FCD34D',
  },
  activeDriverName: { fontSize: 12, fontWeight: 600, color: '#1A202C', flex: 1 },
  activeVNum: {
    fontSize: 11, color: '#718096', background: '#F5F7FA',
    border: '1px solid #E2E8F0', borderRadius: 6, padding: '2px 8px',
  },

  resumeBtn: {
    background: 'linear-gradient(135deg, #EA580C, #DC2626)',
    color: '#FFFFFF', fontWeight: 800, fontSize: 14,
    textAlign: 'center', padding: '12px 16px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    letterSpacing: 0.3,
  },
}

// ── Shared page styles (unchanged from original) ──────────────────────────────

const styles = {
  page: { minHeight: '100vh', background: '#F5F7FA' },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '20px 20px 12px', maxWidth: 480, margin: '0 auto',
    position: 'sticky', top: 0, background: '#F5F7FA', zIndex: 10,
    borderBottom: '1px solid #E2E8F0',
  },
  backBtn: {
    background: '#FFFFFF', border: '1px solid #E2E8F0', color: '#1A202C',
    borderRadius: 10, width: 36, height: 36, fontSize: 18, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  headerTitle: { fontSize: 20, fontWeight: 800, color: '#1A202C', margin: 0 },
  countBadge: {
    background: '#FEF3C7', color: '#D97706', border: '1px solid #FCD34D',
    borderRadius: 20, padding: '4px 12px', fontSize: 13, fontWeight: 700,
    minWidth: 36, textAlign: 'center',
  },
  content: { padding: '16px 20px', maxWidth: 480, margin: '0 auto' },
  statsCard: {
    display: 'flex', alignItems: 'center', background: '#FFFFFF',
    border: '1.5px solid #FCD34D', borderRadius: 18, padding: '18px 20px',
    marginBottom: 20, boxShadow: '0 4px 12px rgba(245,158,11,0.08)',
  },
  statCol:     { flex: 1, textAlign: 'center' },
  statVal:     { fontSize: 22, fontWeight: 800, color: '#F59E0B', marginBottom: 4 },
  statLbl:     { fontSize: 10, color: '#A0AEC0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 },
  statDivider: { width: 1, height: 40, background: '#E2E8F0', margin: '0 12px' },

  rideCard: {
    background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 18,
    padding: 18, marginBottom: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  cardTop:     { display: 'flex', gap: 14, alignItems: 'flex-start' },
  vehicleBadge:{
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    background: '#FEF3C7', border: '1.5px solid #FCD34D',
    borderRadius: 14, padding: '10px 10px', flexShrink: 0, minWidth: 56,
  },
  vehicleTypeLbl: { fontSize: 9, fontWeight: 800, color: '#D97706', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },
  routeBlock:  { flex: 1, minWidth: 0 },
  routeRow:    { display: 'flex', alignItems: 'center', gap: 8 },
  routeText:   { fontSize: 13, color: '#1A202C', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 },
  greenDot:    { display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#059669', flexShrink: 0 },
  redDot:      { display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#DC2626', flexShrink: 0 },
  routeConnector: { display: 'flex', alignItems: 'center', gap: 2, paddingLeft: 3, margin: '3px 0' },
  routeLine:   { flex: 1, height: 1, background: '#E2E8F0' },
  arrowText:   { fontSize: 10, color: '#A0AEC0' },
  statusBadge: { fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: 0.3, flexShrink: 0, alignSelf: 'flex-start', marginTop: 2 },
  divider:     { height: 1, background: '#E2E8F0', margin: '14px 0' },
  cardBottom:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  fareAmt:     { fontSize: 20, fontWeight: 800, color: '#F59E0B' },
  surgeBadge:  { marginLeft: 8, fontSize: 11, color: '#EA580C', background: '#FFEDD5', border: '1px solid #FED7AA', borderRadius: 10, padding: '2px 8px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 },
  metaRight:   { display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' },
  metaChip:    { fontSize: 11, color: '#718096', background: '#F5F7FA', border: '1px solid #E2E8F0', borderRadius: 8, padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 },
  driverRow:   { display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid #E2E8F0' },
  driverAvatar:{ width: 26, height: 26, borderRadius: '50%', background: '#FEF3C7', color: '#D97706', fontWeight: 800, fontSize: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1.5px solid #FCD34D' },
  driverNameText: { fontSize: 12, color: '#1A202C', fontWeight: 600 },
  vehicleNumber:  { fontSize: 11, color: '#718096', background: '#F5F7FA', border: '1px solid #E2E8F0', borderRadius: 6, padding: '2px 8px', marginLeft: 'auto' },
  centered:    { textAlign: 'center', padding: '60px 32px', maxWidth: 480, margin: '0 auto' },
  bigIconWrap: { width: 80, height: 80, borderRadius: '50%', background: '#F5F7FA', border: '2px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' },
  emptyTitle:  { fontSize: 20, fontWeight: 800, color: '#1A202C', marginBottom: 8 },
  emptyText:   { fontSize: 14, color: '#718096', lineHeight: 1.5, marginBottom: 28 },
  bookBtn:     { background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#fff', border: 'none', borderRadius: 14, padding: '14px 28px', fontSize: 15, fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', boxShadow: '0 4px 16px rgba(245,158,11,0.3)' },
  retryBtn:    { background: 'transparent', color: '#F59E0B', border: '1.5px solid #FCD34D', borderRadius: 14, padding: '12px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'inline-block' },
}
