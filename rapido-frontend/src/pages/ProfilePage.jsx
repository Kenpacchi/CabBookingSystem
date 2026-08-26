import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api, { logout, getUser } from '../services/api.js'

export default function ProfilePage() {
  const navigate = useNavigate()
  const localUser = getUser()

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing]   = useState(false)
  const [editName, setEditName]  = useState('')
  const [editEmail, setEditEmail]= useState('')
  const [saving, setSaving]      = useState(false)
  const [msg, setMsg]            = useState('')

  useEffect(() => {
    api.get('/user/profile')
      .then(r => {
        setProfile(r.data)
        setEditName(r.data.name)
        setEditEmail(r.data.email)
      })
      .catch(() => setProfile(null))
      .finally(() => setLoading(false))
  }, [])

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
      <div style={S.shimmerAvatar} className="shimmer" />
      <div style={S.shimmerLine}   className="shimmer" />
      <div style={S.shimmerLine}   className="shimmer" />
    </div>
  )

  return (
    <div style={S.page}>

      {/* ── Avatar + name ── */}
      <div style={S.hero}>
        <div style={S.avatarWrap}>
          <div style={S.avatar}>{initials}</div>
          {profile?.phoneVerified && (
            <div style={S.verifiedBadge} title="Phone verified">✓</div>
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
            <p  style={S.phone}>📱 {profile?.phoneNumber}</p>
            <p  style={S.email}>✉️ {profile?.email}</p>
            <button style={S.editBtn} onClick={() => setEditing(true)}>✏️ Edit profile</button>
          </>
        )}

        {msg && <div style={S.toast}>{msg}</div>}
      </div>

      {/* ── Stats grid ── */}
      <div style={S.statsGrid}>
        {[
          { val: profile?.totalRides     ?? 0, lbl: 'Total Rides',     icon: '🚗' },
          { val: profile?.completedRides ?? 0, lbl: 'Completed',       icon: '✅' },
          { val: `₹${profile?.totalSpent ?? 0}`, lbl: 'Total Spent',   icon: '💰' },
          { val: `₹${profile?.totalTips  ?? 0}`, lbl: 'Tips Given',    icon: '🎁' },
        ].map(s => (
          <div key={s.lbl} style={S.statCard}>
            <div style={S.statIcon}>{s.icon}</div>
            <div style={S.statVal}>{s.val}</div>
            <div style={S.statLbl}>{s.lbl}</div>
          </div>
        ))}
      </div>

      {/* ── Info rows ── */}
      <div style={S.section}>
        <div style={S.sectionTitle}>Account Details</div>

        {[
          { icon: '👤', label: 'Name',          val: profile?.name },
          { icon: '📱', label: 'Phone',          val: profile?.phoneNumber,
            badge: profile?.phoneVerified ? '✓ Verified' : '⚠ Unverified',
            badgeColor: profile?.phoneVerified ? '#4CAF50' : '#FF9800' },
          { icon: '✉️', label: 'Email',          val: profile?.email },
          { icon: '📍', label: 'Last Location',  val: profile?.latitude
              ? `${profile.latitude.toFixed(4)}, ${profile.longitude.toFixed(4)}`
              : 'Not set' },
        ].map(row => (
          <div key={row.label} style={S.infoRow}>
            <span style={S.infoIcon}>{row.icon}</span>
            <div style={S.infoBody}>
              <div style={S.infoLabel}>{row.label}</div>
              <div style={S.infoVal}>{row.val || '—'}</div>
            </div>
            {row.badge && (
              <span style={{ ...S.badge, color: row.badgeColor, borderColor: row.badgeColor }}>
                {row.badge}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* ── Quick links ── */}
      <div style={S.section}>
        <div style={S.sectionTitle}>Quick Links</div>
        {[
          { icon: '🚗', label: 'My Ride History',   action: () => navigate('/history') },
          { icon: '💬', label: 'Customer Support',  action: () => navigate('/support') },
          { icon: '📖', label: 'Book a Ride',       action: () => navigate('/book') },
        ].map(l => (
          <div key={l.label} style={S.linkRow} onClick={l.action}>
            <span style={S.linkIcon}>{l.icon}</span>
            <span style={S.linkLabel}>{l.label}</span>
            <span style={S.linkArrow}>›</span>
          </div>
        ))}
      </div>

      {/* ── Logout ── */}
      <div style={{ padding: '0 16px 40px' }}>
        <button
          style={S.logoutBtn}
          onClick={() => { logout(); navigate('/login') }}
        >
          🚪 Logout
        </button>
      </div>
    </div>
  )
}

const S = {
  page: {
    minHeight: '100vh', background: '#0a0a0a', color: 'white',
    paddingTop: 56,
  },
  hero: {
    background: 'linear-gradient(160deg, #1a1200 0%, #0d0d0d 80%)',
    borderBottom: '1px solid rgba(255,215,0,0.08)',
    padding: '32px 20px 28px', textAlign: 'center',
  },
  avatarWrap: { position: 'relative', display: 'inline-block', marginBottom: 16 },
  avatar: {
    width: 80, height: 80, borderRadius: '50%',
    background: 'linear-gradient(135deg, #FFD700, #FFA000)',
    color: '#111', fontSize: 28, fontWeight: 800,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto', boxShadow: '0 0 24px rgba(255,215,0,0.3)',
  },
  verifiedBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 22, height: 22, background: '#4CAF50', borderRadius: '50%',
    border: '2px solid #0a0a0a', color: 'white',
    fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700,
  },
  name:  { fontSize: 22, fontWeight: 700, margin: '0 0 4px' },
  phone: { fontSize: 14, color: 'rgba(255,255,255,0.6)', margin: '0 0 4px' },
  email: { fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: '0 0 16px' },
  editBtn: {
    background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.3)',
    color: '#FFD700', borderRadius: 10, padding: '8px 18px',
    cursor: 'pointer', fontSize: 13, fontWeight: 600,
  },
  editBlock: { display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 320, margin: '0 auto' },
  editInput: {
    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,215,0,0.3)',
    borderRadius: 10, padding: '10px 14px', color: 'white', fontSize: 14,
  },
  saveBtn: {
    flex: 1, background: 'linear-gradient(135deg, #FFD700, #FFA000)',
    color: '#111', border: 'none', borderRadius: 10, padding: '10px',
    fontWeight: 700, cursor: 'pointer',
  },
  cancelEdit: {
    flex: 1, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.7)', borderRadius: 10, padding: '10px', cursor: 'pointer',
  },
  toast: {
    marginTop: 12, background: 'rgba(76,175,80,0.15)', border: '1px solid rgba(76,175,80,0.3)',
    color: '#4CAF50', borderRadius: 10, padding: '8px 16px', fontSize: 13,
  },

  statsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 1, borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  statCard: {
    background: 'rgba(255,255,255,0.03)', padding: '16px 8px',
    textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.04)',
  },
  statIcon: { fontSize: 20, marginBottom: 6 },
  statVal:  { fontSize: 16, fontWeight: 700, color: '#FFD700', marginBottom: 3 },
  statLbl:  { fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 0.5 },

  section: { padding: '20px 16px 8px' },
  sectionTitle: { fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },

  infoRow: {
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  infoIcon:  { fontSize: 18, flexShrink: 0 },
  infoBody:  { flex: 1 },
  infoLabel: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 2 },
  infoVal:   { fontSize: 14, color: 'white' },
  badge:     { fontSize: 11, fontWeight: 700, border: '1px solid', borderRadius: 6, padding: '2px 8px' },

  linkRow: {
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
    cursor: 'pointer',
  },
  linkIcon:  { fontSize: 20, flexShrink: 0 },
  linkLabel: { flex: 1, fontSize: 15, fontWeight: 500 },
  linkArrow: { fontSize: 22, color: 'rgba(255,255,255,0.2)' },

  logoutBtn: {
    width: '100%', background: 'rgba(255,82,82,0.1)', border: '1px solid rgba(255,82,82,0.3)',
    color: '#FF5252', borderRadius: 14, padding: '14px',
    fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 8,
  },

  shimmerAvatar: { width: 80, height: 80, borderRadius: '50%', margin: '32px auto 16px' },
  shimmerLine:   { height: 20, borderRadius: 8, margin: '10px auto', width: '60%', maxWidth: 200 },
}
