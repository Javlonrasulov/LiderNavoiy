import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { MessageSquare, X } from '../icons'
import { theme } from '../theme'

export type IncomingMessage = {
  id: string
  conversationId: string
  senderName: string
  preview: string
}

interface Props {
  dark: boolean
  message: IncomingMessage | null
  onOpen: (conversationId: string) => void
  onDismiss: () => void
}

const HOLD_MS = 4600

export default function IncomingMessageBanner({ dark, message, onOpen, onDismiss }: Props) {
  const c = theme(dark)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!message) {
      setVisible(false)
      return
    }
    const enter = window.setTimeout(() => setVisible(true), 20)
    const hide = window.setTimeout(() => setVisible(false), HOLD_MS)
    const clear = window.setTimeout(onDismiss, HOLD_MS + 300)
    return () => {
      window.clearTimeout(enter)
      window.clearTimeout(hide)
      window.clearTimeout(clear)
    }
  }, [message, onDismiss])

  if (!message) return null

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 'calc(var(--safe-top, 0px) + 8px)',
        left: 12,
        right: 12,
        zIndex: 3000,
        transform: visible ? 'translateY(0)' : 'translateY(-140%)',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.28s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.24s ease',
      }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => {
          setVisible(false)
          onOpen(message.conversationId)
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 14px',
          borderRadius: 18,
          background: c.card,
          border: `1px solid ${c.border}`,
          boxShadow: '0 12px 32px rgba(0,0,0,0.28)',
          cursor: 'pointer',
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 14,
            background: 'rgba(108,92,231,0.16)',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
          }}
        >
          <MessageSquare size={20} color={c.primary} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: c.text,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {message.senderName}
          </div>
          <div
            style={{
              fontSize: 13,
              color: c.mutedText,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {message.preview}
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setVisible(false)
            window.setTimeout(onDismiss, 260)
          }}
          style={{
            background: 'transparent',
            border: 'none',
            padding: 4,
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <X size={16} color={c.mutedText} />
        </button>
      </div>
    </div>,
    document.body,
  )
}
