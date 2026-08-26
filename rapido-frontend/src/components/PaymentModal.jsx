import { useState } from 'react'
import api, { getUser } from '../services/api.js'

const TIPS = [10, 20, 50, 100]

async function loadRazorpay() {
  return new Promise(resolve => {
    if (window.Razorpay) return resolve(true)
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload  = () => resolve(true)
    s.onerror = () => resolve(false)
    document.body.appendChild(s)
  })
}

export default function PaymentModal({ rideInfo, fare, onSuccess, onClose }) {
  const user = getUser()
  const [tab, setTab]           = useState('UPI')   // UPI | CARD | WALLET
  const [tip, setTip]           = useState(0)
  const [customTip, setCustomTip] = useState('')
  const [loading, setLoading]   = useState(false)
  const [status, setStatus]     = useState(null)    // null | 'success' | 'fail'
  const [paymentId, setPaymentId] = useState('')

  const tipAmount = customTip ? parseFloat(customTip) || 0 : tip
  const totalPaise = Math.round((fare + tipAmount) * 100)

  const handlePay = async () => {
    setLoading(true)
    try {
      // 1. Create order on backend
      const { data: order } = await api.post('/payment/create-order', {
        amount: totalPaise,
        rideId: rideInfo?.rideId,
        type: 'RIDE',
      })

      if (order.mock) {
        // Dev/test mode — simulate payment success
        await simulateMockPayment(order)
        return
      }

      // 2. Open Razorpay checkout
      const ok = await loadRazorpay()
      if (!ok) { alert('Failed to load Razorpay. Check internet connection.'); setLoading(false); return }

      const options = {
        key:         order.key,
        amount:      order.amount,
        currency:    'INR',
        name:        'CABkaro',
        description: `Ride Payment${tipAmount > 0 ? ` + ₹${tipAmount} tip` : ''}`,
        order_id:    order.orderId,
        prefill: {
          contact: user?.phoneNumber || '',
          email:   user?.email || '',
          name:    user?.name  || '',
        },
        theme: { color: '#FFD700' },
        modal: { ondismiss: () => setLoading(false) },
        handler: async (resp) => {
          // 3. Verify on backend
          await verifyAndFinish(resp.razorpay_payment_id, resp.razorpay_order_id, resp.razorpay_signature, order.rideId)
        },
      }
      new window.Razorpay(options).open()

    } catch (e) {
      setStatus('fail')
      setLoading(false)
    }
  }

  const simulateMockPayment = async (order) => {
    // Simulated 1-second delay
    await new Promise(r => setTimeout(r, 1200))
    try {
      await api.post('/payment/verify', {
        razorpayPaymentId: 'mock_pay_' + Date.now(),
        razorpayOrderId:   order.orderId,
        razorpaySignature: 'mock_sig',
        rideId:  order.rideId,
        tipAmount: tipAmount,
      })
      setPaymentId('MOCK_' + Date.now())
      setStatus('success')
      setLoading(false)
      setTimeout(() => onSuccess?.(), 2000)
    } catch {
      setStatus('fail')
      setLoading(false)
    }
  }

  const verifyAndFinish = async (pid, oid, sig, rideId) => {
    try {
      await api.post('/payment/verify', {
        razorpayPaymentId: pid,
        razorpayOrderId:   oid,
        razorpaySignature: sig,
        rideId,
        tipAmount: tipAmount,
      })
      setPaymentId(pid)
      setStatus('success')
      setLoading(false)
      setTimeout(() => onSuccess?.(), 2000)
    } catch {
      setStatus('fail')
      setLoading(false)
    }
  }

  return (
    <div style={S.overlay}>
      <div style={S.modal}>

        {/* Success screen */}
        {status === 'success' && (
          <div style={S.successScreen}>
            <div style={S.successCircle}>✓</div>
            <h2 style={{ color: '#4CAF50', margin: '16px 0 8px', fontSize: 22 }}>Payment Successful!</h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>₹{fare + tipAmount} paid{tipAmount > 0 ? ` (incl. ₹${tipAmount} tip)` : ''}</p>
            {paymentId && <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 8 }}>ID: {paymentId}</p>}
          </div>
        )}

        {/* Fail screen */}
        {status === 'fail' && (
          <div style={S.successScreen}>
            <div style={{ ...S.successCircle, background: 'rgba(255,82,82,0.15)', color: '#FF5252', border: '2px solid #FF5252' }}>✕</div>
            <h2 style={{ color: '#FF5252', margin: '16px 0 8px' }}>Payment Failed</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Please try again or use a different method</p>
            <button style={S.retryBtn} onClick={() => setStatus(null)}>Retry</button>
          </div>
        )}

        {/* Main payment UI */}
        {!status && (
          <>
            <div style={S.header}>
              <div style={S.headerLeft}>
                <div style={S.modalTitle}>💳 Payment</div>
                <div style={S.fareDisplay}>₹{fare + tipAmount}</div>
              </div>
              <button style={S.closeBtn} onClick={onClose}>✕</button>
            </div>

            {/* Ride summary */}
            <div style={S.rideSummary}>
              <div style={S.summaryRow}>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>Ride fare</span>
                <span>₹{fare}</span>
              </div>
              {tipAmount > 0 && (
                <div style={S.summaryRow}>
                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>Tip</span>
                  <span style={{ color: '#FFD700' }}>+₹{tipAmount}</span>
                </div>
              )}
              <div style={{ ...S.summaryRow, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 8, marginTop: 4 }}>
                <span style={{ fontWeight: 700 }}>Total</span>
                <span style={{ fontWeight: 800, color: '#FFD700', fontSize: 18 }}>₹{fare + tipAmount}</span>
              </div>
            </div>

            {/* Tip section */}
            <div style={S.tipSection}>
              <div style={S.tipLabel}>🎁 Add a tip for your driver</div>
              <div style={S.tipRow}>
                {TIPS.map(t => (
                  <button
                    key={t}
                    style={{ ...S.tipBtn, ...(tip === t && !customTip ? S.tipBtnActive : {}) }}
                    onClick={() => { setTip(t); setCustomTip('') }}
                  >₹{t}</button>
                ))}
                <input
                  style={S.tipInput}
                  placeholder="Custom"
                  value={customTip}
                  type="number"
                  min="0"
                  onChange={e => { setCustomTip(e.target.value); setTip(0) }}
                />
              </div>
            </div>

            {/* Payment method tabs */}
            <div style={S.tabs}>
              {['UPI', 'CARD', 'WALLET'].map(t => (
                <button
                  key={t}
                  style={{ ...S.tab, ...(tab === t ? S.tabActive : {}) }}
                  onClick={() => setTab(t)}
                >{t}</button>
              ))}
            </div>

            {/* Tab content */}
            <div style={S.tabContent}>
              {tab === 'UPI' && (
                <div style={{ textAlign: 'center' }}>
                  <div style={S.methodIcon}>📱</div>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 4 }}>
                    Pay via UPI (Google Pay, PhonePe, Paytm…)
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>
                    Payout to: 7974843494@upi
                  </p>
                </div>
              )}
              {tab === 'CARD' && (
                <div style={{ textAlign: 'center' }}>
                  <div style={S.methodIcon}>💳</div>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
                    Pay via Debit or Credit Card
                  </p>
                </div>
              )}
              {tab === 'WALLET' && (
                <div style={{ textAlign: 'center' }}>
                  <div style={S.methodIcon}>👛</div>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
                    Pay via Mobikwik, Freecharge, Paytm Wallet
                  </p>
                </div>
              )}
            </div>

            <button style={S.payBtn} onClick={handlePay} disabled={loading}>
              {loading ? (
                <span>Processing… <span className="spin" style={{ display: 'inline-block' }}>⏳</span></span>
              ) : (
                `Pay ₹${fare + tipAmount} via ${tab}`
              )}
            </button>

            <p style={S.secureLine}>🔒 Secured by Razorpay · Payments go to 7974843494</p>
          </>
        )}
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
    padding: '24px 20px 32px',
    border: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
    animation: 'fadeSlideUp 0.3s ease',
    maxHeight: '90vh', overflowY: 'auto',
  },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 },
  headerLeft: {},
  modalTitle: { fontSize: 18, fontWeight: 700, color: 'white', marginBottom: 4 },
  fareDisplay: { fontSize: 28, fontWeight: 800, color: '#FFD700' },
  closeBtn: {
    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.6)', borderRadius: '50%', width: 32, height: 32,
    cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  rideSummary: {
    background: 'rgba(255,255,255,0.04)', borderRadius: 12,
    padding: '12px 14px', marginBottom: 16,
  },
  summaryRow: { display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '4px 0' },
  tipSection: { marginBottom: 16 },
  tipLabel: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 8, fontWeight: 600 },
  tipRow: { display: 'flex', gap: 8, alignItems: 'center' },
  tipBtn: {
    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
    color: 'white', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
  },
  tipBtnActive: {
    background: 'rgba(255,215,0,0.15)', border: '1px solid #FFD700', color: '#FFD700',
  },
  tipInput: {
    flex: 1, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8, padding: '8px 10px', color: 'white', fontSize: 13, minWidth: 0,
  },
  tabs: { display: 'flex', gap: 4, marginBottom: 16, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 4 },
  tab: {
    flex: 1, background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)',
    borderRadius: 8, padding: '8px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
  },
  tabActive: { background: 'rgba(255,215,0,0.15)', color: '#FFD700' },
  tabContent: { marginBottom: 20, padding: '8px 0' },
  methodIcon: { fontSize: 36, marginBottom: 8 },
  payBtn: {
    width: '100%', background: 'linear-gradient(135deg, #FFD700, #FFA000)',
    color: '#111', border: 'none', borderRadius: 14, padding: '15px',
    fontSize: 16, fontWeight: 800, cursor: 'pointer', marginBottom: 12,
    boxShadow: '0 4px 20px rgba(255,215,0,0.3)',
  },
  secureLine: { textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.3)' },
  successScreen: { textAlign: 'center', padding: '20px 0 10px' },
  successCircle: {
    width: 72, height: 72, borderRadius: '50%',
    background: 'rgba(76,175,80,0.15)', border: '2px solid #4CAF50',
    color: '#4CAF50', fontSize: 30, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto',
  },
  retryBtn: {
    marginTop: 16, background: 'rgba(255,82,82,0.1)', border: '1px solid #FF5252',
    color: '#FF5252', borderRadius: 10, padding: '10px 24px', cursor: 'pointer', fontWeight: 600,
  },
}
