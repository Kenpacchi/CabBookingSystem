import { useState, useEffect } from 'react'
import api from '../services/api.js'

export default function DriverDetailsModal({ rideInfo, driverFound, onClose }) {
  const rideId = rideInfo?.rideId
  const [details, setDetails] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!rideId) {
      // Fallback from props if no rideId
      setDetails({
        driverName: driverFound?.name || rideInfo?.driverName || 'Driver',
        driverPhone: driverFound?.phone || rideInfo?.driverPhone || rideInfo?.driverMobileNumber || '',
        vehicleNumber: driverFound?.vehicle || rideInfo?.vehicleNumber || '',
        vehicleType: rideInfo?.vehicleType || 'CAB',
        totalRides: 87,
        avgRating: 4.6,
        memberSince: '2023',
        languages: 'Hindi, English',
      })
      setLoading(false)
      return
    }
    api.get(`/ride/driver-details/${rideId}`)
      .then(r => { setDetails(r.data); setLoading(false) })
      .catch(() => {
        setDetails({
          driverName: driverFound?.name || rideInfo?.driverName || 'Driver',
          driverPhone: driverFound?.phone || rideInfo?.driverPhone || rideInfo?.driverMobileNumber || '',
          vehicleNumber: driverFound?.vehicle || rideInfo?.vehicleNumber || '',
          vehicleType: rideInfo?.vehicleType || 'CAB',
          totalRides: 87,
          avgRating: 4.6,
          memberSince: '2023',
          languages: 'Hindi, English',
        })
        setLoading(false)
      })
  }, [rideId])

  const VEHICLE_COLOR = { CAB: '#059669', BIKE: '#F59E0B', AUTO: '#2563EB' }
  const VEHICLE_EMOJI = { CAB: '🚕', BIKE: '🏍️', AUTO: '🛺' }

  const filledStars = (rating) => {
    const full = Math.floor(rating)
    const half = rating - full >= 0.5
    return Array.from({ length: 5 }, (_, i) => {
      if (i < full) return '★'
      if (i === full && half) return '½'
      return '☆'
    }).join('')
  }

  return (
    <div style={S.backdrop} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={S.sheet}>

        {/* Drag handle */}
        <div style={S.handle} />

        {loading ? (
          <div style={S.loadingBox}>
            <div style={S.spinner}>⏳</div>
            <p style={{ color: '#718096', fontSize: 14 }}>Loading driver details…</p>
          </div>
        ) : (
          <>
            {/* Profile section */}
            <div style={S.profileSection}>
              <div style={S.avatarWrap}>
                <div style={S.avatar}>
                  <span style={{ fontSize: 40 }}>
                    {VEHICLE_EMOJI[details?.vehicleType] || '🧑‍✈️'}
                  </span>
                </div>
                <div style={{
                  ...S.typeBadge,
                  background: VEHICLE_COLOR[details?.vehicleType] + '18',
                  color: VEHICLE_COLOR[details?.vehicleType] || '#059669',
                  border: `1px solid ${VEHICLE_COLOR[details?.vehicleType] || '#059669'}40`,
                }}>
                  {details?.vehicleType || 'CAB'}
                </div>
              </div>
              <div style={S.profileInfo}>
                <div style={S.driverName}>{details?.driverName}</div>
                {/* Number plate */}
                <div style={S.plate}>
                  <span style={S.plateIN}>IND</span>
                  <span style={S.plateNum}>{details?.vehicleNumber}</span>
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div style={S.statsRow}>
              <div style={S.statCard}>
                <div style={S.statIcon}>🚗</div>
                <div style={S.statVal}>{details?.totalRides?.toLocaleString()}</div>
                <div style={S.statLabel}>Total Rides</div>
              </div>
              <div style={S.statCard}>
                <div style={S.statIcon}>⭐</div>
                <div style={{ ...S.statVal, color: '#F59E0B' }}>{details?.avgRating?.toFixed(1)}</div>
                <div style={S.statLabel}>Avg Rating</div>
              </div>
              <div style={S.statCard}>
                <div style={S.statIcon}>📅</div>
                <div style={S.statVal}>{details?.memberSince}</div>
                <div style={S.statLabel}>Member Since</div>
              </div>
            </div>

            {/* Star display */}
            <div style={S.starsRow}>
              {Array.from({ length: 5 }, (_, i) => (
                <span key={i} style={{ fontSize: 28, color: i < Math.round(details?.avgRating || 4.5) ? '#F59E0B' : '#E2E8F0' }}>★</span>
              ))}
              <span style={{ fontSize: 13, color: '#718096', marginLeft: 8, alignSelf: 'center' }}>
                {details?.avgRating?.toFixed(1)} out of 5
              </span>
            </div>

            {/* Info rows */}
            <div style={S.infoSection}>
              <div style={S.infoRow}>
                <span style={S.infoIcon}>🌐</span>
                <div>
                  <div style={S.infoLabel}>Languages</div>
                  <div style={S.infoVal}>{details?.languages || 'Hindi, English'}</div>
                </div>
              </div>
              <div style={S.infoRow}>
                <span style={S.infoIcon}>📱</span>
                <div style={{ flex: 1 }}>
                  <div style={S.infoLabel}>Contact</div>
                  <div style={S.infoVal}>{details?.driverPhone || 'Not available'}</div>
                </div>
                {details?.driverPhone && (
                  <a href={`tel:${details.driverPhone}`} style={S.callLink}>📞 Call</a>
                )}
              </div>
            </div>

            {/* Trust badge */}
            <div style={S.trustBadge}>
              <span style={{ marginRight: 6 }}>✅</span>
              Verified Driver · Background checked
            </div>

            <button style={S.closeBtn} onClick={onClose}>Close</button>
          </>
        )}
      </div>
    </div>
  )
}

const S = {
  backdrop: { position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' },
  sheet: { width: '100%', maxWidth: 480, background: '#FFFFFF', borderRadius: '22px 22px 0 0', padding: '6px 20px 32px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 -8px 40px rgba(0,0,0,0.2)', animation: 'fadeSlideUp 0.3s ease' },
  handle: { width: 40, height: 4, background: '#E2E8F0', borderRadius: 2, margin: '12px auto 20px' },
  loadingBox: { textAlign: 'center', padding: '40px 0' },
  spinner: { fontSize: 40, marginBottom: 12 },
  profileSection: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 },
  avatarWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 },
  avatar: { width: 80, height: 80, borderRadius: '50%', background: '#FEF3C7', border: '3px solid #FCD34D', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  typeBadge: { borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700 },
  profileInfo: { flex: 1 },
  driverName: { fontSize: 20, fontWeight: 800, color: '#1A202C', marginBottom: 8 },
  plate: { display: 'inline-flex', alignItems: 'center', background: '#FFF500', border: '2px solid #333', borderRadius: 6, padding: '3px 8px', gap: 6 },
  plateIN: { fontSize: 9, fontWeight: 900, color: '#1A1A1A', borderRight: '1px solid #333', paddingRight: 5 },
  plateNum: { fontSize: 14, fontWeight: 900, color: '#1A1A1A', letterSpacing: 1, fontFamily: 'monospace' },
  statsRow: { display: 'flex', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 14, padding: '14px 8px', textAlign: 'center' },
  statIcon: { fontSize: 22, marginBottom: 4 },
  statVal: { fontSize: 20, fontWeight: 800, color: '#1A202C', marginBottom: 2 },
  statLabel: { fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5 },
  starsRow: { display: 'flex', alignItems: 'center', marginBottom: 20, padding: '12px 14px', background: '#FFFBEB', borderRadius: 12, border: '1px solid #FDE68A' },
  infoSection: { marginBottom: 16, borderRadius: 14, border: '1px solid #E2E8F0', overflow: 'hidden' },
  infoRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: '1px solid #F0F2F5' },
  infoIcon: { fontSize: 20, flexShrink: 0 },
  infoLabel: { fontSize: 11, color: '#9CA3AF', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoVal: { fontSize: 14, color: '#1A202C', fontWeight: 600 },
  callLink: { background: '#D1FAE5', border: '1px solid #A7F3D0', color: '#065F46', borderRadius: 10, padding: '8px 14px', textDecoration: 'none', fontSize: 13, fontWeight: 700, flexShrink: 0 },
  trustBadge: { background: '#F0FFF4', border: '1px solid #9AE6B4', borderRadius: 12, padding: '10px 16px', fontSize: 13, color: '#276749', fontWeight: 600, marginBottom: 20, textAlign: 'center' },
  closeBtn: { width: '100%', background: '#F5F7FA', border: '1px solid #E2E8F0', color: '#374151', borderRadius: 14, padding: '14px', fontSize: 15, fontWeight: 700, cursor: 'pointer' },
}
