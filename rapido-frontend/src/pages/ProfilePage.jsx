import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import api, { logout, getUser } from '../services/api.js'
import {
  IconPhone, IconMail, IconUser, IconEdit, IconLogout,
  IconLocation, IconRide, IconSupport, IconHistory, IconCheck,
  IconBolt, IconHome, IconWork, IconHospital, IconMarket, IconSchool,
  IconGym, IconTrash, IconPlus, IconClose, IconGPS, IconMap,
} from '../components/icons.jsx'

// ── Fix Leaflet default icon ───────────────────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// Colored pin icon for quick locations
const makePinIcon = (color) => new L.DivIcon({
  html: `<div style="width:22px;height:22px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35)"></div>`,
  iconSize: [22, 22], iconAnchor: [11, 11], className: '',
})

// ── Quick location label config ────────────────────────────────────────────────
const LABEL_CONFIG = {
  HOME:     { Icon: IconHome,     color: '#2563EB', bg: '#DBEAFE', label: 'Home' },
  WORK:     { Icon: IconWork,     color: '#059669', bg: '#D1FAE5', label: 'Work' },
  GYM:      { Icon: IconGym,      color: '#7C3AED', bg: '#EDE9FE', label: 'Gym' },
  SCHOOL:   { Icon: IconSchool,   color: '#EA580C', bg: '#FFEDD5', label: 'School' },
  HOSPITAL: { Icon: IconHospital, color: '#DC2626', bg: '#FEE2E2', label: 'Hospital' },
  MARKET:   { Icon: IconMarket,   color: '#F59E0B', bg: '#FEF3C7', label: 'Market' },
  OTHER:    { Icon: IconLocation, color: '#6B7280', bg: '#F3F4F6', label: 'Other' },
}
const ALL_LABELS = Object.keys(LABEL_CONFIG)

// ── Map click handler component ────────────────────────────────────────────────
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

// ── Reverse geocode using Nominatim (free, no key needed) ─────────────────────
async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'Accept-Language': 'en' } }
    )
    const data = await res.json()
    return data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  }
}

// ── Quick Location Map Modal ───────────────────────────────────────────────────
function QuickLocationModal({ existingLabel, onClose, onSaved }) {
  const [selectedLabel, setSelectedLabel] = useState(existingLabel || 'HOME')
  const [pinLat, setPinLat]   = useState(null)
  const [pinLng, setPinLng]   = useState(null)
  const [address, setAddress] = useState('')
  const [saving, setSaving]   = useState(false)
  const [locating, setLocating] = useState(false)
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]) // India center
  const [error, setError] = useState('')

  // If editing existing, pre-populate
  useEffect(() => {
    if (existingLabel) setSelectedLabel(existingLabel)
  }, [existingLabel])

  const handleMapClick = useCallback(async (lat, lng) => {
    setPinLat(lat)
    setPinLng(lng)
    setAddress('Loading address...')
    const addr = await reverseGeocode(lat, lng)
    setAddress(addr)
  }, [])

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) { setError('Geolocation not supported'); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        setPinLat(latitude)
        setPinLng(longitude)
        setMapCenter([latitude, longitude])
        setAddress('Loading address...')
        const addr = await reverseGeocode(latitude, longitude)
        setAddress(addr)
        setLocating(false)
      },
      () => { setError('Could not get location'); setLocating(false) }
    )
  }

  const handleSave = async () => {
    if (!pinLat || !pinLng) { setError('Please select a location on the map'); return }
    setSaving(true)
    setError('')
    try {
      await api.post('/user/quick-locations', {
        label: selectedLabel,
        address,
        latitude: pinLat,
        longitude: pinLng,
      })
      onSaved()
      onClose()
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to save location')
    } finally {
      setSaving(false)
    }
  }

  const cfg = LABEL_CONFIG[selectedLabel]

  return (
    <div style={M.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={M.modal}>
        {/* Header */}
        <div style={M.header}>
          <div style={M.headerLeft}>
            <div style={{ ...M.labelIcon, background: cfg.bg }}>
              <cfg.Icon size={18} color={cfg.color} />
            </div>
            <div>
              <div style={M.headerTitle}>Set {cfg.label} Location</div>
              <div style={M.headerSub}>Tap on map to drop a pin</div>
            </div>
          </div>
          <button style={M.closeBtn} onClick={onClose}>
            <IconClose size={18} color="#718096" />
          </button>
        </div>

        {/* Label selector */}
        {!existingLabel && (
          <div style={M.labelRow}>
            {ALL_LABELS.map(lbl => {
              const c = LABEL_CONFIG[lbl]
              return (
                <button
                  key={lbl}
                  style={{
                    ...M.labelChip,
                    background: selectedLabel === lbl ? c.bg : '#F5F7FA',
                    border: selectedLabel === lbl ? `2px solid ${c.color}` : '2px solid transparent',
                    color: selectedLabel === lbl ? c.color : '#718096',
                  }}
                  onClick={() => setSelectedLabel(lbl)}
                >
                  <c.Icon size={13} color={selectedLabel === lbl ? c.color : '#A0AEC0'} />
                  <span style={{ fontSize: 11, fontWeight: 600 }}>{c.label}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* Use current location button */}
        <button style={M.gpsBtn} onClick={handleUseCurrentLocation} disabled={locating}>
          <IconGPS size={15} color="#2563EB" />
          <span>{locating ? 'Getting location…' : 'Use my current location'}</span>
        </button>

        {/* Map */}
        <div style={M.mapWrap}>
          <MapContainer
            center={mapCenter}
            zoom={pinLat ? 15 : 5}
            style={{ height: '100%', width: '100%' }}
            key={`${mapCenter[0]}-${mapCenter[1]}`}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='© OpenStreetMap contributors'
            />
            <MapClickHandler onMapClick={handleMapClick} />
            {pinLat && pinLng && (
              <Marker
                position={[pinLat, pinLng]}
                icon={makePinIcon(cfg.color)}
              />
            )}
          </MapContainer>
          {!pinLat && (
            <div style={M.mapHint}>
              <IconMap size={18} color="#A0AEC0" />
              <span>Tap on the map to pin your {cfg.label.toLowerCase()} location</span>
            </div>
          )}
        </div>

        {/* Address display */}
        {pinLat && (
          <div style={M.addressBox}>
            <IconLocation size={14} color="#F59E0B" />
            <span style={M.addressText}>{address || `${pinLat.toFixed(5)}, ${pinLng.toFixed(5)}`}</span>
          </div>
        )}

        {error && <div style={M.errorText}>{error}</div>}

        {/* Save button */}
        <button
          style={{ ...M.saveBtn, opacity: !pinLat || saving ? 0.6 : 1 }}
          onClick={handleSave}
          disabled={!pinLat || saving}
        >
          {saving ? 'Saving…' : `Save ${cfg.label} Location`}
        </button>
      </div>
    </div>
  )
}

// Modal styles
const M = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
    zIndex: 2000, display: 'flex', alignItems: 'flex-end',
    justifyContent: 'center',
  },
  modal: {
    background: '#FFFFFF', borderRadius: '20px 20px 0 0',
    width: '100%', maxWidth: 540,
    maxHeight: '90vh', overflowY: 'auto',
    padding: '0 0 24px',
    boxShadow: '0 -4px 40px rgba(0,0,0,0.2)',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 18px 12px',
    borderBottom: '1px solid #F0F2F5',
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  labelIcon: {
    width: 42, height: 42, borderRadius: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: 700, color: '#1A202C' },
  headerSub:   { fontSize: 12, color: '#A0AEC0', marginTop: 2 },
  closeBtn: {
    background: '#F5F7FA', border: 'none', borderRadius: 8,
    width: 34, height: 34, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  labelRow: {
    display: 'flex', gap: 8, padding: '12px 18px',
    flexWrap: 'wrap',
  },
  labelChip: {
    display: 'flex', alignItems: 'center', gap: 4,
    padding: '6px 10px', borderRadius: 20,
    cursor: 'pointer', transition: 'all 0.15s',
  },
  gpsBtn: {
    display: 'flex', alignItems: 'center', gap: 8,
    margin: '0 18px 12px',
    background: '#EFF6FF', border: '1px solid #BFDBFE',
    color: '#2563EB', borderRadius: 10, padding: '10px 14px',
    cursor: 'pointer', fontSize: 13, fontWeight: 600, width: 'calc(100% - 36px)',
  },
  mapWrap: {
    position: 'relative', height: 260, margin: '0 18px',
    borderRadius: 14, overflow: 'hidden',
    border: '1px solid #E2E8F0',
  },
  mapHint: {
    position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
    background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(4px)',
    border: '1px solid #E2E8F0', borderRadius: 20,
    padding: '8px 14px', fontSize: 12, color: '#718096',
    display: 'flex', alignItems: 'center', gap: 6,
    whiteSpace: 'nowrap', pointerEvents: 'none',
    zIndex: 1000,
  },
  addressBox: {
    display: 'flex', alignItems: 'flex-start', gap: 8,
    margin: '12px 18px 0',
    background: '#FEF3C7', border: '1px solid #FCD34D',
    borderRadius: 10, padding: '10px 14px',
  },
  addressText: { fontSize: 13, color: '#92400E', lineHeight: 1.4, flex: 1 },
  errorText: { fontSize: 13, color: '#DC2626', margin: '8px 18px 0', padding: '8px 12px', background: '#FEE2E2', borderRadius: 8 },
  saveBtn: {
    display: 'block', width: 'calc(100% - 36px)', margin: '16px 18px 0',
    background: 'linear-gradient(135deg, #F59E0B, #D97706)',
    color: 'white', border: 'none', borderRadius: 14,
    padding: '14px', fontSize: 15, fontWeight: 700, cursor: 'pointer',
  },
}

// ── Main ProfilePage ───────────────────────────────────────────────────────────
export default function ProfilePage() {
  const navigate = useNavigate()
  const localUser = getUser()

  const [profile, setProfile]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [editing, setEditing]   = useState(false)
  const [editName, setEditName]  = useState('')
  const [editEmail, setEditEmail]= useState('')
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState('')

  // Quick locations state
  const [quickLocs, setQuickLocs]         = useState([])
  const [showMapModal, setShowMapModal]   = useState(false)
  const [editingLabel, setEditingLabel]   = useState(null) // null = new, string = editing existing

  useEffect(() => {
    Promise.all([
      api.get('/user/profile'),
      api.get('/user/quick-locations'),
    ])
      .then(([profileRes, locsRes]) => {
        setProfile(profileRes.data)
        setEditName(profileRes.data.name)
        setEditEmail(profileRes.data.email)
        setQuickLocs(locsRes.data || [])
      })
      .catch(() => setProfile(null))
      .finally(() => setLoading(false))
  }, [])

  const reloadQuickLocs = async () => {
    try {
      const res = await api.get('/user/quick-locations')
      setQuickLocs(res.data || [])
    } catch { /* ignore */ }
  }

  const handleDeleteQuickLoc = async (label) => {
    try {
      await api.delete(`/user/quick-locations/${label}`)
      setQuickLocs(prev => prev.filter(l => l.label !== label))
    } catch { /* ignore */ }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put('/user/profile', { name: editName, email: editEmail })
      setProfile(p => ({ ...p, name: editName, email: editEmail }))
      setEditing(false)
      setMsg('Profile updated ✓')
      setTimeout(() => setMsg(''), 3000)
    } catch { setMsg('Update failed') }
    finally { setSaving(false) }
  }

  const initials = profile?.name
    ? profile.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  if (loading) return (
    <div style={S.page}>
      <div style={{ ...S.shimmerAvatar, background: '#F0F2F5' }} className="shimmer" />
      <div style={{ ...S.shimmerLine, background: '#F0F2F5' }} className="shimmer" />
      <div style={{ ...S.shimmerLine, background: '#F0F2F5' }} className="shimmer" />
    </div>
  )

  const infoRows = [
    {
      Icon: IconUser,
      label: 'Name',
      val: profile?.name,
      iconColor: '#2563EB',
      iconBg: '#DBEAFE',
    },
    {
      Icon: IconPhone,
      label: 'Phone',
      val: profile?.phoneNumber,
      iconColor: '#059669',
      iconBg: '#D1FAE5',
      badge: profile?.phoneVerified ? '✓ Verified' : '⚠ Unverified',
      badgeColor: profile?.phoneVerified ? '#059669' : '#EA580C',
      badgeBg: profile?.phoneVerified ? '#D1FAE5' : '#FFEDD5',
    },
    {
      Icon: IconMail,
      label: 'Email',
      val: profile?.email,
      iconColor: '#7C3AED',
      iconBg: '#EDE9FE',
    },
    {
      Icon: IconLocation,
      label: 'Last Location',
      val: profile?.latitude
        ? `${profile.latitude.toFixed(4)}, ${profile.longitude.toFixed(4)}`
        : 'Not set',
      iconColor: '#F59E0B',
      iconBg: '#FEF3C7',
    },
  ]

  const navigationLinks = [
    { Icon: IconHistory,  label: 'My Ride History',  action: () => navigate('/history'), color: '#F59E0B', bg: '#FEF3C7' },
    { Icon: IconSupport,  label: 'Customer Support', action: () => navigate('/support'), color: '#2563EB', bg: '#DBEAFE' },
    { Icon: IconBolt,     label: 'Book a Ride',      action: () => navigate('/book'),    color: '#059669', bg: '#D1FAE5' },
  ]

  const statsItems = [
    { val: profile?.totalRides     ?? 0, lbl: 'Total Rides',  icon: IconRide,    color: '#F59E0B', bg: '#FEF3C7' },
    { val: profile?.completedRides ?? 0, lbl: 'Completed',    icon: IconCheck,   color: '#059669', bg: '#D1FAE5' },
    { val: `₹${profile?.totalSpent ?? 0}`, lbl: 'Total Spent',icon: IconPhone,   color: '#2563EB', bg: '#DBEAFE' },
    { val: `₹${profile?.totalTips  ?? 0}`, lbl: 'Tips Given', icon: IconBolt,    color: '#7C3AED', bg: '#EDE9FE' },
  ]

  // Which labels are not yet saved
  const savedLabels = new Set(quickLocs.map(l => l.label))
  const availableLabels = ALL_LABELS.filter(l => !savedLabels.has(l))

  return (
    <div style={S.page}>

      {/* ── Avatar + name ── */}
      <div style={S.hero}>
        <div style={S.avatarWrap}>
          <div style={S.avatar}>{initials}</div>
          {profile?.phoneVerified && (
            <div style={S.verifiedBadge} title="Phone verified">
              <IconCheck size={10} color="white" />
            </div>
          )}
        </div>

        {editing ? (
          <div style={S.editBlock}>
            <input
              style={S.editInput}
              value={editName}
              onChange={e => setEditName(e.target.value)}
              placeholder="Full name"
            />
            <input
              style={S.editInput}
              value={editEmail}
              onChange={e => setEditEmail(e.target.value)}
              placeholder="Email"
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button style={S.saveBtn} onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button style={S.cancelEdit} onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <h1 style={S.name}>{profile?.name}</h1>
            <p style={S.phone}>
              <IconPhone size={13} color="#718096" style={{ marginRight: 6, verticalAlign: 'middle' }} />
              {profile?.phoneNumber}
            </p>
            <p style={S.email}>
              <IconMail size={13} color="#A0AEC0" style={{ marginRight: 6, verticalAlign: 'middle' }} />
              {profile?.email}
            </p>
            <button style={S.editBtn} onClick={() => setEditing(true)}>
              <IconEdit size={14} color="#D97706" style={{ marginRight: 6 }} />
              Edit profile
            </button>
          </>
        )}

        {msg && <div style={S.toast}>{msg}</div>}
      </div>

      {/* ── Stats grid ── */}
      <div style={S.statsGrid}>
        {statsItems.map(s => (
          <div key={s.lbl} style={S.statCard}>
            <div style={{ ...S.statIconWrap, background: s.bg }}>
              <s.icon size={16} color={s.color} />
            </div>
            <div style={{ ...S.statVal, color: s.color }}>{s.val}</div>
            <div style={S.statLbl}>{s.lbl}</div>
          </div>
        ))}
      </div>

      {/* ── Account Details ── */}
      <div style={S.section}>
        <div style={S.sectionTitle}>Account Details</div>
        <div style={S.sectionCard}>
          {infoRows.map((row, idx) => (
            <div key={row.label} style={{ ...S.infoRow, borderBottom: idx < infoRows.length - 1 ? '1px solid #F0F2F5' : 'none' }}>
              <div style={{ ...S.infoIconWrap, background: row.iconBg }}>
                <row.Icon size={16} color={row.iconColor} />
              </div>
              <div style={S.infoBody}>
                <div style={S.infoLabel}>{row.label}</div>
                <div style={S.infoVal}>{row.val || '—'}</div>
              </div>
              {row.badge && (
                <span style={{ ...S.badge, color: row.badgeColor, background: row.badgeBg }}>
                  {row.badge}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Quick Locations ── */}
      <div style={S.section}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={S.sectionTitle}>Quick Locations</div>
          {availableLabels.length > 0 && (
            <button
              style={S.addLocBtn}
              onClick={() => { setEditingLabel(null); setShowMapModal(true) }}
            >
              <IconPlus size={13} color="#D97706" />
              <span>Add</span>
            </button>
          )}
        </div>

        <div style={S.sectionCard}>
          {quickLocs.length === 0 ? (
            <div style={S.emptyLocs}>
              <IconMap size={28} color="#D1D5DB" />
              <div style={{ fontSize: 14, color: '#9CA3AF', marginTop: 8 }}>No saved locations yet</div>
              <div style={{ fontSize: 12, color: '#D1D5DB', marginTop: 4 }}>Save Home, Work, etc. for faster booking</div>
              <button
                style={{ ...S.addLocBtn, marginTop: 12, padding: '8px 18px' }}
                onClick={() => { setEditingLabel(null); setShowMapModal(true) }}
              >
                <IconPlus size={13} color="#D97706" />
                <span>Add your first location</span>
              </button>
            </div>
          ) : (
            <>
              {quickLocs.map((loc, idx) => {
                const cfg = LABEL_CONFIG[loc.label] || LABEL_CONFIG.OTHER
                return (
                  <div
                    key={loc.id || loc.label}
                    style={{
                      ...S.locRow,
                      borderBottom: idx < quickLocs.length - 1 ? '1px solid #F0F2F5' : 'none',
                    }}
                  >
                    <div style={{ ...S.locIconWrap, background: cfg.bg }}>
                      <cfg.Icon size={16} color={cfg.color} />
                    </div>
                    <div style={S.locBody}>
                      <div style={{ ...S.locLabel, color: cfg.color }}>{cfg.label}</div>
                      <div style={S.locAddress}>{loc.address || `${loc.latitude?.toFixed(4)}, ${loc.longitude?.toFixed(4)}`}</div>
                    </div>
                    <div style={S.locActions}>
                      <button
                        style={S.locEditBtn}
                        title="Edit location"
                        onClick={() => { setEditingLabel(loc.label); setShowMapModal(true) }}
                      >
                        <IconEdit size={14} color="#2563EB" />
                      </button>
                      <button
                        style={S.locDeleteBtn}
                        title="Remove location"
                        onClick={() => handleDeleteQuickLoc(loc.label)}
                      >
                        <IconTrash size={14} color="#DC2626" />
                      </button>
                    </div>
                  </div>
                )
              })}
              {/* Add more button if labels remain */}
              {availableLabels.length > 0 && (
                <div
                  style={{ ...S.locRow, cursor: 'pointer', justifyContent: 'center', gap: 8, padding: '12px 16px' }}
                  onClick={() => { setEditingLabel(null); setShowMapModal(true) }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F5F7FA'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <IconPlus size={14} color="#A0AEC0" />
                  <span style={{ fontSize: 13, color: '#A0AEC0' }}>Add another location</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Quick Links ── */}
      <div style={S.section}>
        <div style={S.sectionTitle}>Quick Links</div>
        <div style={S.sectionCard}>
          {navigationLinks.map((l, idx) => (
            <div
              key={l.label}
              style={{ ...S.linkRow, borderBottom: idx < navigationLinks.length - 1 ? '1px solid #F0F2F5' : 'none' }}
              onClick={l.action}
              onMouseEnter={e => e.currentTarget.style.background = '#F5F7FA'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ ...S.linkIconWrap, background: l.bg }}>
                <l.Icon size={16} color={l.color} />
              </div>
              <span style={S.linkLabel}>{l.label}</span>
              <span style={S.linkArrow}>›</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Logout ── */}
      <div style={{ padding: '0 16px 40px' }}>
        <button
          style={S.logoutBtn}
          onClick={() => { logout(); navigate('/login') }}
        >
          <IconLogout size={16} color="#DC2626" style={{ marginRight: 8 }} />
          Logout
        </button>
      </div>

      {/* ── Quick Location Map Modal ── */}
      {showMapModal && (
        <QuickLocationModal
          existingLabel={editingLabel}
          onClose={() => { setShowMapModal(false); setEditingLabel(null) }}
          onSaved={reloadQuickLocs}
        />
      )}
    </div>
  )
}

const S = {
  page: {
    minHeight: '100vh',
    background: '#F5F7FA',
    color: '#1A202C',
    paddingTop: 60,
  },
  hero: {
    background: '#FFFFFF',
    borderBottom: '1px solid #E2E8F0',
    padding: '32px 20px 28px',
    textAlign: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  avatarWrap: { position: 'relative', display: 'inline-block', marginBottom: 16 },
  avatar: {
    width: 80, height: 80, borderRadius: '50%',
    background: 'linear-gradient(135deg, #F59E0B, #D97706)',
    color: '#fff', fontSize: 28, fontWeight: 800,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto', boxShadow: '0 4px 20px rgba(245,158,11,0.3)',
  },
  verifiedBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 22, height: 22, background: '#059669', borderRadius: '50%',
    border: '2px solid #FFFFFF', color: 'white',
    fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700,
  },
  name:  { fontSize: 22, fontWeight: 700, margin: '0 0 4px', color: '#1A202C' },
  phone: { fontSize: 14, color: '#718096', margin: '0 0 4px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  email: { fontSize: 13, color: '#A0AEC0', margin: '0 0 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  editBtn: {
    background: '#FEF3C7', border: '1px solid #FCD34D',
    color: '#D97706', borderRadius: 10, padding: '8px 18px',
    cursor: 'pointer', fontSize: 13, fontWeight: 600,
    display: 'inline-flex', alignItems: 'center',
  },
  editBlock: { display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 320, margin: '0 auto' },
  editInput: {
    background: '#F5F7FA', border: '1px solid #E2E8F0',
    borderRadius: 10, padding: '10px 14px', color: '#1A202C', fontSize: 14,
  },
  saveBtn: {
    flex: 1, background: 'linear-gradient(135deg, #F59E0B, #D97706)',
    color: '#fff', border: 'none', borderRadius: 10, padding: '10px',
    fontWeight: 700, cursor: 'pointer',
  },
  cancelEdit: {
    flex: 1, background: '#F5F7FA', border: '1px solid #E2E8F0',
    color: '#718096', borderRadius: 10, padding: '10px', cursor: 'pointer',
  },
  toast: {
    marginTop: 12, background: '#D1FAE5', border: '1px solid #6EE7B7',
    color: '#059669', borderRadius: 10, padding: '8px 16px', fontSize: 13,
    display: 'inline-block',
  },

  statsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
    background: '#FFFFFF',
    borderBottom: '1px solid #E2E8F0',
    borderTop: '1px solid #E2E8F0',
  },
  statCard: {
    padding: '16px 8px', textAlign: 'center',
    borderRight: '1px solid #F0F2F5',
  },
  statIconWrap: {
    width: 32, height: 32, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto 6px',
  },
  statVal:  { fontSize: 15, fontWeight: 700, marginBottom: 3 },
  statLbl:  { fontSize: 9, color: '#A0AEC0', textTransform: 'uppercase', letterSpacing: 0.5 },

  section: { padding: '20px 16px 8px' },
  sectionTitle: {
    fontSize: 12, fontWeight: 700, color: '#A0AEC0',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 0,
  },
  sectionCard: {
    background: '#FFFFFF', borderRadius: 14, border: '1px solid #E2E8F0',
    overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },

  infoRow: {
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '13px 16px',
  },
  infoIconWrap: {
    width: 34, height: 34, borderRadius: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  infoBody:  { flex: 1 },
  infoLabel: { fontSize: 11, color: '#A0AEC0', marginBottom: 2 },
  infoVal:   { fontSize: 14, color: '#1A202C', fontWeight: 500 },
  badge:     { fontSize: 11, fontWeight: 700, borderRadius: 6, padding: '3px 8px', flexShrink: 0 },

  // Quick locations
  addLocBtn: {
    display: 'flex', alignItems: 'center', gap: 4,
    background: '#FEF3C7', border: '1px solid #FCD34D',
    color: '#D97706', borderRadius: 8, padding: '5px 12px',
    cursor: 'pointer', fontSize: 12, fontWeight: 600,
  },
  emptyLocs: {
    padding: '28px 16px', textAlign: 'center',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
  },
  locRow: {
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '13px 16px',
  },
  locIconWrap: {
    width: 34, height: 34, borderRadius: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  locBody:    { flex: 1, minWidth: 0 },
  locLabel:   { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  locAddress: {
    fontSize: 13, color: '#718096',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  locActions: { display: 'flex', gap: 6, flexShrink: 0 },
  locEditBtn: {
    width: 30, height: 30, border: '1px solid #BFDBFE', background: '#EFF6FF',
    borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
  },
  locDeleteBtn: {
    width: 30, height: 30, border: '1px solid #FECACA', background: '#FEE2E2',
    borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
  },

  linkRow: {
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '14px 16px',
    cursor: 'pointer', transition: 'background 0.15s',
  },
  linkIconWrap: {
    width: 34, height: 34, borderRadius: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  linkLabel: { flex: 1, fontSize: 15, fontWeight: 500, color: '#1A202C' },
  linkArrow: { fontSize: 20, color: '#CBD5E0' },

  logoutBtn: {
    width: '100%', background: '#FEE2E2', border: '1px solid #FECACA',
    color: '#DC2626', borderRadius: 14, padding: '14px',
    fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 8,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },

  shimmerAvatar: { width: 80, height: 80, borderRadius: '50%', margin: '32px auto 16px' },
  shimmerLine:   { height: 20, borderRadius: 8, margin: '10px auto', width: '60%', maxWidth: 200 },
}
