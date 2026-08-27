import { useState } from 'react'
import { rideApi } from '../services/api.js'

// ── Issue categories ──────────────────────────────────────────────────────────
const CATEGORIES = [
  {
    key: 'MISBEHAVIOUR',
    emoji: '😡',
    label: 'Driver Misbehaved',
    sublabel: 'Rude, threatening or inappropriate behaviour',
    color: '#DC2626',
    bg: '#FEF2F2',
    border: '#FECACA',
  },
  {
    key: 'EXTRA_CHARGE',
    emoji: '💸',
    label: 'Extra Charge',
    sublabel: 'Charged more than the estimated fare',
    color: '#D97706',
    bg: '#FFFBEB',
    border: '#FDE68A',
  },
  {
    key: 'NO_HELMET',
    emoji: '⛑️',
    label: 'No Helmet Worn',
    sublabel: 'Bike driver did not wear a helmet',
    color: '#7C3AED',
    bg: '#F5F3FF',
    border: '#DDD6FE',
  },
  {
    key: 'LOST_ITEM',
    emoji: '🎒',
    label: 'Lost Item',
    sublabel: 'Left something behind in the vehicle',
    color: '#2563EB',
    bg: '#EFF6FF',
    border: '#BFDBFE',
  },
  {
    key: 'WRONG_DROP',
    emoji: '📍',
    label: 'Wrong Drop Location',
    sublabel: 'Dropped at wrong or unsafe location',
    color: '#059669',
    bg: '#F0FDF4',
    border: '#BBF7D0',
  },
  {
    key: 'OTHER',
    emoji: '💬',
    label: 'Other Issue',
    sublabel: 'Any other concern about your ride',
    color: '#475569',
    bg: '#F8FAFC',
    border: '#E2E8F0',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
export default function ReportProblemModal({ ride, onClose, onSuccess }) {
  const [step, setStep]             = useState('category')   // category | describe | preview | done
  const [selected, setSelected]     = useState(null)
  const [description, setDesc]      = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState('')
  const [draftedReply, setDrafted]  = useState('')
  const [reportId, setReportId]     = useState(null)

  const cat = CATEGORIES.find(c => c.key === selected)

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!selected) return
    setSubmitting(true)
    setError('')
    try {
      const res = await rideApi.reportProblem({
        rideId:        ride.id,
        category:      selected,
        description:   description.trim(),
        driverName:    ride.driverName    || '',
        vehicleNumber: ride.vehicleNumber || '',
      })
      setDrafted(res.data.draftedReply || '')
      setReportId(res.data.reportId)
      setStep('done')
      if (onSuccess) onSuccess(ride.id)
    } catch (e) {
      const msg = e.response?.data?.message || 'Failed to submit report. Please try again.'
      // Duplicate report — show it gracefully
      if (e.response?.status === 409) {
        setError('You have already reported a problem for this ride.')
        return
      }
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP: category selection
  // ─────────────────────────────────────────────────────────────────────────
  if (step === 'category') {
    return (
      <div style={S.backdrop} onClick={e => e.target === e.currentTarget && onClose()}>
        <div style={S.sheet}>
          <div style={S.handle} />
          <div style={S.header}>
            <div>
              <div style={S.headerTitle}>Report a Problem</div>
              <div style={S.headerSub}>What went wrong with your ride?</div>
            </div>
            <button style={S.closeBtn} onClick={onClose}>✕</button>
          </div>

          {/* Ride snippet */}
          <div style={S.rideSnippet}>
            <span style={S.snippetEmoji}>🚗</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={S.snippetRoute}>
                {truncate(ride.pickupAddress, 22)} → {truncate(ride.dropAddress, 22)}
              </div>
              <div style={S.snippetMeta}>
                {ride.driverName && <span>{ride.driverName} · </span>}
                <span>₹{ride.fare}</span>
              </div>
            </div>
          </div>

          <div style={S.categoryList}>
            {CATEGORIES.map(c => (
              <div
                key={c.key}
                style={{
                  ...S.categoryCard,
                  ...(selected === c.key ? {
                    background: c.bg,
                    border: `2px solid ${c.color}`,
                    boxShadow: `0 0 0 3px ${c.color}18`,
                  } : {}),
                }}
                onClick={() => setSelected(c.key)}
              >
                <div style={{ ...S.catEmoji, background: c.bg, border: `1.5px solid ${c.border}` }}>
                  <span style={{ fontSize: 22 }}>{c.emoji}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ ...S.catLabel, color: selected === c.key ? c.color : '#1A202C' }}>
                    {c.label}
                  </div>
                  <div style={S.catSub}>{c.sublabel}</div>
                </div>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%',
                  border: `2px solid ${selected === c.key ? c.color : '#CBD5E0'}`,
                  background: selected === c.key ? c.color : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {selected === c.key && <span style={{ color: '#fff', fontSize: 11, fontWeight: 800 }}>✓</span>}
                </div>
              </div>
            ))}
          </div>

          <div style={S.footer}>
            <button style={S.cancelBtn} onClick={onClose}>Cancel</button>
            <button
              style={{ ...S.nextBtn, opacity: selected ? 1 : 0.5 }}
              disabled={!selected}
              onClick={() => setStep('describe')}
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP: describe
  // ─────────────────────────────────────────────────────────────────────────
  if (step === 'describe') {
    return (
      <div style={S.backdrop} onClick={e => e.target === e.currentTarget && onClose()}>
        <div style={S.sheet}>
          <div style={S.handle} />
          <div style={S.header}>
            <button style={S.backBtn} onClick={() => setStep('category')}>←</button>
            <div style={{ flex: 1 }}>
              <div style={S.headerTitle}>Describe the issue</div>
              <div style={S.headerSub}>Optional — add more details</div>
            </div>
            <button style={S.closeBtn} onClick={onClose}>✕</button>
          </div>

          {/* Selected category badge */}
          {cat && (
            <div style={{ ...S.selectedBadge, background: cat.bg, border: `1.5px solid ${cat.border}` }}>
              <span style={{ fontSize: 20, marginRight: 8 }}>{cat.emoji}</span>
              <div>
                <div style={{ fontWeight: 700, color: cat.color, fontSize: 13 }}>{cat.label}</div>
                <div style={{ fontSize: 11, color: '#718096' }}>{cat.sublabel}</div>
              </div>
            </div>
          )}

          <div style={{ padding: '0 16px 8px' }}>
            <label style={S.label}>Tell us more (optional)</label>
            <textarea
              style={S.textarea}
              placeholder={`Describe what happened… e.g. "${cat?.label} — ${cat?.sublabel}"`}
              value={description}
              onChange={e => setDesc(e.target.value)}
              maxLength={500}
              rows={4}
            />
            <div style={S.charCount}>{description.length}/500</div>
          </div>

          {error && (
            <div style={S.errorBox}>⚠️ {error}</div>
          )}

          <div style={S.footer}>
            <button style={S.cancelBtn} onClick={() => setStep('category')}>Back</button>
            <button
              style={{ ...S.submitBtn, opacity: submitting ? 0.7 : 1 }}
              disabled={submitting}
              onClick={handleSubmit}
            >
              {submitting ? 'Submitting…' : '📤 Submit Report'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP: done — show draft reply
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={S.backdrop} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={S.sheet}>
        <div style={S.handle} />

        {/* Success header */}
        <div style={S.successHeader}>
          <div style={S.successIcon}>✅</div>
          <div style={S.successTitle}>Report Submitted!</div>
          <div style={S.successSub}>
            Report #{reportId} · Our team will respond within 24 hours
          </div>
        </div>

        {/* Draft reply preview */}
        {draftedReply && (
          <div style={S.replyPreview}>
            <div style={S.replyLabel}>📨 Auto-drafted reply from CABkaro</div>
            <div style={S.replyText}>{draftedReply}</div>
          </div>
        )}

        {/* Category reminder */}
        {cat && (
          <div style={{ ...S.selectedBadge, background: cat.bg, border: `1.5px solid ${cat.border}`, margin: '0 16px 16px' }}>
            <span style={{ fontSize: 18, marginRight: 8 }}>{cat.emoji}</span>
            <div style={{ fontWeight: 600, color: cat.color, fontSize: 13 }}>{cat.label}</div>
          </div>
        )}

        <div style={{ padding: '0 16px 28px' }}>
          <button style={S.doneBtn} onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function truncate(str, n) {
  if (!str) return '—'
  return str.length > n ? str.slice(0, n) + '…' : str
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  backdrop: {
    position: 'fixed', inset: 0, zIndex: 9999,
    background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
  },
  sheet: {
    width: '100%', maxWidth: 480,
    background: '#FFFFFF', borderRadius: '20px 20px 0 0',
    maxHeight: '90vh', overflowY: 'auto',
    boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
    animation: 'slideUp 0.25s ease',
  },
  handle: {
    width: 40, height: 4, background: '#E2E8F0',
    borderRadius: 2, margin: '12px auto 0',
  },
  header: {
    display: 'flex', alignItems: 'flex-start', gap: 10,
    padding: '16px 16px 12px', borderBottom: '1px solid #F0F2F5',
  },
  headerTitle: { fontSize: 17, fontWeight: 800, color: '#1A202C' },
  headerSub:   { fontSize: 12, color: '#718096', marginTop: 2 },
  closeBtn: {
    background: '#F5F7FA', border: '1px solid #E2E8F0', color: '#718096',
    borderRadius: '50%', width: 30, height: 30, cursor: 'pointer',
    fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  backBtn: {
    background: '#F5F7FA', border: '1px solid #E2E8F0', color: '#1A202C',
    borderRadius: 10, padding: '6px 12px', cursor: 'pointer',
    fontSize: 15, fontWeight: 700, flexShrink: 0,
  },
  rideSnippet: {
    display: 'flex', alignItems: 'center', gap: 10,
    margin: '12px 16px', background: '#F8FAFC',
    border: '1px solid #E2E8F0', borderRadius: 12, padding: '10px 14px',
  },
  snippetEmoji: { fontSize: 22, flexShrink: 0 },
  snippetRoute: { fontSize: 13, fontWeight: 600, color: '#1A202C', marginBottom: 2 },
  snippetMeta:  { fontSize: 11, color: '#718096' },
  categoryList: { padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 8 },
  categoryCard: {
    display: 'flex', alignItems: 'center', gap: 12,
    background: '#F8FAFC', border: '1.5px solid #E2E8F0',
    borderRadius: 14, padding: '12px 14px', cursor: 'pointer',
    transition: 'all 0.15s',
  },
  catEmoji: {
    width: 44, height: 44, borderRadius: 12, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  catLabel: { fontSize: 14, fontWeight: 700, marginBottom: 2 },
  catSub:   { fontSize: 11, color: '#718096' },
  selectedBadge: {
    display: 'flex', alignItems: 'center',
    margin: '0 16px 16px', borderRadius: 12, padding: '10px 14px',
  },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 },
  textarea: {
    width: '100%', boxSizing: 'border-box',
    background: '#F8FAFC', border: '1.5px solid #E2E8F0',
    borderRadius: 12, padding: '12px 14px', fontSize: 13, color: '#1A202C',
    resize: 'none', outline: 'none', lineHeight: 1.6,
    fontFamily: 'inherit',
  },
  charCount: { fontSize: 11, color: '#A0AEC0', textAlign: 'right', marginTop: 4 },
  errorBox: {
    margin: '0 16px 12px', background: '#FEF2F2', border: '1px solid #FECACA',
    borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#DC2626',
  },
  footer: {
    display: 'flex', gap: 10, padding: '12px 16px 28px',
    borderTop: '1px solid #F0F2F5',
  },
  cancelBtn: {
    flex: 1, background: '#F5F7FA', border: '1px solid #E2E8F0',
    color: '#718096', borderRadius: 12, padding: 13, fontSize: 14,
    fontWeight: 600, cursor: 'pointer',
  },
  nextBtn: {
    flex: 2, background: 'linear-gradient(135deg, #F59E0B, #D97706)',
    border: 'none', color: '#fff', borderRadius: 12, padding: 13,
    fontSize: 14, fontWeight: 800, cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(245,158,11,0.3)',
  },
  submitBtn: {
    flex: 2, background: 'linear-gradient(135deg, #DC2626, #B91C1C)',
    border: 'none', color: '#fff', borderRadius: 12, padding: 13,
    fontSize: 14, fontWeight: 800, cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(220,38,38,0.25)',
  },
  // Done screen
  successHeader: {
    textAlign: 'center', padding: '28px 20px 16px',
  },
  successIcon:  { fontSize: 52, marginBottom: 12 },
  successTitle: { fontSize: 22, fontWeight: 800, color: '#1A202C', marginBottom: 6 },
  successSub:   { fontSize: 13, color: '#718096' },
  replyPreview: {
    margin: '0 16px 16px', background: '#F0FDF4',
    border: '1.5px solid #BBF7D0', borderRadius: 14, padding: '14px 16px',
  },
  replyLabel: {
    fontSize: 12, fontWeight: 700, color: '#059669', marginBottom: 10,
    display: 'flex', alignItems: 'center', gap: 4,
  },
  replyText: {
    fontSize: 12, color: '#374151', lineHeight: 1.7,
    whiteSpace: 'pre-line',
  },
  doneBtn: {
    width: '100%', background: 'linear-gradient(135deg, #059669, #047857)',
    border: 'none', color: '#fff', borderRadius: 14, padding: 15,
    fontSize: 16, fontWeight: 800, cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(5,150,105,0.25)',
  },
}
