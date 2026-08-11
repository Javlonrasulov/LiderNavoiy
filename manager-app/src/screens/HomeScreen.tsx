import { useEffect, useRef, useState } from 'react'
import { Bell, CheckCircle, ClipboardList, Moon, Package, Plus, RefreshCw, Sun, TrendingDown, TrendingUp, Truck, User, Wallet } from '../icons'
import { fetchAdminDashboard, fetchClientOrders, fetchClients, fetchDistributors, fetchProducts } from '../api/manager'
import type { AdminDashboard, AuthUser } from '../api/types'
import type { Lang, Translations } from '../i18n'
import { formatMoney, formatPct, formatTrend, theme } from '../theme'
import LangDropdown from '../components/LangDropdown'
import EmployeeMap from '../components/EmployeeMap'
import RefreshResultCard from '../components/RefreshResultCard'
import { showToast } from '../components/Toast'
import { getStoredUser, isSessionExpiredError } from '../api/client'
import {
  buildHomeRefreshUpdates,
  snapshotFromDashboard,
  type HomeRefreshSnapshot,
} from '../utils/homeRefresh'
import {
  filterEmployeeLocationsForManager,
  managerCompanyId,
} from '../utils/staffScope'

type RefreshBtnState = 'idle' | 'loading' | 'success'

interface Props {
  dark: boolean
  lang: Lang
  tr: Translations
  user: AuthUser | null
  notifUnread?: number
  onNavigate: (screen: string) => void
  onChangeLang: (lang: Lang) => void
  onToggleDark: () => void
}

async function loadExtras(companyId?: string) {
  const [staff, clients, products] = await Promise.all([
    fetchDistributors(companyId).catch(() => []),
    fetchClients(companyId).catch(() => []),
    fetchProducts(companyId).catch(() => []),
  ])
  return {
    staffCount: Array.isArray(staff) ? staff.length : 0,
    clientCount: Array.isArray(clients) ? clients.length : 0,
    productCount: Array.isArray(products) ? products.length : 0,
  }
}

export default function HomeScreen({ dark, lang, tr, user, notifUnread = 0, onNavigate, onChangeLang, onToggleDark }: Props) {
  const c = theme(dark)
  const [data, setData] = useState<AdminDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshState, setRefreshState] = useState<RefreshBtnState>('idle')
  const [refreshUpdates, setRefreshUpdates] = useState<string[]>([])
  const [showRefreshResult, setShowRefreshResult] = useState(false)
  const [hasStaleOrders, setHasStaleOrders] = useState(false)
  const [nameExpanded, setNameExpanded] = useState(false)
  const nameWrapRef = useRef<HTMLDivElement>(null)
  const snapshotRef = useRef<HomeRefreshSnapshot | null>(null)
  const successTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!nameExpanded) return
    const onDoc = (e: MouseEvent | TouchEvent) => {
      const el = nameWrapRef.current
      if (el && !el.contains(e.target as Node)) setNameExpanded(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('touchstart', onDoc)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('touchstart', onDoc)
    }
  }, [nameExpanded])

  const checkStaleOrders = async () => {
    try {
      const companyId = managerCompanyId(user ?? getStoredUser())
      const list = await fetchClientOrders('pending', companyId)
      const rows = Array.isArray(list) ? list : []
      setHasStaleOrders(rows.some(o => o.stale || (o.waitingMinutes ?? 0) >= 60))
    } catch {
      /* ignore */
    }
  }

  const loadInitial = async () => {
    setLoading(true)
    try {
      const me = user ?? getStoredUser()
      const companyId = managerCompanyId(me)
      const [dash, extras] = await Promise.all([
        fetchAdminDashboard(companyId),
        loadExtras(companyId),
      ])
      const scoped = {
        ...dash,
        employeeLocations: filterEmployeeLocationsForManager(dash.employeeLocations ?? [], me),
      }
      setData(scoped)
      snapshotRef.current = snapshotFromDashboard(scoped, extras)
    } catch (e) {
      if (!isSessionExpiredError(e)) showToast(tr.noData)
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

    try {
      const me = user ?? getStoredUser()
      const companyId = managerCompanyId(me)
      const before = snapshotRef.current
      const [dash, extras] = await Promise.all([
        fetchAdminDashboard(companyId),
        loadExtras(companyId),
      ])
      const scoped = {
        ...dash,
        employeeLocations: filterEmployeeLocationsForManager(dash.employeeLocations ?? [], me),
      }
      const after = snapshotFromDashboard(scoped, extras)
      const updates = buildHomeRefreshUpdates(before, after, tr, lang)
      snapshotRef.current = after
      setData(scoped)
      setRefreshUpdates(updates)
      setShowRefreshResult(true)
      setRefreshState('success')
      void checkStaleOrders()
      successTimerRef.current = window.setTimeout(() => {
        setRefreshState(prev => (prev === 'success' ? 'idle' : prev))
        successTimerRef.current = null
      }, 2500)
    } catch (e) {
      if (!isSessionExpiredError(e)) showToast(tr.noData)
      setRefreshState('idle')
    }
  }

  useEffect(() => {
    void loadInitial()
    void checkStaleOrders()
    const poll = window.setInterval(() => void checkStaleOrders(), 60_000)
    return () => {
      if (successTimerRef.current) window.clearTimeout(successTimerRef.current)
      window.clearInterval(poll)
    }
  }, [])

  const kpi = data?.kpi
  const sales = kpi?.sales ?? 0
  const plan = kpi?.plan ?? 0
  /** Kartadagi savdo ÷ reja — har doim oylik raqamlar bilan mos */
  const planPctLive = plan > 0 ? Math.round((sales / plan) * 100) : 0
  /** O‘tgan oyga nisbatan oylik savdo o‘zgarishi (backend) */
  const salesTrend = kpi?.salesTrend ?? 0
  const trendUp = salesTrend >= 0
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
    { icon: Package, label: tr.productsNav, color: '#E6963C', screen: 'products' },
    { icon: Truck, label: tr.clientOrdersTitle, color: '#00C853', screen: 'clientOrders' },
    { icon: ClipboardList, label: tr.factoryOrdersTitle, color: '#FF6B35', screen: 'factoryOrders' },
    { icon: Plus, label: tr.addClient, color: '#7C4DFF', screen: 'addClient' },
    { icon: User, label: tr.profileNav, color: '#3B82F6', screen: 'profile' },
  ]

  const refreshing = refreshState === 'loading'
  const showLoadingValues = loading && !data

  return (
    <div style={{ width: '100%', height: '100%', overflowY: 'auto', background: c.bg, paddingBottom: 'calc(100px + var(--safe-bottom))' }} className="no-scrollbar">
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        padding: 'var(--header-pad-top) max(16px, var(--safe-left)) 12px max(16px, var(--safe-right))',
        background: dark ? 'rgba(8,8,18,0.85)' : 'rgba(248,249,252,0.85)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div ref={nameWrapRef} style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12, color: c.mutedText, fontWeight: 600 }}>{tr.greeting}</p>
            <h1
              role="button"
              tabIndex={0}
              onClick={() => setNameExpanded(v => !v)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setNameExpanded(v => !v)
                }
              }}
              title={user?.fullName || tr.appName}
              style={{
                fontSize: 20,
                fontWeight: 900,
                color: c.text,
                letterSpacing: '-0.3px',
                margin: 0,
                cursor: 'pointer',
                overflow: nameExpanded ? 'visible' : 'hidden',
                textOverflow: nameExpanded ? 'clip' : 'ellipsis',
                whiteSpace: nameExpanded ? 'normal' : 'nowrap',
                wordBreak: nameExpanded ? 'break-word' : undefined,
                lineHeight: nameExpanded ? 1.25 : undefined,
              }}
            >
              {user?.fullName || tr.appName}
            </h1>
          </div>
          <LangDropdown lang={lang} dark={dark} onChange={onChangeLang} />
          <button type="button" onClick={onToggleDark} style={{ width: 36, height: 36, borderRadius: 12, border: 'none', background: c.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            {dark ? <Sun size={16} color={c.text} /> : <Moon size={16} color={c.text} />}
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
          <button
            type="button"
            onClick={() => onNavigate('notifications')}
            title={tr.notificationsTitle}
            style={{
              width: 36, height: 36, borderRadius: 12, border: 'none', background: c.muted,
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              position: 'relative',
            }}
          >
            <Bell size={16} color={c.text} />
            {notifUnread > 0 && (
              <span style={{
                position: 'absolute',
                top: 4,
                right: 4,
                minWidth: 14,
                height: 14,
                padding: '0 3px',
                borderRadius: 99,
                background: '#FF3B5C',
                color: '#fff',
                fontSize: 9,
                fontWeight: 800,
                lineHeight: '14px',
                textAlign: 'center',
                boxShadow: '0 0 0 2px ' + (dark ? '#080812' : '#F8F9FC'),
              }}>
                {notifUnread > 99 ? '99+' : notifUnread}
              </span>
            )}
          </button>
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
              <div
                title={`${tr.planPct}: ${formatPct(planPctLive)}`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  background: 'transparent', padding: 0,
                }}
              >
                {trendUp
                  ? <TrendingUp size={12} color="white" />
                  : <TrendingDown size={12} color="white" />}
                <span style={{ color: 'white', fontSize: 11, fontWeight: 800 }}>
                  {showLoadingValues ? '—' : formatTrend(salesTrend)}
                </span>
              </div>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{tr.sales}</p>
            <h2 style={{ color: 'white', fontSize: 28, fontWeight: 900, letterSpacing: '-0.5px', marginBottom: 6 }}>
              {showLoadingValues ? '—' : formatMoney(sales, lang)}
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: 600, marginBottom: 14 }}>
              {tr.planPct}: {showLoadingValues ? '—' : formatPct(planPctLive)}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {[
                { label: tr.payments, value: formatMoney(kpi?.payments ?? 0, lang) },
                { label: tr.debt, value: formatMoney(kpi?.debt ?? 0, lang) },
                { label: tr.plan, value: formatMoney(plan, lang) },
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
          <div
            className="no-scrollbar"
            style={{
              display: 'flex',
              gap: 10,
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
              scrollSnapType: 'x mandatory',
              // overflow-x:auto y=visible qilib bo'lmaydi — soyani kesmaslik uchun vertikal pad
              paddingTop: 8,
              paddingBottom: 8,
              marginTop: -8,
              marginBottom: -6,
              marginRight: -16,
              paddingRight: 16,
            }}
          >
            {actions.map(a => {
              const alert = a.screen === 'clientOrders' && hasStaleOrders
              return (
                <button
                  key={a.screen}
                  type="button"
                  className={`card-hover${alert ? ' qa-stale-blink' : ''}`}
                  onClick={() => onNavigate(a.screen)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                    padding: '14px 6px', borderRadius: 18, background: c.card,
                    border: `1px solid ${alert ? 'rgba(244,67,54,0.55)' : c.border}`,
                    cursor: 'pointer',
                    position: 'relative',
                    flex: '0 0 76px',
                    width: 76,
                    scrollSnapAlign: 'start',
                  }}
                >
                  <div style={{
                    width: 42, height: 42, borderRadius: 14,
                    background: alert ? 'rgba(244,67,54,0.18)' : a.color + '20',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <a.icon size={18} color={alert ? '#F44336' : a.color} />
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 700,
                    color: alert ? '#F44336' : c.text,
                    textAlign: 'center', lineHeight: 1.2,
                  }}>
                    {a.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

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
