import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api.js'

const SUPPORT_PHONE = '7974843494'
const QUICK_REPLIES = [
  'Track my ride',
  'Billing issue',
  'Driver complaint',
  'Cancel ride',
  'Lost item',
]

export default function SupportChatPage() {
  const navigate = useNavigate()
  const [sessionId, setSessionId]   = useState(null)
  const [messages, setMessages]     = useState([])
  const [input, setInput]           = useState('')
  const [sending, setSending]       = useState(false)
  const [online, setOnline]         = useState(true)
  const messagesEndRef = useRef(null)
  const pollRef        = useRef(null)

  // Create session on mount
  useEffect(() => {
    api.post('/chat/session')
      .then(r => {
        setSessionId(r.data.sessionId)
      })
      .catch(() => {
        // Offline fallback message
        setMessages([{
          id: 1, sender: 'SUPPORT', sentAt: new Date().toISOString(),
          message: `👋 Hello! Welcome to CABkaro support. How can I help you? For urgent help call ${SUPPORT_PHONE}`,
        }])
        setOnline(false)
      })
  }, [])

  // Load messages and start polling once session is ready
  useEffect(() => {
    if (!sessionId) return
    loadMessages()
    pollRef.current = setInterval(loadMessages, 3000)
    return () => clearInterval(pollRef.current)
  }, [sessionId])

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadMessages = async () => {
    if (!sessionId) return
    try {
      const r = await api.get(`/chat/messages/${sessionId}`)
      setMessages(r.data)
    } catch {}
  }

  const sendMessage = async (text) => {
    const msg = text || input.trim()
    if (!msg) return
    setInput('')
    setSending(true)

    // Optimistic update
    const temp = {
      id: Date.now(), sender: 'USER', sentAt: new Date().toISOString(), message: msg,
    }
    setMessages(prev => [...prev, temp])

    try {
      if (sessionId) {
        await api.post('/chat/send', { sessionId, message: msg, sender: 'USER' })
        // Poll immediately to get bot reply
        setTimeout(loadMessages, 1200)
      }
    } catch {}
    setSending(false)
  }

  const formatTime = (iso) => {
    if (!iso) return ''
    const d = new Date(iso)
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div style={S.page}>

      {/* ── Header ── */}
      <div style={S.header}>
        <button style={S.backBtn} onClick={() => navigate(-1)}>‹</button>
        <div style={S.agentAvatar}>🛟</div>
        <div style={S.agentInfo}>
          <div style={S.agentName}>CABkaro Support</div>
          <div style={S.agentStatus}>
            <span style={{ ...S.statusDot, background: online ? '#4CAF50' : '#FF9800' }} />
            {online ? 'Online · Usually replies in 5 min' : 'Bot mode'}
          </div>
        </div>
        <a href={`tel:${SUPPORT_PHONE}`} style={S.callLink}>📞</a>
      </div>

      {/* ── Phone number banner ── */}
      <div style={S.phoneBanner}>
        📞 For urgent help call us:{' '}
        <a href={`tel:${SUPPORT_PHONE}`} style={S.phoneLink}>{SUPPORT_PHONE}</a>
      </div>

      {/* ── Messages ── */}
      <div style={S.messages}>

        {messages.length === 0 && (
          <div style={S.emptyMsg}>
            Send a message to start chatting with our support team
          </div>
        )}

        {messages.map((msg, i) => {
          const isUser = msg.sender === 'USER'
          return (
            <div key={msg.id || i} style={{ ...S.msgRow, justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
              {!isUser && <div style={S.supportAvatar}>🛟</div>}
              <div style={{ maxWidth: '75%' }}>
                <div style={{ ...S.bubble, ...(isUser ? S.userBubble : S.supportBubble) }}>
                  {msg.message}
                </div>
                <div style={{ ...S.msgTime, textAlign: isUser ? 'right' : 'left' }}>
                  {formatTime(msg.sentAt)}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Quick replies ── */}
      <div style={S.quickReplies}>
        {QUICK_REPLIES.map(q => (
          <button key={q} style={S.quickChip} onClick={() => sendMessage(q)}>
            {q}
          </button>
        ))}
      </div>

      {/* ── Input ── */}
      <div style={S.inputBar}>
        <input
          style={S.textInput}
          placeholder="Type a message…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
        />
        <button
          style={{ ...S.sendBtn, opacity: (sending || !input.trim()) ? 0.5 : 1 }}
          onClick={() => sendMessage()}
          disabled={sending || !input.trim()}
        >
          ➤
        </button>
      </div>
    </div>
  )
}

const S = {
  page: {
    display: 'flex', flexDirection: 'column', height: '100vh',
    background: '#0a0a0a', color: 'white',
  },
  header: {
    display: 'flex', alignItems: 'center', gap: 12,
    background: '#111', borderBottom: '1px solid rgba(255,255,255,0.07)',
    padding: '12px 16px', paddingTop: 70, flexShrink: 0,
  },
  backBtn: {
    background: 'none', border: 'none', color: 'white',
    fontSize: 26, cursor: 'pointer', padding: 0, lineHeight: 1,
  },
  agentAvatar: {
    width: 40, height: 40, background: 'rgba(255,215,0,0.1)',
    border: '2px solid rgba(255,215,0,0.3)', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
  },
  agentInfo: { flex: 1 },
  agentName: { fontSize: 15, fontWeight: 700 },
  agentStatus: { fontSize: 11, color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: 4 },
  statusDot: { width: 7, height: 7, borderRadius: '50%', display: 'inline-block' },
  callLink: {
    fontSize: 22, textDecoration: 'none',
    background: 'rgba(76,175,80,0.15)', border: '1px solid rgba(76,175,80,0.3)',
    borderRadius: 10, padding: '6px 12px',
  },
  phoneBanner: {
    background: 'rgba(255,215,0,0.06)', borderBottom: '1px solid rgba(255,215,0,0.1)',
    padding: '8px 16px', fontSize: 12, color: 'rgba(255,255,255,0.6)', flexShrink: 0,
  },
  phoneLink: { color: '#FFD700', fontWeight: 700, textDecoration: 'none' },
  messages: {
    flex: 1, overflowY: 'auto', padding: '16px',
    display: 'flex', flexDirection: 'column', gap: 10,
  },
  emptyMsg: {
    textAlign: 'center', color: 'rgba(255,255,255,0.3)',
    fontSize: 13, marginTop: 40,
  },
  msgRow: { display: 'flex', alignItems: 'flex-end', gap: 8 },
  supportAvatar: {
    width: 28, height: 28, background: 'rgba(255,215,0,0.1)',
    borderRadius: '50%', display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontSize: 14, flexShrink: 0,
  },
  bubble: {
    padding: '10px 14px', borderRadius: 16, fontSize: 14, lineHeight: 1.5,
  },
  userBubble: {
    background: 'linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,160,0,0.15))',
    border: '1px solid rgba(255,215,0,0.25)', borderBottomRightRadius: 4,
    color: 'white',
  },
  supportBubble: {
    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)',
    borderBottomLeftRadius: 4, color: 'rgba(255,255,255,0.9)',
  },
  msgTime: { fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 3, padding: '0 4px' },
  quickReplies: {
    display: 'flex', gap: 8, padding: '8px 16px',
    overflowX: 'auto', flexShrink: 0,
    borderTop: '1px solid rgba(255,255,255,0.06)',
    scrollbarWidth: 'none',
  },
  quickChip: {
    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.8)', borderRadius: 20, padding: '7px 14px',
    cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap', fontWeight: 500,
  },
  inputBar: {
    display: 'flex', gap: 10, padding: '12px 16px 20px',
    background: '#111', borderTop: '1px solid rgba(255,255,255,0.07)', flexShrink: 0,
  },
  textInput: {
    flex: 1, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 24, padding: '12px 16px', color: 'white', fontSize: 14,
  },
  sendBtn: {
    background: 'linear-gradient(135deg, #FFD700, #FFA000)',
    color: '#111', border: 'none', borderRadius: '50%',
    width: 44, height: 44, cursor: 'pointer', fontSize: 18, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
}
