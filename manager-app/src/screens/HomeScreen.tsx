import { useEffect, useRef, useState } from 'react'
import { Bell, CheckCircle, Moon, Package, Plus, RefreshCw, TrendingUp, Truck, Users, Wallet } from '../icons'
import { fetchAdminDashboard, fetchClients, fetchDistributors, fetchProducts } from '../api/manager'
import type { AdminDashboard, AuthUser } from '../api/types'
import type { Lang, Translations } from '../i18n'
import { formatMoney, formatPct, theme } from '../theme'
import LangDropdown from '../components/LangDropdown'
import EmployeeMap from '../components/EmployeeMap'
import RefreshResultCard from '../components/RefreshResultCard'
import {
  buildHomeRefreshUpdates,
  snapshotFromDashboard,
  type HomeRefreshSnapshot,
} from '../utils/homeRefresh'

type RefreshBtnState = 'idle' | 'loading' | 'success'

interface Props {
  dark: boolean
  lang: Lang
  tr: Translations
  user: AuthUser | null
  onNavigate: (screen: string) => void
  onChangeLang: (lang: Lang) => void
  onToggleDark: () => void
}

async function loadExtras() {
  const [staff, clients, products] = await Promise.all([
    fetchDistributors().catch(() => []),
    fetchClients().catch(() => []),
    fetchProducts().catch(() => []),
  ])
  return {
    staffCount: Array.isArray(staff) ? staff.length : 0,
    clientCount: Array.isArray(clients) ? clients.length : 0,
    productCount: Array.isArray(products) ? products.length : 0,
  }
}

export default function HomeScreen({ dark, lang, tr, user, onNavigate, onChangeLang, onToggleDark }: Props) {
  const c = theme(dark)
  const [data, setData] = useState<AdminDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshState, setRefreshState] = useState<RefreshBtnState>('idle')
  const [refreshUpdates, setRefreshUpdates] = useState<string[]>([])
  const [showRefreshResult, setShowRefreshResult] = useState(false)
  const snapshotRef = useRef<HomeRefreshSnapshot | null>(null)
  const successTimerRef = useRef<number | null>(null)

  const loadInitial = async () => {
    setLoading(true)
    setError(null)
    try {
      const [dash, extras] = await Promise.all([
        fetchAdminDashboard(),
        loadExtras(),
      ])
      setData(dash)
      snapshotRef.current = snapshotFromDashboard(dash, extras)
    } catch {
      setError(tr.noData)
    } finally {
      setLoading(false)
    }
  }

  const refresh = async () => {
    if (refreshState === 'loading') return
    if (successTimerRef.current) {
      window.clearTimeout(successTimerRef.current)
      successTimerRef.current = null
    }

    setRefreshState('loading')
    setShowRefreshResult(false)
    setError(null)

    try {
      const before = snapshotRef.current
      const [dash, extras] = await Promise.all([
        fetchAdminDashboard(),
        loadExtras(),
      ])
      const after = snapshotFromDashboard(dash, extras)
      const updates = buildHomeRefreshUpdates(before, after, tr, lang)
      snapshotRef.current = after
      setData(dash)
      setRefreshUpdates(updates)
      setShowRefreshResult(true)
      setRefreshState('success')
      successTimerRef.current = window.setTimeout(() => {
        setRefreshState(prev => (prev === 'success' ? 'idle' : prev))
        successTimerRef.current = null
      }, 2500)
    } catch {
      setError(tr.noData)
      setRefreshState('idle')
    }
  }

  useEffect(() => {
    void loadInitial()
    return () => {
      if (successTimerRef.current) window.clearTimeout(successTimerRef.current)
    }
  }, [])

  const kpi = data?.kpi
  const period = data?.period
  const monthLabel = (() => {
    const y = period?.year ?? new Date().getFullYear()
    const m = period?.month ?? new Date().getMonth() + 1
    const d = new Date(y, m - 1, 1)
    const locale = lang === 'ru' ? 'ru-RU' : lang === 'uzc' ? 'uz-Cyrl-UZ' : 'uz-UZ'
    const name = d.toLocaleString(locale, { month: 'long', year: 'numeric' })
    return name.charAt(0).toUpperCase() + name.slice(1)
  })()
  const actions = [
    { icon: Users, label: tr.staffNav, color: '#6C5CE7', screen: 'staff' },
    { icon: Package, label: tr.productsNav, color: '#E6963C', screen: 'products' },
    { icon: Truck, label: tr.clientsNav, color: '#00C853', screen: 'clients' },
    { icon: Plus, label: tr.addClient, color: '#7C4DFF', screen: 'addClient' },
  ]

  const refreshing = refreshState === 'loading'
  const showLoadingValues = loading && !data

  return (
    <div style={{ width: '100%', height: '100%', overflowY: 'auto', background: c.bg, paddingBottom: 'calc(90px + var(--safe-bottom))' }} className="no-scrollbar">
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        padding: 'var(--header-pad-top) max(16px, var(--safe-left)) 12px max(16px, var(--safe-right))',
        background: dark ? 'rgba(8,8,18,0.85)' : 'rgba(248,249,252,0.85)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12, color: c.mutedText, fontWeight: 600 }}>{tr.greeting}</p>
            <h1 style={{ fontSize: 20, fontWeight: 900, color: c.text, letterSpacing: '-0.3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.fullName || tr.appName}
            </h1>
          </div>
          <LangDropdown lang={lang} dark={dark} onChange={onChangeLang} />
          <button type="button" onClick={onToggleDark} style={{ width: 36, height: 36, borderRadius: 12, border: 'none', background: c.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Moon size={16} color={c.text} />
          </button>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={refreshing}
            title={refreshState === 'success' ? tr.refreshDone : tr.pullRefresh}
            style={{
              width: 36, height: 36, borderRadius: 12, border: 'none',
              background: refreshState === 'success' ? 'rgba(16,185,129,0.18)' : c.muted,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: refreshing ? 'wait' : 'pointer',
              opacity: refreshing ? 0.85 : 1,
            }}
          >
            {refreshState === 'success' ? (
              <CheckCircle size={16} color="#10B981" />
            ) : (
              <RefreshCw
                size={16}
                color={c.text}
                style={refreshing ? { animation: 'spin 0.8s linear infinite' } : undefined}
              />
            )}
          </button>
          <div style={{ width: 36, height: 36, borderRadius: 12, background: c.muted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bell size={16} color={c.text} />
          </div>
        </div>
      </div>

      <div style={{ padding: '8px 16px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{
          borderRadius: 28, padding: 20, position: 'relative', overflow: 'hidden',
          background: c.hero, boxShadow: '0 16px 48px rgba(108,92,231,0.35)',
        }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 10px)', borderRadius: 28 }} />
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Wallet size={18} color="rgba(255,255,255,0.9)" />
                <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: 700 }}>
                  {tr.todayOverview} · {monthLabel}
                </span>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 99, background: 'rgba(255,255,255,0.15)' }}>
                <TrendingUp size={12} color="white" />
                <span style={{ color: 'white', fontSize: 11, fontWeight: 800 }}>{formatPct(kpi?.planPct ?? 0)}</span>
              </div>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{tr.sales}</p>
            <h2 style={{ color: 'white', fontSize: 28, fontWeight: 900, letterSpacing: '-0.5px', marginBottom: 16 }}>
              {showLoadingValues ? '—' : formatMoney(kpi?.sales ?? 0, lang)}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {[
                { label: tr.payments, value: formatMoney(kpi?.payments ?? 0, lang) },
                { label: tr.debt, value: formatMoney(kpi?.debt ?? 0, lang) },
                { label: tr.plan, value: formatMoney(kpi?.plan ?? 0, lang) },
              ].map(item => (
                <div key={item.label} style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: '10px 10px' }}>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 600, marginBottom: 4 }}>{item.label}</p>
                  <p style={{ fontSize: 12, color: 'white', fontWeight: 800, lineHeight: 1.2 }}>{showLoadingValues ? '—' : item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {showRefreshResult && refreshUpdates.length > 0 && (
          <RefreshResultCard
            dark={dark}
            tr={tr}
            updates={refreshUpdates}
            onDismiss={() => setShowRefreshResult(false)}
          />
        )}

        <div>
          <p style={{ fontSize: 14, fontWeight: 800, color: c.text, marginBottom: 10 }}>{tr.quickActions}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {actions.map(a => (
              <button key={a.screen} type="button" className="card-hover" onClick={() => onNavigate(a.screen)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '14px 6px', borderRadius: 18, background: c.card, border: `1px solid ${c.border}`, cursor: 'pointer' }}>
                <div style={{ width: 42, height: 42, borderRadius: 14, background: a.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <a.icon size={18} color={a.color} />
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: c.text, textAlign: 'center', lineHeight: 1.2 }}>{a.label}</span>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <button type="button" onClick={() => void refresh()} style={{ border: 'none', background: 'rgba(244,67,54,0.1)', color: c.red, padding: 12, borderRadius: 14, fontWeight: 700, cursor: 'pointer' }}>
            {error} — {tr.retry}
          </button>
        )}

        <EmployeeMap dark={dark} tr={tr} employees={data?.employeeLocations ?? []} />

        <div>
          <p style={{ fontSize: 14, fontWeight: 800, color: c.text, marginBottom: 10 }}>{tr.topAgents}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(data?.topAgents ?? []).slice(0, 5).map((a, i) => (
              <div key={a.distributorId} className="card-hover" style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18,
                background: c.card, border: `1px solid ${c.border}`,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 14,
                  background: 'linear-gradient(135deg, #6C5CE7, #E6963C)',
                  color: 'white', fontWeight: 900, fontSize: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 800, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</p>
                  <p style={{ fontSize: 11, color: c.mutedText, marginTop: 2 }}>{formatMoney(a.sales, lang)}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 14, fontWeight: 900, color: c.primary }}>{formatPct(a.planPct)}</p>
                  <p style={{ fontSize: 10, color: c.mutedText }}>{tr.planPct}</p>
                </div>
              </div>
            ))}
            {!showLoadingValues && (data?.topAgents?.length ?? 0) === 0 && (
              <p style={{ textAlign: 'center', color: c.mutedText, fontSize: 13, padding: 20 }}>{tr.noData}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
