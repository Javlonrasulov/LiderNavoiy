import { useCallback, useEffect, useState } from 'react'
import {
  ArrowLeft,
  Bell,
  CheckCheck,
  ClipboardList,
  MessageSquare,
  Package,
  Truck,
  Wallet,
} from '../icons'
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from '../api/notifications'
import type { Lang, Translations } from '../i18n'
import { theme } from '../theme'
import { showToast } from '../components/Toast'
import { pushBackHandler } from '../utils/hardwareBack'

interface Props {
  dark: boolean
  lang: Lang
  tr: Translations
  onBack: () => void
  onOpen?: (n: AppNotification) => void
  onUnreadChange?: (count: number) => void
}

function relativeTime(iso: string, tr: Translations): string {
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return ''
  const diff = Math.max(0, Date.now() - t)
  const min = Math.floor(diff / 60_000)
  if (min < 1) return tr.notificationsJustNow
  if (min < 60) return tr.notificationsMinAgo.replace('{n}', String(min))
  const h = Math.floor(min / 60)
  if (h < 24) return tr.notificationsHourAgo.replace('{n}', String(h))
  const d = Math.floor(h / 24)
  return tr.notificationsDayAgo.replace('{n}', String(Math.max(1, d)))
}

function absoluteTime(iso: string, lang: Lang): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const locale = lang === 'ru' ? 'ru-RU' : lang === 'uzc' ? 'uz-Cyrl-UZ' : 'uz-UZ'
  const today = new Date()
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  if (sameDay) {
    return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function typeMeta(type: string, dark: boolean) {
  const t = (type || 'general').toLowerCase()
  if (t === 'order') {
    return { icon: Truck, color: '#FF6B6B', bg: 'rgba(255,107,107,0.16)' }
  }
  if (t === 'plan') {
    return { icon: ClipboardList, color: '#6C5CE7', bg: 'rgba(108,92,231,0.16)' }
  }
  if (t === 'message') {
    return { icon: MessageSquare, color: '#3B82F6', bg: 'rgba(59,130,246,0.16)' }
  }
  if (t === 'payment' || t === 'payment_reminder') {
    return { icon: Wallet, color: '#10B981', bg: 'rgba(16,185,129,0.16)' }
  }
  if (t === 'visit') {
    return { icon: Package, color: '#E6963C', bg: 'rgba(230,150,60,0.16)' }
  }
  return {
    icon: Bell,
    color: '#6C5CE7',
    bg: dark ? 'rgba(108,92,231,0.2)' : 'rgba(108,92,231,0.12)',
  }
}

export default function NotificationsScreen({
  dark,
  lang,
  tr,
  onBack,
  onOpen,
  onUnreadChange,
}: Props) {
  const c = theme(dark)
  const [list, setList] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchNotifications()
      const rows = Array.isArray(data) ? data : []
      setList(rows)
      onUnreadChange?.(rows.filter(n => !n.isRead).length)
    } catch {
      setList([])
      showToast(tr.noData)
    } finally {
      setLoading(false)
    }
  }, [onUnreadChange, tr.noData])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    return pushBackHandler(() => {
      onBack()
      return true
    })
  }, [onBack])

  const unread = list.filter(n => !n.isRead).length

  const handleReadAll = async () => {
    if (!unread || marking) return
    setMarking(true)
    try {
      await markAllNotificationsRead()
      setList(prev => prev.map(n => ({ ...n, isRead: true })))
      onUnreadChange?.(0)
      showToast(tr.notificationsAllRead, 'success')
    } catch {
      showToast(tr.noData)
    } finally {
      setMarking(false)
    }
  }

  const handleOpen = async (n: AppNotification) => {
    if (!n.isRead) {
      setList(prev => prev.map(x => (x.id === n.id ? { ...x, isRead: true } : x)))
      onUnreadChange?.(Math.max(0, unread - 1))
      void markNotificationRead(n.id).catch(() => {})
    }
    onOpen?.(n)
  }

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 40, background: c.bg,
      display: 'flex', flexDirection: 'column',
      animation: 'slideUp 0.35s ease both',
    }}>
      <div style={{
        padding: 'var(--header-pad-top) max(16px, var(--safe-left)) 12px max(16px, var(--safe-right))',
        display: 'flex', alignItems: 'center', gap: 10,
        background: dark ? 'rgba(8,8,18,0.92)' : 'rgba(248,249,252,0.92)',
        backdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${c.border}`,
      }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            width: 40, height: 40, borderRadius: 13, border: 'none', background: c.muted,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}
        >
          <ArrowLeft size={18} color={c.text} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: c.text, margin: 0 }}>
            {tr.notificationsTitle}
          </h1>
          {unread > 0 && (
            <p style={{ fontSize: 12, color: c.mutedText, marginTop: 2, fontWeight: 600 }}>
              {tr.notificationsUnread}: {unread}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => void handleReadAll()}
          disabled={!unread || marking}
          title={tr.notificationsReadAll}
          style={{
            height: 40,
            padding: '0 12px',
            borderRadius: 13,
            border: 'none',
            cursor: unread && !marking ? 'pointer' : 'default',
            opacity: unread ? 1 : 0.45,
            background: unread
              ? 'linear-gradient(135deg, #6C5CE7, #A66BFF)'
              : c.muted,
            color: unread ? '#fff' : c.mutedText,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          <CheckCheck size={16} color={unread ? '#fff' : c.mutedText} />
          {tr.notificationsReadAll}
        </button>
      </div>

      <div
        style={{ flex: 1, overflowY: 'auto', padding: '12px 16px calc(24px + var(--safe-bottom))' }}
        className="no-scrollbar"
      >
        {loading && (
          <p style={{ textAlign: 'center', color: c.mutedText, padding: 40, fontWeight: 600 }}>
            {tr.loading}
          </p>
        )}

        {!loading && list.length === 0 && (
          <div style={{
            marginTop: 48,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 14,
            padding: 24,
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: 24,
              background: 'linear-gradient(135deg, rgba(108,92,231,0.25), rgba(166,107,255,0.12))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Bell size={30} color="#6C5CE7" />
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: c.mutedText, textAlign: 'center' }}>
              {tr.notificationsEmpty}
            </p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {list.map(n => {
            const meta = typeMeta(n.type, dark)
            const Icon = meta.icon
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => void handleOpen(n)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  border: `1px solid ${n.isRead ? c.border : 'rgba(108,92,231,0.35)'}`,
                  borderRadius: 20,
                  padding: 14,
                  cursor: 'pointer',
                  background: n.isRead
                    ? c.card
                    : dark
                      ? 'linear-gradient(135deg, rgba(108,92,231,0.18), rgba(8,8,18,0.4))'
                      : 'linear-gradient(135deg, rgba(108,92,231,0.1), rgba(255,255,255,0.9))',
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start',
                  boxShadow: n.isRead ? 'none' : '0 8px 24px rgba(108,92,231,0.12)',
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                  background: meta.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={20} color={meta.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <p style={{
                      flex: 1,
                      fontSize: 14,
                      fontWeight: 800,
                      color: c.text,
                      margin: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {n.title}
                    </p>
                    {!n.isRead && (
                      <span style={{
                        width: 8, height: 8, borderRadius: 99, flexShrink: 0,
                        background: '#6C5CE7',
                        boxShadow: '0 0 0 3px rgba(108,92,231,0.25)',
                      }} />
                    )}
                  </div>
                  <p style={{
                    fontSize: 13,
                    color: c.mutedText,
                    marginTop: 4,
                    lineHeight: 1.4,
                    fontWeight: 600,
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {n.body}
                  </p>
                  <p style={{ fontSize: 11, color: c.mutedText, marginTop: 8, fontWeight: 700 }}>
                    {relativeTime(n.createdAt, tr)}
                    <span style={{ opacity: 0.55 }}> · </span>
                    {absoluteTime(n.createdAt, lang)}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
