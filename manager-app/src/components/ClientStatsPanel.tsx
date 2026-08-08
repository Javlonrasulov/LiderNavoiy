import { useEffect, useMemo, useState } from 'react'
import {
  ArrowUpRight,
  BarChart3,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Package,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  X,
} from '../icons'
import { fetchClientStats } from '../api/manager'
import type {
  Client,
  ClientStatsCategory,
  ClientStatsPeriod,
  ClientStatsProduct,
  ClientStatsResponse,
} from '../api/types'
import type { Lang, Translations } from '../i18n'
import { theme } from '../theme'
import DateRangePicker from './DateRangePicker'

type BuyFilter = 'all' | 'top' | 'avg' | 'none'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function monthStartIso() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}

function fmtNum(n: number, digits = 0) {
  return n.toLocaleString('ru-RU', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits > 0 ? Math.min(digits, 1) : 0,
  })
}

function MonthlyTrendChart({
  data,
  dark,
  muted,
}: {
  data: { label: string; value: number }[]
  dark: boolean
  muted: string
}) {
  if (!data.length || data.every(d => d.value === 0)) {
    return (
      <div style={{ padding: '28px 16px', textAlign: 'center', fontSize: 13, color: muted }}>
        —
      </div>
    )
  }

  const W = 600
  const H = 140
  const padL = 28
  const padR = 28
  const padT = 46
  const padB = 22
  const chartW = W - padL - padR
  const chartH = H - padT - padB
  const maxV = Math.max(...data.map(d => d.value))
  const minV = Math.min(...data.map(d => d.value))
  const range = maxV - minV || 1
  const pts = data.map((d, i) => ({
    x: padL + (data.length === 1 ? chartW / 2 : (i / (data.length - 1)) * chartW),
    y: padT + chartH - ((d.value - minV) / range) * chartH,
    ...d,
  }))
  const linePath = pts.map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`)).join(' ')
  const areaPath = `${linePath} L ${pts[pts.length - 1].x},${H - padB} L ${pts[0].x},${H - padB} Z`
  const first = data[0].value || 1
  const overallTrend = ((data[data.length - 1].value - data[0].value) / first) * 100
  const trendUp = overallTrend >= 0
  const accent = trendUp ? '#00C853' : '#F44336'
  const grid = dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
  const labelColor = dark ? '#6b7280' : '#9ca3af'
  const gradId = `mg-${data.map(d => d.label).join('')}`

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {trendUp ? <TrendingUp size={12} color="#00C853" /> : <TrendingDown size={12} color="#F44336" />}
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: muted }}>
            Oylik trend
          </span>
        </div>
        <span style={{ fontSize: 12, fontWeight: 800, color: accent }}>
          {trendUp ? '+' : ''}{overallTrend.toFixed(1)}%
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, display: 'block' }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.2" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((t, i) => (
          <line key={i} x1={0} y1={padT + t * chartH} x2={W} y2={padT + t * chartH} stroke={grid} strokeWidth={1} />
        ))}
        <path d={areaPath} fill={`url(#${gradId})`} />
        <path d={linePath} fill="none" stroke={accent} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => {
          const prevVal = i > 0 ? data[i - 1].value : null
          const pct = prevVal && prevVal > 0 ? ((p.value - prevVal) / prevVal) * 100 : null
          const pctColor = pct === null ? labelColor : pct >= 0 ? '#00C853' : '#F44336'
          const sumStr = p.value >= 1_000_000
            ? `${(p.value / 1_000_000).toFixed(1)}M`
            : p.value >= 1_000
              ? `${(p.value / 1_000).toFixed(0)}K`
              : `${Math.round(p.value)}`
          const pctStr = pct !== null ? `${pct >= 0 ? '+' : ''}${pct.toFixed(0)}%` : ''
          const lx = Math.max(30, Math.min(W - 30, p.x))
          return (
            <g key={i}>
              <text x={lx} y={p.y - 18} textAnchor="middle" fontSize={10} fontWeight="bold" fill={accent}>{sumStr}</text>
              {pctStr && <text x={lx} y={p.y - 6} textAnchor="middle" fontSize={9} fill={pctColor}>{pctStr}</text>}
              <circle cx={p.x} cy={p.y} r={3.5} fill={dark ? '#13132A' : '#fff'} stroke={accent} strokeWidth={2} />
              <text x={p.x} y={H - 5} textAnchor="middle" fontSize={9} fill={labelColor}>{p.label}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function DonutChart({ cats, dark }: { cats: ClientStatsCategory[]; dark: boolean }) {
  const r = 44
  const cx = 56
  const cy = 56
  const circ = 2 * Math.PI * r
  let offset = 0
  const segments = cats.map(c => {
    const dash = (c.share / 100) * circ
    const gap = circ - dash
    const seg = { ...c, dash, gap, offset }
    offset += dash
    return seg
  })
  return (
    <svg viewBox="0 0 112 112" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={dark ? '#1f1f3a' : '#f3f4f6'} strokeWidth={14} />
      {segments.map(s => (
        <circle
          key={s.id}
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={s.color}
          strokeWidth={14}
          strokeDasharray={`${s.dash} ${s.gap}`}
          strokeDashoffset={-s.offset}
        />
      ))}
    </svg>
  )
}

function WeeklyBars({ bars, color, dark }: { bars: { label: string; value: number }[]; color: string; dark: boolean }) {
  if (!bars.length || bars.every(b => b.value === 0)) {
    return (
      <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 12, color: dark ? '#6b7280' : '#9ca3af' }}>
        —
      </div>
    )
  }
  const maxV = Math.max(...bars.map(b => b.value), 1)
  return (
    <svg viewBox="0 0 210 72" style={{ width: '100%', height: 72 }}>
      {bars.map((b, i) => {
        const h = (b.value / maxV) * 48
        const x = 4 + i * 29
        const y = 52 - h
        return (
          <g key={i}>
            <rect x={x} y={y} width={20} height={Math.max(h, 2)} rx={5} fill={color} opacity={i === bars.length - 1 ? 1 : 0.35} />
            <text x={x + 10} y={68} textAnchor="middle" fontSize={9} fill={dark ? '#6b7280' : '#9ca3af'}>{b.label}</text>
          </g>
        )
      })}
    </svg>
  )
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div style={{ width: '100%', height: 6, borderRadius: 99, overflow: 'hidden', background: `${color}22` }}>
      <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99, background: color }} />
    </div>
  )
}

interface Props {
  client: Client
  dark: boolean
  lang: Lang
  tr: Translations
  onClose: () => void
}

export default function ClientStatsPanel({ client, dark, lang, tr, onClose }: Props) {
  const c = theme(dark)
  const [period, setPeriod] = useState<ClientStatsPeriod>('oy')
  const [buyFilter, setBuyFilter] = useState<BuyFilter>('all')
  const [selectedCat, setSelectedCat] = useState<ClientStatsCategory | null>(null)
  const [customFrom, setCustomFrom] = useState(monthStartIso())
  const [customTo, setCustomTo] = useState(todayIso())
  const [stats, setStats] = useState<ClientStatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setSelectedCat(null)

    const params: { period: ClientStatsPeriod; from?: string; to?: string } = { period }
    if (period === 'custom') {
      params.from = customFrom
      params.to = customTo
    }

    fetchClientStats(client.id, params)
      .then(data => { if (!cancelled) setStats(data) })
      .catch(e => {
        if (!cancelled) {
          setStats(null)
          setError(e instanceof Error ? e.message : String(e))
        }
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [client.id, period, customFrom, customTo])

  useEffect(() => {
    if (!selectedCat || !stats) return
    const fresh = stats.categories.find(x => x.id === selectedCat.id)
    if (fresh) setSelectedCat(fresh)
    else setSelectedCat(null)
  }, [stats]) // eslint-disable-line react-hooks/exhaustive-deps

  const categories = stats?.categories ?? []
  const monthlyTrend = stats?.monthlyTrend ?? []
  const totalSum = stats?.totalSum ?? 0
  const totalKg = stats?.totalKg ?? 0

  const products = useMemo(() => selectedCat?.products ?? [], [selectedCat])
  const filteredProducts = products.filter(p =>
    buyFilter === 'all' ? true :
    buyFilter === 'top' ? p.buyLevel === 'top' :
    buyFilter === 'avg' ? p.buyLevel === 'avg' :
    p.buyLevel === 'none',
  )

  const PERIODS: { key: ClientStatsPeriod; label: string }[] = [
    { key: 'hafta', label: tr.statHafta },
    { key: 'oy', label: tr.statOy },
    { key: '6oy', label: tr.stat6Oy },
    { key: 'custom', label: tr.statCustom },
  ]

  const BUY_FILTERS: { key: BuyFilter; label: string }[] = [
    { key: 'all', label: tr.statAll },
    { key: 'top', label: tr.statTop },
    { key: 'avg', label: tr.statAvg },
    { key: 'none', label: tr.statNone },
  ]

  const cardBg = dark ? '#1a1a32' : '#F8F9FC'
  const softBorder = c.border

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 80,
      background: c.bg,
      display: 'flex', flexDirection: 'column',
      paddingTop: 'var(--safe-top)',
      paddingBottom: 'var(--safe-bottom)',
    }}>
      <div style={{
        flexShrink: 0,
        padding: '12px max(16px, var(--safe-right)) 12px max(16px, var(--safe-left))',
        borderBottom: `1px solid ${softBorder}`,
        background: dark ? '#0d0d1c' : '#F1F2F8',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          {selectedCat ? (
            <button
              type="button"
              onClick={() => setSelectedCat(null)}
              style={{
                width: 36, height: 36, borderRadius: 12, border: 'none', cursor: 'pointer',
                background: c.muted, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <ChevronLeft size={16} color={c.text} />
            </button>
          ) : (
            <div style={{
              width: 40, height: 40, borderRadius: 14,
              background: 'rgba(108,92,231,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <BarChart3 size={18} color={c.primary} />
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontSize: 17, fontWeight: 800, color: c.text,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {selectedCat ? `${selectedCat.icon} ${selectedCat.name}` : client.name}
            </p>
            <p style={{ fontSize: 12, color: c.mutedText, marginTop: 2 }}>
              {selectedCat ? tr.statProdAnalysis : tr.statTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 36, height: 36, borderRadius: 12, border: 'none', cursor: 'pointer',
              background: c.muted, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={16} color={c.mutedText} />
          </button>
        </div>

        <div style={{
          display: 'flex', gap: 4, padding: 4, borderRadius: 14,
          background: dark ? '#13132A' : '#FFFFFF',
          border: `1px solid ${softBorder}`,
        }}>
          {PERIODS.map(p => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              style={{
                flex: 1, minWidth: 0, height: 34, borderRadius: 10, border: 'none', cursor: 'pointer',
                fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                background: period === p.key ? c.primary : 'transparent',
                color: period === p.key ? '#fff' : c.mutedText,
              }}
            >
              {p.key === 'custom' && <Calendar size={11} color={period === p.key ? '#fff' : c.mutedText} />}
              {p.label}
            </button>
          ))}
        </div>

        {period === 'custom' && (
          <DateRangePicker
            from={customFrom}
            to={customTo}
            onChange={(f, t2) => { setCustomFrom(f); setCustomTo(t2) }}
            dark={dark}
            lang={lang}
            tr={tr}
          />
        )}
      </div>

      <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '16px max(16px, var(--safe-right)) 24px max(16px, var(--safe-left))' }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: c.mutedText, padding: 40 }}>{tr.loading}</p>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: 32 }}>
            <p style={{ color: c.red, fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{error}</p>
            <p style={{ color: c.mutedText, fontSize: 12 }}>{tr.statLoadError}</p>
          </div>
        ) : !selectedCat ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ borderRadius: 18, padding: '14px 16px', background: cardBg, border: `1px solid ${softBorder}` }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: c.mutedText }}>{tr.statTotal}</p>
                <p style={{ fontSize: 20, fontWeight: 800, color: c.text, marginTop: 4 }}>{fmtNum(totalSum)}</p>
                <p style={{ fontSize: 11, color: c.mutedText }}>so'm</p>
              </div>
              <div style={{ borderRadius: 18, padding: '14px 16px', background: cardBg, border: `1px solid ${softBorder}` }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: c.mutedText }}>{tr.statWeight}</p>
                <p style={{ fontSize: 20, fontWeight: 800, color: c.text, marginTop: 4 }}>{fmtNum(totalKg, 1)}</p>
                <p style={{ fontSize: 11, color: c.mutedText }}>kg</p>
              </div>
            </div>

            <div style={{ borderRadius: 18, padding: 16, background: cardBg, border: `1px solid ${softBorder}` }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: c.mutedText, marginBottom: 12 }}>{tr.statCatShare}</p>
              {categories.length === 0 ? (
                <p style={{ textAlign: 'center', color: c.mutedText, fontSize: 13, padding: 16 }}>{tr.statNoSales}</p>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 96, height: 96, position: 'relative', flexShrink: 0 }}>
                    <DonutChart cats={categories} dark={dark} />
                    <div style={{
                      position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: c.mutedText }}>{tr.statCats}</span>
                      <span style={{ fontSize: 18, fontWeight: 800, color: c.text }}>{categories.length}</span>
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {categories.map(cat => (
                      <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 99, background: cat.color, flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: 12, color: c.mutedText, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.name}</span>
                        <span style={{ fontSize: 12, fontWeight: 800, color: c.text }}>{cat.share}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ borderRadius: 18, overflow: 'hidden', background: cardBg, border: `1px solid ${softBorder}` }}>
              <MonthlyTrendChart data={monthlyTrend} dark={dark} muted={c.mutedText} />
            </div>

            <div>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: c.mutedText, marginBottom: 8 }}>
                {tr.statCatDetail}
              </p>
              {categories.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 28, borderRadius: 18, border: `1px solid ${softBorder}`, color: c.mutedText, fontSize: 13 }}>
                  {tr.statNoOrders}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {categories.map((cat, i) => {
                    const maxSum = categories[0].totalSum
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCat(cat)}
                        style={{
                          width: '100%', textAlign: 'left', borderRadius: 18, padding: '12px 14px',
                          border: `1px solid ${softBorder}`, background: c.card, cursor: 'pointer',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                          <div style={{ display: 'flex', gap: 10, minWidth: 0 }}>
                            <div style={{
                              width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                              background: `${cat.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 18,
                            }}>
                              {cat.icon}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <p style={{ fontSize: 14, fontWeight: 700, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.name}</p>
                                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 6, background: c.muted, color: c.mutedText }}>#{i + 1}</span>
                              </div>
                              <p style={{ fontSize: 11, color: c.mutedText, marginTop: 2 }}>
                                {fmtNum(cat.totalKg, 1)} kg · {fmtNum(cat.avgPrice)} so'm/kg
                              </p>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <p style={{ fontSize: 13, fontWeight: 800, color: c.text }}>{fmtNum(cat.totalSum)}</p>
                            <div style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2,
                              fontSize: 11, fontWeight: 700, color: cat.trend >= 0 ? c.green : c.red,
                            }}>
                              {cat.trend >= 0 ? <TrendingUp size={10} color={c.green} /> : <TrendingDown size={10} color={c.red} />}
                              {cat.trend >= 0 ? '+' : ''}{cat.trend}%
                            </div>
                          </div>
                        </div>
                        <MiniBar value={cat.totalSum} max={maxSum} color={cat.color} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                          <span style={{ fontSize: 10, color: c.mutedText }}>{cat.share}% {tr.statShare}</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 11, fontWeight: 700, color: c.primary }}>
                            {tr.statDetail} <ChevronRight size={10} color={c.primary} />
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <CategoryDetail
            cat={selectedCat}
            monthlyTrend={monthlyTrend}
            products={products}
            filteredProducts={filteredProducts}
            buyFilter={buyFilter}
            setBuyFilter={setBuyFilter}
            buyFilters={BUY_FILTERS}
            dark={dark}
            c={c}
            cardBg={cardBg}
            softBorder={softBorder}
            tr={tr}
          />
        )}
      </div>
    </div>
  )
}

function CategoryDetail({
  cat,
  monthlyTrend,
  products,
  filteredProducts,
  buyFilter,
  setBuyFilter,
  buyFilters,
  dark,
  c,
  cardBg,
  softBorder,
  tr,
}: {
  cat: ClientStatsCategory
  monthlyTrend: { label: string; value: number }[]
  products: ClientStatsProduct[]
  filteredProducts: ClientStatsProduct[]
  buyFilter: BuyFilter
  setBuyFilter: (f: BuyFilter) => void
  buyFilters: { key: BuyFilter; label: string }[]
  dark: boolean
  c: ReturnType<typeof theme>
  cardBg: string
  softBorder: string
  tr: Translations
}) {
  const maxQty = Math.max(...products.filter(x => x.buyLevel !== 'none').map(x => x.qty), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{
        borderRadius: 18, padding: '12px 14px', background: cardBg, border: `1px solid ${softBorder}`,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 14, flexShrink: 0, fontSize: 22,
          background: `${cat.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {cat.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <p style={{ fontSize: 14, fontWeight: 800, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.name}</p>
            <p style={{ fontSize: 14, fontWeight: 800, color: c.text, flexShrink: 0 }}>{fmtNum(cat.totalSum)}</p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 4 }}>
            <span style={{ fontSize: 11, color: c.mutedText }}>{fmtNum(cat.totalKg, 1)} kg</span>
            <span style={{ fontSize: 11, color: c.mutedText }}>{fmtNum(cat.avgPrice)} so'm/kg</span>
            <span style={{
              fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 2,
              color: cat.trend >= 0 ? c.green : c.red,
            }}>
              {cat.trend >= 0 ? <TrendingUp size={9} color={c.green} /> : <TrendingDown size={9} color={c.red} />}
              {cat.trend >= 0 ? '+' : ''}{cat.trend}%
            </span>
          </div>
        </div>
      </div>

      <div style={{ borderRadius: 18, overflow: 'hidden', background: cardBg, border: `1px solid ${softBorder}` }}>
        <MonthlyTrendChart data={monthlyTrend} dark={dark} muted={c.mutedText} />
      </div>

      <div style={{ borderRadius: 18, padding: '12px 14px 8px', background: cardBg, border: `1px solid ${softBorder}` }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: c.mutedText, marginBottom: 8 }}>
          {tr.statWeekly}
        </p>
        <WeeklyBars bars={cat.weekly} color={cat.color} dark={dark} />
      </div>

      <div>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: c.mutedText, marginBottom: 8 }}>
          {tr.statFilter}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {buyFilters.map(f => {
            const active = buyFilter === f.key
            const activeStyle =
              f.key === 'top' ? { bg: 'rgba(0,200,83,0.15)', border: 'rgba(0,200,83,0.45)', color: c.green } :
              f.key === 'avg' ? { bg: 'rgba(230,150,60,0.15)', border: 'rgba(230,150,60,0.45)', color: c.gold } :
              f.key === 'none' ? { bg: 'rgba(244,67,54,0.15)', border: 'rgba(244,67,54,0.45)', color: c.red } :
              { bg: c.primary, border: c.primary, color: '#fff' }
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setBuyFilter(f.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '6px 12px', borderRadius: 99, cursor: 'pointer',
                  fontSize: 12, fontWeight: 700, border: `1px solid ${active ? activeStyle.border : softBorder}`,
                  background: active ? activeStyle.bg : c.muted,
                  color: active ? activeStyle.color : c.mutedText,
                }}
              >
                {f.key === 'top' && <ArrowUpRight size={10} color={active ? c.green : c.mutedText} />}
                {f.key === 'avg' && <ShoppingCart size={10} color={active ? c.gold : c.mutedText} />}
                {f.key === 'none' && <Package size={10} color={active ? c.red : c.mutedText} />}
                {f.label}
                {f.key !== 'all' && (
                  <span style={{ fontSize: 10, opacity: 0.7 }}>
                    ({products.filter(p => p.buyLevel === f.key).length})
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: c.mutedText, marginBottom: 8 }}>
          {tr.statProducts} ({filteredProducts.length})
        </p>
        {filteredProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 36, borderRadius: 18, border: `1px solid ${softBorder}`, color: c.mutedText, fontSize: 13 }}>
            {tr.noData}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredProducts.map(p => (
              <div
                key={p.id}
                style={{
                  borderRadius: 18, padding: '12px 14px',
                  border: `1px solid ${softBorder}`,
                  background: p.buyLevel === 'none' ? (dark ? '#0f0f1c' : '#F8F9FC') : c.card,
                  opacity: p.buyLevel === 'none' ? 0.55 : 1,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                  <div style={{ display: 'flex', gap: 8, minWidth: 0 }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: 8, flexShrink: 0, marginTop: 2,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background:
                        p.buyLevel === 'top' ? 'rgba(0,200,83,0.2)' :
                        p.buyLevel === 'avg' ? 'rgba(230,150,60,0.2)' :
                        c.muted,
                    }}>
                      {p.buyLevel === 'top' && <ArrowUpRight size={10} color={c.green} />}
                      {p.buyLevel === 'avg' && <ShoppingCart size={10} color={c.gold} />}
                      {p.buyLevel === 'none' && <Package size={10} color={c.mutedText} />}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{
                        fontSize: 12, fontWeight: 700, lineHeight: 1.35,
                        color: p.buyLevel === 'none' ? c.mutedText : c.text,
                      }}>
                        {p.name}
                      </p>
                      <p style={{ fontSize: 11, color: c.mutedText, marginTop: 2 }}>
                        {p.buyLevel === 'none'
                          ? tr.statNotBought
                          : `${fmtNum(p.qty)} ${p.unit} · ${fmtNum(p.price)} so'm/${p.unit}`}
                      </p>
                    </div>
                  </div>
                  {p.buyLevel !== 'none' ? (
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 800, color: c.text }}>{fmtNum(p.total)}</p>
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2,
                        fontSize: 11, fontWeight: 700, color: p.trend >= 0 ? c.green : c.red,
                      }}>
                        {p.trend >= 0 ? <TrendingUp size={9} color={c.green} /> : <TrendingDown size={9} color={c.red} />}
                        {p.trend >= 0 ? '+' : ''}{p.trend}%
                      </div>
                    </div>
                  ) : (
                    <span style={{
                      fontSize: 10, padding: '2px 8px', borderRadius: 99, height: 'fit-content',
                      border: `1px solid ${softBorder}`, color: c.mutedText,
                    }}>
                      0
                    </span>
                  )}
                </div>
                {p.buyLevel !== 'none' && (
                  <div style={{
                    width: '100%', height: 4, borderRadius: 99, overflow: 'hidden',
                    background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                  }}>
                    <div style={{
                      height: '100%', borderRadius: 99, background: cat.color,
                      width: `${Math.min(100, (p.qty / maxQty) * 100)}%`,
                    }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
