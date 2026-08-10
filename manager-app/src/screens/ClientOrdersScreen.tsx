import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, CheckCircle, Clock, Minus, Plus, RefreshCw, Search, Truck, X } from '../icons'
import {
  fetchClientOrders,
  fetchProductCategories,
  fetchProducts,
  rejectClientOrder,
  sendClientOrderToWarehouse,
  updateClientOrderItems,
  type ClientOrderRow,
} from '../api/manager'
import type { AuthUser, Product } from '../api/types'
import type { Lang, Translations } from '../i18n'
import { formatMoney, theme } from '../theme'
import RefreshResultCard from '../components/RefreshResultCard'
import { showToast } from '../components/Toast'
import { managerCompanyId } from '../utils/staffScope'

interface Props {
  dark: boolean
  lang: Lang
  tr: Translations
  user?: AuthUser | null
  onBack: () => void
}

type RefreshBtn = 'idle' | 'loading' | 'success'
type EditItem = ClientOrderRow['items'][number]

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

function waitingLabel(mins: number, tr: Translations, stale = false): string {
  const n = Math.max(0, Math.floor(Number(mins) || 0))
  if (n < 60) {
    return stale
      ? tr.clientOrderStaleMin.replace('{n}', String(n))
      : tr.clientOrderWaitingMin.replace('{n}', String(n))
  }
  const h = Math.floor(n / 60)
  const m = n % 60
  if (stale) {
    if (m === 0) return tr.clientOrderStaleHour.replace('{n}', String(h))
    return tr.clientOrderStaleHourMin.replace('{h}', String(h)).replace('{m}', String(m))
  }
  if (m === 0) return tr.clientOrderWaitingHour.replace('{n}', String(h))
  return tr.clientOrderWaitingHourMin.replace('{h}', String(h)).replace('{m}', String(m))
}

export default function ClientOrdersScreen({ dark, lang, tr, user, onBack }: Props) {
  const c = theme(dark)
  const companyId = managerCompanyId(user)
  const [orders, setOrders] = useState<ClientOrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)
  const [urgentIds, setUrgentIds] = useState<Record<string, boolean>>({})
  const [editOrder, setEditOrder] = useState<ClientOrderRow | null>(null)
  const [rejectOrder, setRejectOrder] = useState<ClientOrderRow | null>(null)
  const [editItems, setEditItems] = useState<EditItem[]>([])
  const [showProductPicker, setShowProductPicker] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [productCategories, setProductCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [productsLoading, setProductsLoading] = useState(false)
  const [productQuery, setProductQuery] = useState('')
  const [refreshState, setRefreshState] = useState<RefreshBtn>('idle')
  const [showRefreshResult, setShowRefreshResult] = useState(false)
  const [refreshUpdates, setRefreshUpdates] = useState<string[]>([])
  const prevCountRef = useRef<number | null>(null)
  const successTimerRef = useRef<number | null>(null)

  const load = async (manual = false) => {
    if (manual) {
      if (refreshState === 'loading') return
      if (successTimerRef.current) {
        window.clearTimeout(successTimerRef.current)
        successTimerRef.current = null
      }
      setRefreshState('loading')
      setShowRefreshResult(false)
    } else {
      setLoading(true)
    }
    try {
      const data = await fetchClientOrders('pending', companyId)
      const list = Array.isArray(data) ? data : []
      const before = prevCountRef.current
      setOrders(list)
      prevCountRef.current = list.length

      if (manual) {
        const updates: string[] = []
        if (before == null) updates.push(tr.refreshFirstDone)
        else if (list.length === before) updates.push(tr.refreshNoChanges)
        else if (list.length > before) {
          updates.push(tr.refreshClientsUp.replace('{n}', String(list.length - before)))
        } else {
          updates.push(tr.refreshDone)
        }
        const stale = list.filter(o => o.stale).length
        if (stale > 0) updates.push(tr.clientOrderStaleCount.replace('{n}', String(stale)))
        setRefreshUpdates(updates.length ? updates : [tr.refreshDone])
        setShowRefreshResult(true)
        setRefreshState('success')
        successTimerRef.current = window.setTimeout(() => {
          setRefreshState(s => (s === 'success' ? 'idle' : s))
          successTimerRef.current = null
        }, 2500)
      }
    } catch {
      setOrders([])
      showToast(tr.noData)
      if (manual) setRefreshState('idle')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load(false)
    const id = window.setInterval(() => void load(false), 60_000)
    return () => {
      window.clearInterval(id)
      if (successTimerRef.current) window.clearTimeout(successTimerRef.current)
    }
  }, [companyId]) // eslint-disable-line react-hooks/exhaustive-deps

  const send = async (order: ClientOrderRow) => {
    if (actionId) return
    setActionId(order.id)
    try {
      await sendClientOrderToWarehouse(order.id, !!urgentIds[order.id])
      setOrders(prev => prev.filter(o => o.id !== order.id))
      setRefreshUpdates([tr.clientOrderSent, `${order.clientName} · ${order.agentName}`])
      setShowRefreshResult(true)
    } catch {
      showToast(tr.noData)
    } finally {
      setActionId(null)
    }
  }

  const reject = async (order: ClientOrderRow) => {
    if (actionId) return
    setActionId(order.id)
    setRejectOrder(null)
    try {
      await rejectClientOrder(order.id)
      setOrders(prev => prev.filter(o => o.id !== order.id))
      setRefreshUpdates([tr.clientOrderRejected, `${order.clientName} · ${order.agentName}`])
      setShowRefreshResult(true)
    } catch {
      showToast(tr.noData)
    } finally {
      setActionId(null)
    }
  }

  const openEdit = (order: ClientOrderRow) => {
    setEditOrder(order)
    setEditItems((order.items ?? []).map(it => ({ ...it, productCode: it.productCode ?? '' })))
    setShowProductPicker(false)
    setProductQuery('')
    setSelectedCategory(null)
  }

  const ensureProducts = async () => {
    if (products.length > 0 || productsLoading) return
    setProductsLoading(true)
    try {
      const [data, cats] = await Promise.all([
        fetchProducts(companyId),
        fetchProductCategories(companyId).catch(() => [] as { category: string }[]),
      ])
      const list = Array.isArray(data) ? data : []
      setProducts(list)
      const fromApi = (Array.isArray(cats) ? cats : [])
        .map(r => (r?.category ?? '').trim())
        .filter(Boolean)
      const fromProducts = [...new Set(
        list.map(p => (p.category ?? '').trim()).filter(Boolean),
      )]
      const merged = fromApi.length > 0
        ? fromApi
        : fromProducts.sort((a, b) => a.localeCompare(b, 'uz'))
      setProductCategories(merged)
    } catch {
      setProducts([])
      setProductCategories([])
    } finally {
      setProductsLoading(false)
    }
  }

  const openProductPicker = () => {
    setShowProductPicker(true)
    setSelectedCategory(null)
    setProductQuery('')
    void ensureProducts()
  }

  const closeProductPicker = () => {
    setShowProductPicker(false)
    setProductQuery('')
    setSelectedCategory(null)
  }

  const addProduct = (p: Product) => {
    setEditItems(prev => {
      const idx = prev.findIndex(it => it.productId === p.id)
      if (idx >= 0) {
        return prev.map((it, i) => (
          i === idx ? { ...it, quantity: Number(it.quantity) + 1 } : it
        ))
      }
      return [
        ...prev,
        {
          productId: p.id,
          productCode: p.code ?? '',
          productName: p.name,
          quantity: 1,
          price: Number(p.price) || 0,
          unit: p.unit ?? 'dona',
        },
      ]
    })
    closeProductPicker()
  }

  const filteredProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase()
    let list = products
    if (selectedCategory) {
      list = list.filter(p => (p.category ?? '').trim() === selectedCategory)
    }
    if (q) {
      list = list.filter(p =>
        (p.name ?? '').toLowerCase().includes(q) ||
        (p.code ?? '').toLowerCase().includes(q) ||
        (p.brand ?? '').toLowerCase().includes(q) ||
        (p.category ?? '').toLowerCase().includes(q),
      )
    }
    return list.slice(0, 80)
  }, [products, productQuery, selectedCategory])

  const saveEdit = async () => {
    if (!editOrder || actionId) return
    const cleaned = editItems
      .filter(it => Number(it.quantity) > 0)
      .map(it => ({
        productId: it.productId,
        productCode: it.productCode || '',
        productName: it.productName,
        quantity: Number(it.quantity),
        price: Number(it.price),
        unit: it.unit || 'dona',
      }))
    if (!cleaned.length) return
    setActionId(editOrder.id)
    try {
      const saved = await updateClientOrderItems(editOrder.id, cleaned)
      setOrders(prev => prev.map(o => (
        o.id === editOrder.id
          ? {
              ...o,
              items: saved.items ?? cleaned,
              totalAmount: Number(saved.totalAmount ?? cleaned.reduce((s, it) => s + Number(it.price) * Number(it.quantity), 0)),
            }
          : o
      )))
      setEditOrder(null)
      setShowProductPicker(false)
      setProductQuery('')
      setSelectedCategory(null)
      setRefreshUpdates([tr.clientOrderSaved, editOrder.clientName])
      setShowRefreshResult(true)
    } catch {
      showToast(tr.noData)
    } finally {
      setActionId(null)
    }
  }

  const refreshing = refreshState === 'loading'

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
          onClick={() => void load(true)}
          disabled={refreshing}
          title={refreshState === 'success' ? tr.refreshDone : tr.pullRefresh}
          style={{
            width: 40, height: 40, borderRadius: 14, border: 'none',
            background: refreshState === 'success' ? 'rgba(16,185,129,0.18)' : c.muted,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: refreshing ? 'wait' : 'pointer',
          }}
        >
          {refreshState === 'success' ? (
            <CheckCircle size={18} color="#10B981" />
          ) : (
            <RefreshCw
              size={16}
              color={c.text}
              style={refreshing ? { animation: 'spin 0.8s linear infinite' } : undefined}
            />
          )}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px calc(100px + var(--safe-bottom))' }} className="no-scrollbar">
        {showRefreshResult && refreshUpdates.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <RefreshResultCard
              dark={dark}
              tr={tr}
              updates={refreshUpdates}
              onDismiss={() => setShowRefreshResult(false)}
            />
          </div>
        )}

        {loading && orders.length === 0 && (
          <p style={{ textAlign: 'center', color: c.mutedText, padding: 40 }}>{tr.loading}</p>
        )}

        {!loading && orders.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 20px' }}>
            <Truck size={40} color={c.mutedText} />
            <p style={{ marginTop: 12, color: c.mutedText, fontSize: 14, fontWeight: 600 }}>{tr.noClientOrders}</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {orders.map(order => {
            const busy = actionId === order.id
            const urgent = !!urgentIds[order.id]
            return (
              <div
                key={order.id}
                className={order.stale ? 'qa-stale-blink' : undefined}
                style={{
                  borderRadius: 18,
                  padding: 16,
                  background: c.card,
                  border: `1px solid ${order.stale ? 'rgba(244,67,54,0.55)' : c.border}`,
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
                  animation: order.stale ? 'stale-badge-blink 1.1s ease-in-out infinite' : undefined,
                }}>
                  {waitingLabel(order.waitingMinutes, tr, order.stale)}
                </div>

                <div style={{ height: 1, background: c.border, margin: '12px 0' }} />

                {(order.items ?? []).map((it, i) => (
                  <div key={`${order.id}-${i}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '3px 0' }}>
                    <span style={{ fontSize: 13, color: c.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {it.productName} × {Math.round(Number(it.quantity) || 0)}
                    </span>
                    <span style={{ fontSize: 12, color: c.mutedText, fontWeight: 600 }}>
                      {formatMoney(Number(it.price) * Number(it.quantity), lang)}
                    </span>
                  </div>
                ))}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                  <span style={{ fontSize: 12, color: c.mutedText, fontWeight: 600 }}>{tr.sales}</span>
                  <span style={{ fontSize: 15, fontWeight: 900, color: c.text }}>
                    {formatMoney(order.totalAmount, lang)}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setUrgentIds(prev => ({ ...prev, [order.id]: !prev[order.id] }))}
                  style={{
                    marginTop: 12, width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
                    border: `1px solid ${urgent ? 'rgba(244,67,54,0.45)' : c.border}`,
                    background: urgent ? 'rgba(244,67,54,0.08)' : (dark ? '#1A1A2E' : '#F9FAFB'),
                  }}
                >
                  <span style={{
                    width: 18, height: 18, borderRadius: 4,
                    border: `2px solid ${urgent ? '#EF4444' : c.mutedText}`,
                    background: urgent ? '#EF4444' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 12, fontWeight: 900,
                  }}>
                    {urgent ? '✓' : ''}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: urgent ? '#EF4444' : c.text }}>
                    {tr.clientOrderUrgent}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => openEdit(order)}
                  style={{
                    marginTop: 8, width: '100%', padding: '10px 12px', borderRadius: 12,
                    border: `1px solid ${c.border}`, background: 'transparent',
                    color: c.primary, fontWeight: 700, fontSize: 13, cursor: 'pointer',
                  }}
                >
                  {tr.clientOrderEdit}
                </button>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setRejectOrder(order)}
                    style={{
                      padding: '11px 10px', borderRadius: 12, border: `1px solid rgba(239,68,68,0.45)`,
                      background: 'transparent', color: '#EF4444', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                    }}
                  >
                    {tr.clientOrderReject}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void send(order)}
                    style={{
                      padding: '11px 10px', borderRadius: 12, border: 'none',
                      background: urgent ? '#EF4444' : '#6366F1',
                      color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                      opacity: busy ? 0.7 : 1,
                    }}
                  >
                    {busy ? '...' : tr.clientOrderSend}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {rejectOrder && (
        <div
          style={{
            position: 'absolute', inset: 0, zIndex: 70,
            background: 'rgba(0,0,0,0.55)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: 24,
          }}
          onClick={() => { if (!actionId) setRejectOrder(null) }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 340,
              background: c.card, borderRadius: 20,
              padding: 20, border: `1px solid ${c.border}`,
              boxShadow: '0 16px 40px rgba(0,0,0,0.28)',
            }}
          >
            <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: c.text }}>
              {tr.clientOrderReject}
            </p>
            <p style={{ margin: '10px 0 0', fontSize: 14, lineHeight: 1.45, color: c.mutedText }}>
              {tr.clientOrderConfirmReject}
            </p>
            {rejectOrder.clientName ? (
              <p style={{ margin: '8px 0 0', fontSize: 13, fontWeight: 700, color: c.text }}>
                {rejectOrder.clientName}
              </p>
            ) : null}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 18 }}>
              <button
                type="button"
                disabled={!!actionId}
                onClick={() => setRejectOrder(null)}
                style={{
                  padding: '12px 10px', borderRadius: 12,
                  border: `1px solid ${c.border}`, background: c.muted,
                  color: c.text, fontWeight: 700, fontSize: 13, cursor: 'pointer',
                }}
              >
                {tr.cancel}
              </button>
              <button
                type="button"
                disabled={!!actionId}
                onClick={() => void reject(rejectOrder)}
                style={{
                  padding: '12px 10px', borderRadius: 12, border: 'none',
                  background: c.red, color: '#fff', fontWeight: 700, fontSize: 13,
                  cursor: 'pointer', opacity: actionId ? 0.7 : 1,
                }}
              >
                {actionId === rejectOrder.id ? '...' : tr.clientOrderReject}
              </button>
            </div>
          </div>
        </div>
      )}

      {editOrder && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 70,
          background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-end',
          paddingBottom: 'var(--ime-bottom, 0px)',
          transition: 'padding-bottom 160ms ease-out',
        }}>
          <div style={{
            width: '100%',
            maxHeight: 'min(90%, calc(100% - var(--ime-bottom, 0px)))',
            overflowY: 'auto',
            background: c.card, borderRadius: '24px 24px 0 0',
            padding: '16px 16px calc(20px + var(--safe-bottom))',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <p style={{ fontSize: 16, fontWeight: 800, color: c.text, margin: 0 }}>
                {showProductPicker ? tr.clientOrderAddProduct : tr.clientOrderEdit}
              </p>
              <button type="button" onClick={() => {
                if (showProductPicker) {
                  closeProductPicker()
                } else {
                  setEditOrder(null)
                }
              }} style={{
                width: 36, height: 36, borderRadius: 12, border: 'none', background: c.muted,
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}>
                <X size={16} color={c.text} />
              </button>
            </div>
            <p style={{ fontSize: 13, color: c.mutedText, marginBottom: 12 }}>{editOrder.clientName}</p>

            {showProductPicker ? (
              <>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 12px', borderRadius: 12, marginBottom: 10,
                  background: dark ? '#1A1A2E' : '#F3F4F6',
                  border: `1px solid ${c.border}`,
                }}>
                  <Search size={16} color={c.mutedText} />
                  <input
                    value={productQuery}
                    onChange={e => setProductQuery(e.target.value)}
                    placeholder={tr.clientOrderSearchProduct}
                    autoFocus
                    style={{
                      flex: 1, border: 'none', outline: 'none', background: 'transparent',
                      color: c.text, fontSize: 14, fontWeight: 600,
                    }}
                  />
                </div>
                {productCategories.length > 0 && (
                  <div style={{
                    display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 12,
                    paddingBottom: 2, WebkitOverflowScrolling: 'touch',
                  }}>
                    <button
                      type="button"
                      onClick={() => setSelectedCategory(null)}
                      style={{
                        flexShrink: 0, padding: '7px 12px', borderRadius: 999,
                        border: `1px solid ${selectedCategory == null ? c.primary : c.border}`,
                        background: selectedCategory == null
                          ? (dark ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.12)')
                          : (dark ? '#1A1A2E' : '#F9FAFB'),
                        color: selectedCategory == null ? c.primary : c.text,
                        fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
                      }}
                    >
                      {tr.clientOrderAllProducts}
                    </button>
                    {productCategories.map(cat => {
                      const active = selectedCategory === cat
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setSelectedCategory(cat)}
                          style={{
                            flexShrink: 0, padding: '7px 12px', borderRadius: 999,
                            border: `1px solid ${active ? c.primary : c.border}`,
                            background: active
                              ? (dark ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.12)')
                              : (dark ? '#1A1A2E' : '#F9FAFB'),
                            color: active ? c.primary : c.text,
                            fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
                          }}
                        >
                          {cat}
                        </button>
                      )
                    })}
                  </div>
                )}
                {productsLoading && (
                  <p style={{ textAlign: 'center', color: c.mutedText, padding: 20 }}>{tr.loading}</p>
                )}
                {!productsLoading && filteredProducts.length === 0 && (
                  <p style={{ textAlign: 'center', color: c.mutedText, padding: 20 }}>{tr.clientOrderNoProducts}</p>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 360, overflowY: 'auto' }}>
                  {filteredProducts.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addProduct(p)}
                      style={{
                        textAlign: 'left', padding: '12px 12px', borderRadius: 12, cursor: 'pointer',
                        border: `1px solid ${c.border}`, background: dark ? '#1A1A2E' : '#F9FAFB',
                      }}
                    >
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: c.text }}>{p.name}</p>
                      <p style={{ margin: '4px 0 0', fontSize: 11, color: c.mutedText }}>
                        {p.category ? `${p.category} · ` : ''}
                        {p.code ? `#${p.code} · ` : ''}
                        {formatMoney(Number(p.price) || 0, lang)}
                      </p>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                {editItems.map((it, idx) => (
                  <div key={`${it.productId}-${idx}`} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0',
                    borderBottom: `1px solid ${c.border}`,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: c.text, margin: 0 }}>{it.productName}</p>
                      <p style={{ fontSize: 11, color: c.mutedText, marginTop: 2 }}>{formatMoney(Number(it.price), lang)}</p>
                    </div>
                    <button type="button" onClick={() => setEditItems(prev => prev.map((row, i) => (
                      i === idx ? { ...row, quantity: Math.max(1, Number(row.quantity) - 1) } : row
                    )))} style={{
                      width: 32, height: 32, borderRadius: 10, border: 'none', background: c.muted,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    }}>
                      <Minus size={14} color={c.text} />
                    </button>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      enterKeyHint="done"
                      value={Number.isFinite(Number(it.quantity)) ? String(Math.round(Number(it.quantity))) : ''}
                      onFocus={e => e.currentTarget.select()}
                      onChange={e => {
                        const raw = e.target.value.replace(/\D/g, '')
                        setEditItems(prev => prev.map((row, i) => {
                          if (i !== idx) return row
                          if (raw === '') return { ...row, quantity: 0 }
                          return { ...row, quantity: Math.min(99999, Number(raw)) }
                        }))
                      }}
                      onBlur={() => {
                        setEditItems(prev => prev.map((row, i) => (
                          i === idx ? { ...row, quantity: Math.max(1, Math.round(Number(row.quantity)) || 1) } : row
                        )))
                      }}
                      style={{
                        width: 44, height: 32, textAlign: 'center', fontWeight: 800, fontSize: 14,
                        color: c.text, background: dark ? '#1A1A2E' : '#F3F4F6',
                        border: `1px solid ${c.border}`, borderRadius: 10, outline: 'none',
                        WebkitAppearance: 'none', appearance: 'none',
                      }}
                    />
                    <button type="button" onClick={() => setEditItems(prev => prev.map((row, i) => (
                      i === idx ? { ...row, quantity: Number(row.quantity) + 1 } : row
                    )))} style={{
                      width: 32, height: 32, borderRadius: 10, border: 'none', background: c.muted,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    }}>
                      <Plus size={14} color={c.text} />
                    </button>
                    <button type="button" onClick={() => setEditItems(prev => prev.filter((_, i) => i !== idx))} style={{
                      width: 32, height: 32, borderRadius: 10, border: 'none', background: 'rgba(244,67,54,0.12)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    }}>
                      <X size={14} color={c.red} />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={openProductPicker}
                  style={{
                    marginTop: 12, width: '100%', padding: '11px 12px', borderRadius: 12,
                    border: `1px dashed ${c.primary}`, background: 'rgba(99,102,241,0.08)',
                    color: c.primary, fontWeight: 700, fontSize: 13, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  <Plus size={16} color={c.primary} />
                  {tr.clientOrderAddProduct}
                </button>

                <button
                  type="button"
                  disabled={!!actionId || editItems.length === 0}
                  onClick={() => void saveEdit()}
                  style={{
                    marginTop: 12, width: '100%', padding: 14, borderRadius: 14, border: 'none',
                    background: c.primary, color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer',
                  }}
                >
                  {tr.save}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
