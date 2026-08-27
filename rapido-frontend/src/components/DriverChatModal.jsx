import { useState, useEffect, useRef, useCallback } from 'react'
import api from '../services/api.js'

const QUICK_MSGS = [
  '📍 Where are you?',
  'Main aa gaya pickup pe',
  'Please jaldi aao',
  'Aapko dekh pa raha hoon',
  'Please call karo',
  'Kitni der lagegi?',
  'OK, wait kar raha hoon',
]

export default function DriverChatModal({ rideInfo, driverFound, onClose }) {
  const rideId      = rideInfo?.rideId
  const driverName  = driverFound?.name  || rideInfo?.driverName  || 'Driver'
  const driverPhone = driverFound?.phone || rideInfo?.driverPhone || rideInfo?.driverMobileNumber || ''
  const pickupAddr  = rideInfo?.pickupAddress || rideInfo?.pickup?.address || ''

  // ── Single source of truth: messages come ONLY from backend poll ─────────
  const [messages, setMessages]   = useState([])
  const [input, setInput]         = useState('')
  const [sending, setSending]     = useState(false)
  const [aiTyping, setAiTyping]   = useState(false)

  const bottomRef    = useRef(null)
  const pollRef      = useRef(null)
  const debounceRef  = useRef(null)  // for send debounce
  const initialized  = useRef(false)

  const fmt = (iso) => {
    if (!iso) return ''
    return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  }

  /* ── Load messages — REPLACE state entirely from backend ─────────────── */
  const loadMessages = useCallback(async () => {
    if (!rideId) return
    try {
      const r = await api.get(`/chat/driver/${rideId}`)
      if (Array.isArray(r.data)) {
        setMessages(r.data)
      }
    } catch { /* silent poll failure */ }
  }, [rideId])

  /* ── Init: inject welcome locally ONCE, then start polling ───────────── */
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    // Set a local-only welcome message before first poll
    setMessages([{
      id: '__welcome__',
      sender: 'DRIVER',
      message: `👋 Namaskar! Main ${driverName} hoon, aapka driver. Bas pahunch raha hoon!`,
      sentAt: new Date().toISOString(),
    }])

    // First fetch — if backend has messages they replace the welcome
    loadMessages()

    // Poll every 4 seconds
    pollRef.current = setInterval(loadMessages, 4000)
    return () => clearInterval(pollRef.current)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Auto-scroll ─────────────────────────────────────────────────────── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, aiTyping])

  /* ── Send — debounced to prevent double-tap submissions ─────────────── */
  const sendMessage = useCallback((text) => {
    const msg = (text || input).trim()
    if (!msg || sending) return

    // Debounce: ignore if called again within 800ms
    if (debounceRef.current) return
    debounceRef.current = setTimeout(() => { debounceRef.current = null }, 800)

    setInput('')
    setSending(true)

    api.post('/chat/driver-message', { rideId, message: msg, sender: 'USER', driverName, pickupAddress: pickupAddr })
      .then(() => {
        // Show typing indicator while AI generates reply
        setAiTyping(true)
        setTimeout(() => {
          setAiTyping(false)
          // Fetch fresh messages from backend — the AI reply will be there
          loadMessages()
        }, 2600)
      })
      .catch(() => {
        // On failure just show an error in chat without touching real messages
        setMessages(prev => [...prev, {
          id: `__err_${Date.now()}__`,
          sender: 'SYSTEM',
          message: '⚠️ Message not sent. Check your connection.',
          sentAt: new Date().toISOString(),
        }])
      })
      .finally(() => setSending(false))
  }, [input, sending, rideId, loadMessages])

  return (
    <div style={S.backdrop} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={S.sheet}>

        {/* ── Header ── */}
        <div style={S.header}>
          <div style={S.driverAva}><span style={{ fontSize: 20 }}>🧑‍✈️</span></div>
          <div style={S.headerInfo}>
            <div style={S.driverName}>{driverName}</div>
            <div style={S.subLine}>
              <span style={S.greenDot} />
              {aiTyping
                ? <em>typing…</em>
                : `En-route · ${driverFound?.vehicle || rideInfo?.vehicleNumber || ''}`}
            </div>
          </div>
          {driverPhone && (
            <a href={`tel:${driverPhone}`} style={S.callBtn} title={`Call ${driverPhone}`}>📞</a>
          )}
          <button style={S.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* ── Messages ── */}
        <div style={S.messages}>
          {messages.map((m, i) => {
            const isUser   = m.sender === 'USER'
            const isSystem = m.sender === 'SYSTEM'
            if (isSystem) return (
              <div key={m.id ?? i} style={S.systemMsg}>{m.message}</div>
            )
            return (
              <div key={m.id ?? i} style={{ ...S.row, justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
                {!isUser && <div style={S.ava}><span style={{ fontSize: 13 }}>🧑‍✈️</span></div>}
                <div style={{ maxWidth: '72%' }}>
                  <div style={{ ...S.bubble, ...(isUser ? S.userBubble : S.driverBubble) }}>
                    {m.message}
                  </div>
                  <div style={{ ...S.time, textAlign: isUser ? 'right' : 'left' }}>
                    {fmt(m.sentAt)}
                  </div>
                </div>
              </div>
            )
          })}

          {/* Typing dots */}
          {aiTyping && (
            <div style={{ ...S.row, justifyContent: 'flex-start' }}>
              <div style={S.ava}><span style={{ fontSize: 13 }}>🧑‍✈️</span></div>
              <div style={{ ...S.bubble, ...S.driverBubble, padding: '12px 16px', display: 'flex', gap: 4 }}>
                <span style={S.dot} />
                <span style={{ ...S.dot, animationDelay: '0.2s' }} />
                <span style={{ ...S.dot, animationDelay: '0.4s' }} />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* ── Quick replies ── */}
        <div style={S.quickRow}>
          {QUICK_MSGS.map(q => (
            <button key={q} style={S.chip} onClick={() => sendMessage(q)} disabled={sending}>{q}</button>
          ))}
        </div>

        {/* ── Input ── */}
        <div style={S.inputBar}>
          <input
            style={S.input}
            placeholder="Message driver…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          />
          <button
            style={{ ...S.sendBtn, opacity: (sending || !input.trim()) ? 0.5 : 1 }}
            onClick={() => sendMessage()}
            disabled={sending || !input.trim()}
          >➤</button>
        </div>
      </div>
    </div>
  )
}

const S = {
  backdrop: {
    position: 'fixed', inset: 0, zIndex: 9999,
    background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
  },
  sheet: {
    width: '100%', maxWidth: 480,
    background: '#FFFFFF', borderRadius: '20px 20px 0 0',
    display: 'flex', flexDirection: 'column',
    maxHeight: '80vh',
    boxShadow: '0 -8px 40px rgba(0,0,0,0.15)',
    border: '1px solid #E2E8F0',
    animation: 'fadeSlideUp 0.25s ease',
  },
  header: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '14px 16px', borderBottom: '1px solid #E2E8F0', flexShrink: 0,
  },
  driverAva: {
    width: 42, height: 42, borderRadius: '50%',
    background: '#FEF3C7', border: '2px solid #FCD34D',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  headerInfo: { flex: 1 },
  driverName: { fontSize: 15, fontWeight: 700, color: '#1A202C' },
  subLine: {
    fontSize: 11, color: '#718096',
    display: 'flex', alignItems: 'center', gap: 4, marginTop: 2,
  },
  greenDot: {
    width: 7, height: 7, borderRadius: '50%',
    background: '#059669', display: 'inline-block', flexShrink: 0,
  },
  callBtn: {
    fontSize: 20, textDecoration: 'none',
    background: '#D1FAE5', border: '1px solid #A7F3D0',
    borderRadius: 10, padding: '6px 10px', color: '#065F46', flexShrink: 0,
  },
  closeBtn: {
    background: '#F5F7FA', border: '1px solid #E2E8F0',
    color: '#718096', borderRadius: '50%',
    width: 32, height: 32, cursor: 'pointer', fontSize: 14,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  messages: {
    flex: 1, overflowY: 'auto', padding: '14px 14px 6px',
    display: 'flex', flexDirection: 'column', gap: 8,
    background: '#F8FAFC',
  },
  row: { display: 'flex', alignItems: 'flex-end', gap: 7 },
  ava: {
    width: 26, height: 26, borderRadius: '50%',
    background: '#FEF3C7', border: '1px solid #FCD34D',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  bubble: { padding: '9px 13px', borderRadius: 16, fontSize: 13, lineHeight: 1.5 },
  userBubble: {
    background: 'linear-gradient(135deg,#FEF3C7,#FDE68A)',
    border: '1px solid #FCD34D', borderBottomRightRadius: 4, color: '#1A202C',
  },
  driverBubble: {
    background: '#FFFFFF', border: '1px solid #E2E8F0',
    borderBottomLeftRadius: 4, color: '#374151',
  },
  time: { fontSize: 10, color: '#9CA3AF', marginTop: 3, padding: '0 3px' },
  systemMsg: {
    textAlign: 'center', fontSize: 11, color: '#F59E0B',
    padding: '4px 10px', background: '#FFFBEB', borderRadius: 8,
    margin: '0 auto',
  },
  dot: {
    display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
    background: '#9CA3AF', animation: 'bounce 1.2s infinite',
  },
  quickRow: {
    display: 'flex', gap: 7, padding: '8px 14px',
    overflowX: 'auto', scrollbarWidth: 'none',
    background: '#FFFFFF', borderTop: '1px solid #E2E8F0', flexShrink: 0,
  },
  chip: {
    background: '#F5F7FA', border: '1px solid #E2E8F0',
    color: '#374151', borderRadius: 20, padding: '6px 12px',
    cursor: 'pointer', fontSize: 11, whiteSpace: 'nowrap', fontWeight: 500, flexShrink: 0,
  },
  inputBar: {
    display: 'flex', gap: 9, padding: '10px 14px 18px',
    background: '#FFFFFF', borderTop: '1px solid #F0F2F5', flexShrink: 0,
  },
  input: {
    flex: 1, background: '#F5F7FA', border: '1px solid #E2E8F0',
    borderRadius: 22, padding: '11px 15px', color: '#1A202C', fontSize: 13, outline: 'none',
  },
  sendBtn: {
    background: 'linear-gradient(135deg,#F59E0B,#D97706)',
    color: 'white', border: 'none', borderRadius: '50%',
    width: 42, height: 42, cursor: 'pointer', fontSize: 17, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
}
