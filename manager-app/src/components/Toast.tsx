import { useEffect, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, CheckCircle, Info } from '../icons'

export type ToastKind = 'error' | 'success' | 'info'

type ToastItem = {
  id: number
  message: string
  kind: ToastKind
  visible: boolean
}

type Listener = (item: Omit<ToastItem, 'visible'>) => void

const listeners = new Set<Listener>()
let seq = 0

/** Agent APK snackbar uslubidagi ogohlantirish */
export function showToast(message: string, kind: ToastKind = 'error') {
  const text = message.trim()
  if (!text) return
  seq += 1
  const item = { id: seq, message: text, kind }
  listeners.forEach(fn => fn(item))
}

const ENTER_MS = 280
const HOLD_MS = 2600
const EXIT_MS = 320

const KIND_STYLE: Record<ToastKind, { bg: string; border: string; iconBg: string; color: string }> = {
  error: {
    bg: 'rgba(28, 25, 35, 0.94)',
    border: 'rgba(244, 67, 54, 0.35)',
    iconBg: 'rgba(244, 67, 54, 0.18)',
    color: '#FFCDD2',
  },
  success: {
    bg: 'rgba(28, 25, 35, 0.94)',
    border: 'rgba(0, 200, 83, 0.35)',
    iconBg: 'rgba(0, 200, 83, 0.18)',
    color: '#C8E6C9',
  },
  info: {
    bg: 'rgba(28, 25, 35, 0.94)',
    border: 'rgba(37, 99, 235, 0.40)',
    iconBg: 'rgba(37, 99, 235, 0.20)',
    color: '#BFDBFE',
  },
}

function ToastCard({ item }: { item: ToastItem }) {
  const s = KIND_STYLE[item.kind]
  const Icon = item.kind === 'success' ? CheckCircle : item.kind === 'info' ? Info : AlertCircle

  const shell: CSSProperties = {
    width: '100%',
    maxWidth: 420,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 14px',
    borderRadius: 14,
    background: s.bg,
    border: `1px solid ${s.border}`,
    boxShadow: '0 10px 28px rgba(0,0,0,0.28)',
    color: s.color,
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    transform: item.visible ? 'translateY(0)' : 'translateY(-18px)',
    opacity: item.visible ? 1 : 0,
    transition: `transform ${item.visible ? ENTER_MS : EXIT_MS}ms ease, opacity ${item.visible ? ENTER_MS : EXIT_MS}ms ease`,
  }

  return (
    <div style={shell} role="status">
      <div style={{
        width: 34, height: 34, borderRadius: 10, flexShrink: 0,
        background: s.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={18} color={s.color} />
      </div>
      <p style={{
        margin: 0, flex: 1, minWidth: 0,
        fontSize: 14, fontWeight: 600, lineHeight: 1.35,
        letterSpacing: 0.2,
      }}>
        {item.message}
      </p>
    </div>
  )
}

/** Global toast host — App.tsx ichida bir marta joylashtiring */
export function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([])

  useEffect(() => {
    const onPush: Listener = (item) => {
      setItems(prev => [...prev, { ...item, visible: true }].slice(-3))
      window.setTimeout(() => {
        setItems(prev => prev.map(t => t.id === item.id ? { ...t, visible: false } : t))
      }, HOLD_MS)
      window.setTimeout(() => {
        setItems(prev => prev.filter(t => t.id !== item.id))
      }, HOLD_MS + EXIT_MS + 40)
    }
    listeners.add(onPush)
    return () => { listeners.delete(onPush) }
  }, [])

  if (typeof document === 'undefined' || items.length === 0) return null

  return createPortal(
    <div
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        top: 0,
        zIndex: 9999,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        padding: 'calc(12px + var(--safe-top, env(safe-area-inset-top, 0px))) 16px 0',
      }}
    >
      {items.map(item => (
        <ToastCard key={item.id} item={item} />
      ))}
    </div>,
    document.body,
  )
}
