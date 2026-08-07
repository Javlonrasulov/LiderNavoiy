import { useEffect, useState } from 'react'
import { ArrowLeft, Clock, RefreshCw, Truck } from '../icons'
import { fetchClientOrders, type ClientOrderRow } from '../api/manager'
import type { Lang, Translations } from '../i18n'
import { formatMoney, theme } from '../theme'

interface Props {
  dark: boolean
  lang: Lang
  tr: Translations
  onBack: () => void
}

function formatOrderTime(iso: string, lang: Lang): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
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
    hour: '2-digit',
    minute: '2-digit',
  })
}

function waitingLabel(mins: number, tr: Translations): string {
  if (mins < 60) return tr.clientOrderWaitingMin.replace('{n}', String(mins))
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (m === 0) return tr.clientOrderWaitingHour.replace('{n}', String(h))
  return tr.clientOrderWaitingHourMin.replace('{h}', String(h)).replace('{m}', String(m))
}

export default function ClientOrdersScreen({ dark, lang, tr, onBack }: Props) {
  const c = theme(dark)
  const [orders, setOrders] = useState<ClientOrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchClientOrders('pending')
      setOrders(Array.isArray(data) ? data : [])
    } catch {
      setOrders([])
      setError(tr.noData)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    const id = window.setInterval(() => void load(), 60_000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 40, background: c.bg,
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        padding: 'var(--header-pad-top) max(16px, var(--safe-left)) 12px max(16px, var(--safe-right))',
        display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: `1px solid ${c.border}`,
        background: dark ? 'rgba(8,8,18,0.95)' : 'rgba(255,255,255,0.95)',
      }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            width: 40, height: 40, borderRadius: 14, border: 'none', cursor: 'pointer',
            background: c.muted, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <ArrowLeft size={18} color={c.text} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: c.text, margin: 0 }}>{tr.clientOrdersTitle}</h1>
          <p style={{ fontSize: 11, color: c.mutedText, marginTop: 2 }}>
            {orders.length} {tr.clientOrdersPending}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          style={{
            width: 40, height: 40, borderRadius: 14, border: 'none', cursor: 'pointer',
            background: c.muted, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <RefreshCw size={16} color={c.text} style={loading ? { animation: 'spin 0.8s linear infinite' } : undefined} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px calc(24px + var(--safe-bottom))' }} className="no-scrollbar">
        {error && (
          <button
            type="button"
            onClick={() => void load()}
            style={{
              width: '100%', border: 'none', marginBottom: 12,
              background: 'rgba(244,67,54,0.1)', color: c.red,
              padding: 12, borderRadius: 14, fontWeight: 700, cursor: 'pointer',
            }}
          >
            {error} — {tr.retry}
          </button>
        )}

        {loading && orders.length === 0 && (
          <p style={{ textAlign: 'center', color: c.mutedText, padding: 40 }}>{tr.loading}</p>
        )}

        {!loading && orders.length === 0 && !error && (
          <div style={{ textAlign: 'center', padding: '48px 20px' }}>
            <Truck size={40} color={c.mutedText} />
            <p style={{ marginTop: 12, color: c.mutedText, fontSize: 14, fontWeight: 600 }}>{tr.noClientOrders}</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {orders.map(order => (
            <div
              key={order.id}
              style={{
                borderRadius: 18,
                padding: 16,
                background: c.card,
                border: `1px solid ${order.stale ? 'rgba(244,67,54,0.45)' : c.border}`,
                boxShadow: order.stale ? '0 0 0 1px rgba(244,67,54,0.15)' : undefined,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 15, fontWeight: 800, color: c.text, margin: 0 }}>{order.clientName}</p>
                  {order.clientCode ? (
                    <p style={{ fontSize: 11, color: c.mutedText, marginTop: 2 }}>#{order.clientCode}</p>
                  ) : null}
                  {order.clientAddress ? (
                    <p style={{ fontSize: 12, color: c.mutedText, marginTop: 4, lineHeight: 1.35 }}>{order.clientAddress}</p>
                  ) : null}
                  <p style={{ fontSize: 12, fontWeight: 700, color: c.primary, marginTop: 8 }}>
                    {tr.clientOrderAgent}: {order.agentName}
                  </p>
                </div>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '5px 9px', borderRadius: 10,
                  background: dark ? '#1E1E38' : '#F3F4F6',
                  flexShrink: 0,
                }}>
                  <Clock size={12} color={c.mutedText} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: c.text }}>
                    {formatOrderTime(order.createdAt, lang)}
                  </span>
                </div>
              </div>

              <div style={{
                marginTop: 10,
                display: 'inline-flex',
                padding: '4px 10px',
                borderRadius: 99,
                fontSize: 11,
                fontWeight: 700,
                background: order.stale ? 'rgba(244,67,54,0.12)' : 'rgba(108,92,231,0.12)',
                color: order.stale ? c.red : c.primary,
              }}>
                {order.stale ? tr.clientOrderStale : waitingLabel(order.waitingMinutes, tr)}
              </div>

              <div style={{ height: 1, background: c.border, margin: '12px 0' }} />

              {(order.items ?? []).slice(0, 6).map((it, i) => (
                <div key={`${order.id}-${i}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '3px 0' }}>
                  <span style={{ fontSize: 13, color: c.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {it.productName} × {Math.round(Number(it.quantity) || 0)}
                  </span>
                  <span style={{ fontSize: 12, color: c.mutedText, fontWeight: 600 }}>
                    {formatMoney(Number(it.price) * Number(it.quantity), lang)}
                  </span>
                </div>
              ))}
              {(order.items?.length ?? 0) > 6 && (
                <p style={{ fontSize: 11, color: c.mutedText, marginTop: 4 }}>
                  +{(order.items?.length ?? 0) - 6}
                </p>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                <span style={{ fontSize: 12, color: c.mutedText, fontWeight: 600 }}>{tr.sales}</span>
                <span style={{ fontSize: 15, fontWeight: 900, color: c.text }}>
                  {formatMoney(order.totalAmount, lang)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
