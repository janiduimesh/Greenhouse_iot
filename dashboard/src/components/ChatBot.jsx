import { useState, useRef, useEffect } from 'react'

const API_BASE = 'http://localhost:8002/api/v1'

const BOT_AVATAR = '🌿'
const USER_AVATAR = '👤'

const SUGGESTIONS = [
  'What is the current temperature?',
  'Is the soil moisture okay?',
  'Any critical alerts today?',
  'What are the CO₂ thresholds?',
  'Is the pump running?',
]

function TypingDots() {
  return (
    <div style={styles.typingDots}>
      <span style={{ ...styles.dot, animationDelay: '0s' }} />
      <span style={{ ...styles.dot, animationDelay: '0.2s' }} />
      <span style={{ ...styles.dot, animationDelay: '0.4s' }} />
    </div>
  )
}

function Message({ msg }) {
  const isBot = msg.role === 'bot'
  return (
    <div style={{ ...styles.messageRow, justifyContent: isBot ? 'flex-start' : 'flex-end' }}>
      {isBot && <div style={styles.avatar}>{BOT_AVATAR}</div>}
      <div style={{
        ...styles.bubble,
        ...(isBot ? styles.botBubble : styles.userBubble),
      }}>
        {msg.loading ? <TypingDots /> : msg.text}
      </div>
      {!isBot && <div style={styles.avatar}>{USER_AVATAR}</div>}
    </div>
  )
}

export default function ChatBot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      id: 0,
      role: 'bot',
      text: "Hi! I'm your Greenhouse AI Assistant 🌱\nAsk me anything about current sensor readings, alerts, or thresholds!",
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [unread, setUnread] = useState(0)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) {
      setUnread(0)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const sendMessage = async (text) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const userMsg = { id: Date.now(), role: 'user', text: trimmed }
    const loadingMsg = { id: Date.now() + 1, role: 'bot', loading: true, text: '' }

    setMessages((prev) => [...prev, userMsg, loadingMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      })
      const data = await res.json()
      const reply = data.reply || 'Sorry, I could not get a response.'

      setMessages((prev) =>
        prev.map((m) => (m.loading ? { ...m, loading: false, text: reply } : m))
      )
      if (!open) setUnread((n) => n + 1)
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.loading
            ? { ...m, loading: false, text: '⚠️ Could not reach the server. Is the backend running?' }
            : m
        )
      )
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <>
      {/* Floating bubble button */}
      <button
        id="chatbot-toggle-btn"
        onClick={() => setOpen((o) => !o)}
        style={styles.fab}
        title="Greenhouse AI Assistant"
      >
        {open ? '✕' : '🌿'}
        {!open && unread > 0 && (
          <span style={styles.badge}>{unread}</span>
        )}
      </button>

      {/* Chat window */}
      {open && (
        <div style={styles.window} id="chatbot-window">
          {/* Header */}
          <div style={styles.header}>
            <div style={styles.headerLeft}>
              <span style={styles.headerIcon}>🌿</span>
              <div>
                <div style={styles.headerTitle}>Greenhouse Assistant</div>
                <div style={styles.headerSub}>Powered by Gemini AI</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={styles.closeBtn} id="chatbot-close-btn">✕</button>
          </div>

          {/* Messages */}
          <div style={styles.messages} id="chatbot-messages">
            {messages.map((msg) => (
              <Message key={msg.id} msg={msg} />
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Quick suggestions */}
          {messages.length <= 2 && (
            <div style={styles.suggestions}>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  style={styles.suggestionChip}
                  onClick={() => sendMessage(s)}
                  id={`suggestion-${s.replace(/\s+/g, '-').toLowerCase().slice(0, 30)}`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input bar */}
          <div style={styles.inputBar}>
            <textarea
              ref={inputRef}
              id="chatbot-input"
              style={styles.textarea}
              placeholder="Ask about temperature, alerts, soil..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={loading}
            />
            <button
              id="chatbot-send-btn"
              onClick={() => sendMessage(input)}
              style={{
                ...styles.sendBtn,
                ...(loading || !input.trim() ? styles.sendBtnDisabled : {}),
              }}
              disabled={loading || !input.trim()}
            >
              ➤
            </button>
          </div>
        </div>
      )}

      {/* Keyframe animations injected as a style tag */}
      <style>{`
        @keyframes dotBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes fabPulse {
          0%   { box-shadow: 0 0 0 0 rgba(74,222,128,0.5); }
          70%  { box-shadow: 0 0 0 12px rgba(74,222,128,0); }
          100% { box-shadow: 0 0 0 0 rgba(74,222,128,0); }
        }
        #chatbot-toggle-btn { animation: fabPulse 2.5s infinite; }
        #chatbot-window     { animation: fadeSlideUp 0.25s ease; }
      `}</style>
    </>
  )
}

// ── Inline styles (matches the dark slate theme of the dashboard) ─────────────
const styles = {
  fab: {
    position: 'fixed',
    bottom: '80px',        // sits above the bottom nav bar
    right: '20px',
    zIndex: 1000,
    width: '54px',
    height: '54px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #16a34a, #4ade80)',
    border: 'none',
    color: '#fff',
    fontSize: '22px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 16px rgba(74,222,128,0.4)',
    transition: 'transform 0.2s',
  },
  badge: {
    position: 'absolute',
    top: '-4px',
    right: '-4px',
    background: '#ef4444',
    color: '#fff',
    borderRadius: '50%',
    fontSize: '10px',
    fontWeight: 700,
    width: '18px',
    height: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  window: {
    position: 'fixed',
    bottom: '148px',
    right: '20px',
    zIndex: 999,
    width: '360px',
    maxHeight: '520px',
    borderRadius: '16px',
    background: '#1e293b',
    border: '1px solid rgba(148,163,184,0.15)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },
  header: {
    background: 'linear-gradient(135deg, #14532d, #166534)',
    padding: '12px 14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid rgba(74,222,128,0.2)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  headerIcon: {
    fontSize: '24px',
  },
  headerTitle: {
    color: '#dcfce7',
    fontWeight: 700,
    fontSize: '14px',
  },
  headerSub: {
    color: '#86efac',
    fontSize: '10px',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#86efac',
    fontSize: '16px',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '6px',
  },
  messages: {
    flex: 1,
    overflowY: 'auto',
    padding: '14px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    background: '#0f172a',
  },
  messageRow: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '8px',
  },
  avatar: {
    fontSize: '18px',
    flexShrink: 0,
  },
  bubble: {
    maxWidth: '78%',
    padding: '10px 13px',
    borderRadius: '14px',
    fontSize: '13px',
    lineHeight: '1.5',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  botBubble: {
    background: '#1e293b',
    color: '#e2e8f0',
    borderBottomLeftRadius: '4px',
    border: '1px solid rgba(148,163,184,0.15)',
  },
  userBubble: {
    background: 'linear-gradient(135deg, #166534, #16a34a)',
    color: '#fff',
    borderBottomRightRadius: '4px',
  },
  typingDots: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    height: '18px',
  },
  dot: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    background: '#4ade80',
    display: 'inline-block',
    animation: 'dotBounce 1.2s infinite',
  },
  suggestions: {
    padding: '8px 10px',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    borderTop: '1px solid rgba(148,163,184,0.1)',
    background: '#0f172a',
  },
  suggestionChip: {
    background: 'rgba(74,222,128,0.1)',
    border: '1px solid rgba(74,222,128,0.25)',
    color: '#4ade80',
    borderRadius: '20px',
    padding: '4px 10px',
    fontSize: '11px',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  inputBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 12px',
    borderTop: '1px solid rgba(148,163,184,0.12)',
    background: '#1e293b',
  },
  textarea: {
    flex: 1,
    resize: 'none',
    background: '#0f172a',
    border: '1px solid rgba(148,163,184,0.2)',
    borderRadius: '10px',
    color: '#e2e8f0',
    padding: '8px 12px',
    fontSize: '13px',
    outline: 'none',
    fontFamily: 'inherit',
    lineHeight: '1.4',
    maxHeight: '80px',
    overflowY: 'auto',
  },
  sendBtn: {
    background: 'linear-gradient(135deg, #16a34a, #4ade80)',
    border: 'none',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '16px',
    width: '38px',
    height: '38px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'opacity 0.2s',
  },
  sendBtnDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
}
