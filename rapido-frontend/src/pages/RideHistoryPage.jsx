import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { rideApi } from '../services/api.js'

// ── Constants ─────────────────────────────────────────────────────────────────

const VEHICLE_EMOJIS = { BIKE: '🏍️', AUTO: '🛺', CAB: '🚕' }

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getFavoriteVehicle(rides) {
  if (!rides.length) return '—'
  const counts = rides.reduce((acc, r) => {
    acc[r.vehicleType] = (acc[r.vehicleType] || 0) + 1
    return acc
  }, {})
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
  return top ? `${VEHICLE_EMOJIS[top[0]] || ''} ${top[0]}` : '—'
}

function getStatusStyle(status) {
  switch (status) {
    case 'COMPLETED':   return { background: 'rgba(76,175,80,0.15)',  color: '#4CAF50',  label: 'Completed' }
    case 'IN_PROGRESS': return { background: 'rgba(255,152,0,0.15)',  color: '#FF9800',  label: 'In Progress' }
    case 'CANCELLED':   return { background: 'rgba(244,67,54,0.15)',  color: '#F44336',  label: 'Cancelled' }
    default:            return { background: 'rgba(255,255,255,0.08)', color: '#9E9E9E', label: status || '—' }
  }
}

// ── Skeleton card ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div style={sk.wrap}>
      <div style={sk.row}>
        <div style={sk.badge} />
        <div style={{ flex: 1 }}>
          <div style={{ ...sk.line, width: '55%', marginBottom: '8px' }} />
          <div style={{ ...sk.line, width: '80%' }} />
        </div>
        <div style={{ ...sk.line, width: '48px', height: '24px', borderRadius: '20px' }} />
      </div>
      <div style={{ ...sk.line, width: '100%', height: '1px', margin: '14px 0' }} />
      <div style={sk.row}>
        <div style={{ ...sk.line, width: '30%' }} />
        <div style={{ ...sk.line, width: '36px', height: '20px' }} />
      </div>
    </div>
  )
}

const sk = {
  wrap: {
    background: 'var(--card)',
    borderRadius: '16px',
    padding: '18px',
    marginBottom: '12px',
    border: '1px solid var(--border)',
    maxWidth: '480px',
    margin: '0 auto 12px',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  badge: {
    width: '48px', height: '48px', borderRadius: '12px',
    background: 'rgba(255,255,255,0.07)', flexShrink: 0,
  },
  line: {
    height: '12px',
    borderRadius: '6px',
    background: 'rgba(255,255,255,0.07)',
  },
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

  // Derived stats
  const totalSpent    = rides.reduce((s, r) => s + (Number(r.fare) || 0), 0)
  const favoriteVehicle = getFavoriteVehicle(rides)

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={styles.page}>
        <PageHeader onBack={() => navigate('/')} />
        <div style={styles.content}>
          {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </div>
      </div>
    )
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={styles.page}>
        <PageHeader onBack={() => navigate('/')} />
        <div style={styles.centered}>
          <div style={styles.bigEmoji}>❌</div>
          <div style={styles.emptyTitle}>Something went wrong</div>
          <p style={styles.emptyText}>{error}</p>
          <button
            style={styles.retryBtn}
            onClick={() => { setError(''); setLoading(true); rideApi.getRideHistory().then(r => setRides(r.data)).catch(e => setError(e.message)).finally(() => setLoading(false)) }}
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // ── Empty ──────────────────────────────────────────────────────────────────
  if (rides.length === 0) {
    return (
      <div style={styles.page}>
        <PageHeader onBack={() => navigate('/')} />
        <div style={styles.centered}>
          <div style={styles.bigEmoji}>🛣️</div>
          <div style={styles.emptyTitle}>No rides yet</div>
          <p style={styles.emptyText}>Your completed trips will appear here once you book a ride.</p>
          <button style={styles.bookBtn} onClick={() => navigate('/book')}>
            ⚡ Book a Ride
          </button>
        </div>
      </div>
    )
  }

  // ── Main ───────────────────────────────────────────────────────────────────
  return (
    <div style={styles.page}>
      <PageHeader onBack={() => navigate('/')} count={rides.length} />

      <div style={styles.content}>

        {/* Stats card */}
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
            <div style={{ ...styles.statVal, fontSize: '15px' }}>{favoriteVehicle}</div>
            <div style={styles.statLbl}>Favorite</div>
          </div>
        </div>

        {/* Ride cards */}
        {rides.map(ride => {
          const statusStyle = getStatusStyle(ride.status)
          const emoji = VEHICLE_EMOJIS[ride.vehicleType] || '🚗'

          const pickupText = ride.pickupAddress
            ? ride.pickupAddress.slice(0, 35) + (ride.pickupAddress.length > 35 ? '…' : '')
            : `${ride.pickupLat?.toFixed(4)}, ${ride.pickupLng?.toFixed(4)}`

          const dropText = ride.dropAddress
            ? ride.dropAddress.slice(0, 35) + (ride.dropAddress.length > 35 ? '…' : '')
            : `${ride.dropLat?.toFixed(4)}, ${ride.dropLng?.toFixed(4)}`

          return (
            <div key={ride.id} style={styles.rideCard}>

              {/* Card top: badge + route + status */}
              <div style={styles.cardTop}>
                {/* Vehicle badge */}
                <div style={styles.vehicleBadge}>
                  <span style={styles.vehicleEmojiLarge}>{emoji}</span>
                  <span style={styles.vehicleTypeLbl}>{ride.vehicleType}</span>
                </div>

                {/* Route */}
                <div style={styles.routeBlock}>
                  <div style={styles.routeRow}>
                    <span style={styles.greenDot} />
                    <span style={styles.routeText}>{pickupText}</span>
                  </div>
                  <div style={styles.routeConnector}>
                    <div style={styles.routeLine} />
                    <span style={styles.arrowText}>↓</span>
                    <div style={styles.routeLine} />
                  </div>
                  <div style={styles.routeRow}>
                    <span style={styles.redDot} />
                    <span style={styles.routeText}>{dropText}</span>
                  </div>
                </div>

                {/* Status badge */}
                <div style={{ ...styles.statusBadge, background: statusStyle.background, color: statusStyle.color }}>
                  {statusStyle.label}
                </div>
              </div>

              {/* Divider */}
              <div style={styles.divider} />

              {/* Card bottom: fare + date + distance */}
              <div style={styles.cardBottom}>
                <div>
                  <span style={styles.fareAmt}>₹{ride.fare}</span>
                  {ride.surgeMultiplier > 1 && (
                    <span style={styles.surgeBadge}>⚡ {ride.surgeMultiplier}×</span>
                  )}
                </div>
                <div style={styles.metaRight}>
                  {ride.distanceKm != null && (
                    <span style={styles.metaChip}>📍 {ride.distanceKm} km</span>
                  )}
                  <span style={styles.metaChip}>🕐 {formatDate(ride.bookedAt)}</span>
                </div>
              </div>

              {/* Driver info if present */}
              {ride.driverName && (
                <div style={styles.driverRow}>
                  <span style={styles.driverAvatar}>{ride.driverName[0]?.toUpperCase()}</span>
                  <span style={styles.driverName}>{ride.driverName}</span>
                  {ride.vehicleNumber && (
                    <span style={styles.vehicleNumber}>{ride.vehicleNumber}</span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Bottom padding for nav */}
      <div style={{ height: '80px' }} />
    </div>
  )
}

// ── PageHeader sub-component ──────────────────────────────────────────────────

function PageHeader({ onBack, count }) {
  return (
    <div style={styles.header}>
      <button style={styles.backBtn} onClick={onBack} aria-label="Go back">
        ←
      </button>
      <h1 style={styles.headerTitle}>My Rides</h1>
      {count != null
        ? <span style={styles.countBadge}>{count}</span>
        : <div style={{ width: '36px' }} />}
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = {
  page: {
    minHeight: '100vh',
    background: 'var(--black)',
  },

  // Header
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 20px 12px',
    maxWidth: '480px',
    margin: '0 auto',
    position: 'sticky',
    top: 0,
    background: 'var(--black)',
    zIndex: 10,
    borderBottom: '1px solid var(--border)',
  },
  backBtn: {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    color: 'white',
    borderRadius: '10px',
    width: '36px',
    height: '36px',
    fontSize: '18px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: '20px',
    fontWeight: '800',
    color: 'white',
    margin: 0,
  },
  countBadge: {
    background: 'rgba(255,215,0,0.15)',
    color: 'var(--yellow)',
    border: '1px solid rgba(255,215,0,0.3)',
    borderRadius: '20px',
    padding: '4px 12px',
    fontSize: '13px',
    fontWeight: '700',
    minWidth: '36px',
    textAlign: 'center',
  },

  // Content
  content: {
    padding: '16px 20px',
    maxWidth: '480px',
    margin: '0 auto',
  },

  // Stats card
  statsCard: {
    display: 'flex',
    alignItems: 'center',
    background: 'var(--card)',
    border: '1.5px solid rgba(255,215,0,0.2)',
    borderRadius: '18px',
    padding: '18px 20px',
    marginBottom: '20px',
    boxShadow: '0 4px 20px rgba(255,215,0,0.05)',
  },
  statCol: {
    flex: 1,
    textAlign: 'center',
  },
  statVal: {
    fontSize: '22px',
    fontWeight: '800',
    color: 'var(--yellow)',
    marginBottom: '4px',
  },
  statLbl: {
    fontSize: '10px',
    color: 'var(--muted)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  statDivider: {
    width: '1px',
    height: '40px',
    background: 'var(--border)',
    margin: '0 12px',
  },

  // Ride card
  rideCard: {
    background: 'var(--card)',
    border: '1.5px solid var(--border)',
    borderRadius: '18px',
    padding: '18px',
    marginBottom: '12px',
    transition: 'border-color 0.2s',
  },
  cardTop: {
    display: 'flex',
    gap: '14px',
    alignItems: 'flex-start',
  },
  vehicleBadge: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    background: 'rgba(255,215,0,0.08)',
    border: '1.5px solid rgba(255,215,0,0.2)',
    borderRadius: '14px',
    padding: '10px 10px',
    flexShrink: 0,
    minWidth: '56px',
  },
  vehicleEmojiLarge: {
    fontSize: '28px',
    marginBottom: '4px',
  },
  vehicleTypeLbl: {
    fontSize: '9px',
    fontWeight: '800',
    color: 'var(--yellow)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  routeBlock: {
    flex: 1,
    minWidth: 0,
  },
  routeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  routeText: {
    fontSize: '13px',
    color: 'var(--text)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
  },
  greenDot: {
    display: 'inline-block',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#4CAF50',
    flexShrink: 0,
  },
  redDot: {
    display: 'inline-block',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#F44336',
    flexShrink: 0,
  },
  routeConnector: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    paddingLeft: '3px',
    margin: '3px 0',
  },
  routeLine: {
    flex: 1,
    height: '1px',
    background: 'rgba(255,255,255,0.1)',
  },
  arrowText: {
    fontSize: '10px',
    color: 'var(--muted)',
  },
  statusBadge: {
    fontSize: '10px',
    fontWeight: '700',
    padding: '4px 10px',
    borderRadius: '20px',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
    flexShrink: 0,
    alignSelf: 'flex-start',
    marginTop: '2px',
  },

  // Divider
  divider: {
    height: '1px',
    background: 'var(--border)',
    margin: '14px 0',
  },

  // Card bottom
  cardBottom: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '8px',
  },
  fareAmt: {
    fontSize: '20px',
    fontWeight: '800',
    color: 'var(--yellow)',
  },
  surgeBadge: {
    marginLeft: '8px',
    fontSize: '11px',
    color: '#FF9800',
    background: 'rgba(255,152,0,0.1)',
    border: '1px solid rgba(255,152,0,0.3)',
    borderRadius: '10px',
    padding: '2px 8px',
    fontWeight: '700',
  },
  metaRight: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  metaChip: {
    fontSize: '11px',
    color: 'var(--muted)',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '8px',
    padding: '3px 8px',
  },

  // Driver row
  driverRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid var(--border)',
  },
  driverAvatar: {
    width: '26px',
    height: '26px',
    borderRadius: '50%',
    background: 'var(--yellow)',
    color: 'var(--black)',
    fontWeight: '800',
    fontSize: '12px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  driverName: {
    fontSize: '12px',
    color: 'var(--text)',
    fontWeight: '600',
  },
  vehicleNumber: {
    fontSize: '11px',
    color: 'var(--muted)',
    background: 'rgba(255,255,255,0.06)',
    borderRadius: '6px',
    padding: '2px 8px',
    marginLeft: 'auto',
  },

  // Empty / error states
  centered: {
    textAlign: 'center',
    padding: '60px 32px',
    maxWidth: '480px',
    margin: '0 auto',
  },
  bigEmoji: {
    fontSize: '64px',
    marginBottom: '16px',
  },
  emptyTitle: {
    fontSize: '20px',
    fontWeight: '800',
    color: 'white',
    marginBottom: '8px',
  },
  emptyText: {
    fontSize: '14px',
    color: 'var(--muted)',
    lineHeight: '1.5',
    marginBottom: '28px',
  },
  bookBtn: {
    background: 'var(--yellow)',
    color: 'var(--black)',
    border: 'none',
    borderRadius: '14px',
    padding: '14px 28px',
    fontSize: '15px',
    fontWeight: '800',
    cursor: 'pointer',
    display: 'inline-block',
  },
  retryBtn: {
    background: 'transparent',
    color: 'var(--yellow)',
    border: '1.5px solid var(--yellow)',
    borderRadius: '14px',
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'inline-block',
  },
}
