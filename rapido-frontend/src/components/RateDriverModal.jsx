import { useState } from 'react'
import api from '../services/api.js'
import PaymentModal from './PaymentModal.jsx'

const STARS = [1, 2, 3, 4, 5]

export default function RateDriverModal({ rideInfo, fare, onDone }) {
  const [rating, setRating]       = useState(5)
  const [hover, setHover]         = useState(0)
  const [tip, setTip]             = useState(0)
  const [customTip, setCustomTip] = useState('')
  const [showPayment, setShowPayment] = useState(false)
  const [submitting, setSubmitting]   = useState(false)
  const [done, setDone]           = useState(false)

  const tipAmount = customTip ? parseFloat(customTip) || 0 : tip

  const LABELS = { 1: 'Terrible', 2: 'Bad', 3: 'Okay', 4: 'Good', 5: 'Excellent!' }
  const TIPS   = [10, 20, 50]

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      if (rideInfo?.rideId) {
        await api.post('/payment/rate', { rideId: rideInfo.rideId, rating })
      }
      if (tipAmount > 0) {
        setShowPayment(true)
      } else {
        setDone(true)
        setTimeout(() => onDone?.(), 1500)
      }
    } catch {
      setDone(true)
      setTimeout(() => onDone?.(), 1500)
    } finally {
      setSubmitting(false)
    }
  }

  if (showPayment) {
    return (
      <PaymentModal
        rideInfo={rideInfo}
        fare={fare}
        onSuccess={onDone}
        onClose={onDone}
      />
    )
  }

  if (done) {
    return (
      <div style={S.overlay}>
        <div style={S.modal}>
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={S.doneIcon}>🎉</div>
            <h2 style={{ color: '#FFD700', marginTop: 12 }}>Thanks for the feedback!</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Your rating helps improve driver quality</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={S.overlay}>
      <div style={S.modal}>

        {/* Driver info */}
        <div style={S.driverRow}>
          <div style={S.driverAvatar}>
            {rideInfo?.driverName?.[0] || '🧑'}
          </div>
          <div>
            <div style={S.driverName}>{rideInfo?.driverName || 'Your Driver'}</div>
            <div style={S.driverMeta}>{rideInfo?.vehicleNumber || ''}</div>
          </div>
          <button style={S.skipBtn} onClick={onDone}>Skip</button>
        </div>

        {/* Stars */}
        <div style={S.starsSection}>
          <div style={S.rateLabel}>How was your ride?</div>
          <div style={S.stars}>
            {STARS.map(s => (
              <span
                key={s}
                style={{ ...S.star, color: s <= (hover || rating) ? '#FFD700' : 'rgba(255,255,255,0.15)' }}
                onClick={() => setRating(s)}
                onMouseEnter={() => setHover(s)}
                onMouseLeave={() => setHover(0)}
              >★</span>
            ))}
          </div>
          <div style={S.ratingLabel}>{LABELS[hover || rating]}</div>
        </div>

        {/* Tip section */}
        <div style={S.tipSection}>
          <div style={S.tipHeader}>
            <span>🎁 Add a tip</span>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Optional</span>
          </div>
          <div style={S.tipRow}>
            <button style={{ ...S.tipBtn, ...(tip === 0 && !customTip ? S.tipActive : {}) }}
              onClick={() => { setTip(0); setCustomTip('') }}>No tip</button>
            {TIPS.map(t => (
              <button
                key={t}
                style={{ ...S.tipBtn, ...(tip === t && !customTip ? S.tipActive : {}) }}
                onClick={() => { setTip(t); setCustomTip('') }}
              >₹{t}</button>
            ))}
            <input
              style={S.tipInput}
              placeholder="₹ Custom"
              value={customTip}
              type="number" min="0"
              onChange={e => { setCustomTip(e.target.value); setTip(0) }}
            />
          </div>
          {tipAmount > 0 && (
            <p style={{ fontSize: 12, color: '#FFD700', marginTop: 6 }}>
              ₹{tipAmount} tip will be added to payment
            </p>
          )}
        </div>

        {/* Submit */}
        <button style={S.submitBtn} onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Submitting…' : tipAmount > 0 ? `Submit & Pay ₹${fare + tipAmount}` : 'Submit Rating'}
        </button>
      </div>
    </div>
  )
}

const S = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    zIndex: 9999, backdropFilter: 'blur(4px)',
  },
  modal: {
    width: '100%', maxWidth: 480,
    background: '#111', borderRadius: '24px 24px 0 0',
    padding: '24px 20px 36px',
    border: '1px solid rgba(255,255,255,0.08)',
    animation: 'fadeSlideUp 0.3s ease',
  },
  driverRow: { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 },
  driverAvatar: {
    width: 50, height: 50, background: 'rgba(255,215,0,0.1)',
    border: '2px solid rgba(255,215,0,0.3)', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 22, fontWeight: 700, color: '#FFD700',
  },
  driverName: { fontSize: 16, fontWeight: 700, color: 'white', marginBottom: 2 },
  driverMeta: { fontSize: 12, color: 'rgba(255,255,255,0.5)', letterSpacing: 1 },
  skipBtn: {
    marginLeft: 'auto', background: 'none', border: '1px solid rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.4)', borderRadius: 8, padding: '6px 14px',
    cursor: 'pointer', fontSize: 13,
  },
  starsSection: { textAlign: 'center', marginBottom: 20 },
  rateLabel: { fontSize: 16, fontWeight: 600, color: 'white', marginBottom: 12 },
  stars: { display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 8 },
  star: { fontSize: 44, cursor: 'pointer', transition: 'transform 0.1s', userSelect: 'none' },
  ratingLabel: { fontSize: 14, color: 'rgba(255,215,0,0.8)', fontWeight: 600, height: 20 },
  tipSection: { marginBottom: 20 },
  tipHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  tipRow: { display: 'flex', gap: 8 },
  tipBtn: {
    flex: 1, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.7)', borderRadius: 8, padding: '9px 6px',
    cursor: 'pointer', fontSize: 12, fontWeight: 600,
  },
  tipActive: { background: 'rgba(255,215,0,0.15)', border: '1px solid #FFD700', color: '#FFD700' },
  tipInput: {
    flex: 1, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8, padding: '8px 8px', color: 'white', fontSize: 12, minWidth: 0,
  },
  submitBtn: {
    width: '100%', background: 'linear-gradient(135deg, #FFD700, #FFA000)',
    color: '#111', border: 'none', borderRadius: 14, padding: '14px',
    fontSize: 16, fontWeight: 800, cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(255,215,0,0.3)',
  },
  doneIcon: { fontSize: 60 },
}
