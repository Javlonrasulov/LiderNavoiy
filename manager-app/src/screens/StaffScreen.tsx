import { useEffect, useMemo, useState } from 'react'
import { ChevronRight, Search } from '../icons'
import {
  fetchAdminDashboard,
  fetchDistributors,
  fetchVisitsForDistributor,
} from '../api/manager'
import type { Distributor, EmployeeLocation } from '../api/types'
import type { Translations } from '../i18n'
import { theme } from '../theme'
import { firstOnSiteOrderMs, todayLocal } from '../utils/dayTrack'

type Filter = 'all' | 'agent' | 'delivery'

interface Props {
  dark: boolean
  tr: Translations
  onSelectEmployee: (d: Distributor, loc?: EmployeeLocation) => void
}

function isDelivery(d: Distributor, loc?: EmployeeLocation) {
  if (loc) return loc.role === 'delivery'
  const p = (d.position || '').toLowerCase()
  return p.includes('dostav') || p.includes('delivery') || p.includes('yetkaz') || p.includes('курьер')
}

function formatLastSeen(date: string | Date | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  if (Number.isNaN(d.getTime())) return '—'
  const mins = Math.floor((Date.now() - d.getTime()) / 60_000)
  if (mins < 1) return 'hozir'
  if (mins < 60) return `${mins} daqiqa oldin`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} soat oldin`
  return d.toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function formatClockMs(ms: number | null | undefined): string | null {
  if (ms == null) return null
  const d = new Date(ms)
  if (Number.isNaN(d.getTime())) return null
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function StaffScreen({ dark, tr, onSelectEmployee }: Props) {
  const c = theme(dark)
  const [list, setList] = useState<Distributor[]>([])
  const [locs, setLocs] = useState<EmployeeLocation[]>([])
  const [firstOrderMs, setFirstOrderMs] = useState<Record<string, number | null>>({})
  const [filter, setFilter] = useState<Filter>('all')
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      try {
        const [d, dash] = await Promise.all([
          fetchDistributors(),
          fetchAdminDashboard().catch(() => null),
        ])
        const distributors = Array.isArray(d) ? d : []
        setList(distributors)
        setLocs(dash?.employeeLocations ?? [])

        const date = todayLocal()
        const entries = await Promise.all(
          distributors.map(async dist => {
            try {
              const visits = await fetchVisitsForDistributor(dist.id, date)
              return [dist.id, firstOnSiteOrderMs(Array.isArray(visits) ? visits : [])] as const
            } catch {
              return [dist.id, null] as const
            }
          }),
        )
        const map: Record<string, number | null> = {}
        for (const [id, ms] of entries) map[id] = ms
        setFirstOrderMs(map)
      } catch {
        setList([])
        setFirstOrderMs({})
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const locMap = useMemo(() => {
    const m = new Map<string, EmployeeLocation>()
    locs.forEach(l => m.set(l.distributorId, l))
    return m
  }, [locs])

  const filtered = useMemo(() => {
    const rows = list.filter(d => {
      const loc = locMap.get(d.id)
      const delivery = isDelivery(d, loc)
      if (filter === 'agent' && delivery) return false
      if (filter === 'delivery' && !delivery) return false
      const name = d.user?.fullName || d.fullName || d.name || ''
      const hay = `${name} ${d.phone || ''} ${d.lineCode || ''} ${d.companyName || ''}`.toLowerCase()
      return hay.includes(q.trim().toLowerCase())
    })

    // Birinchi joyida zakaz olgan vaqt bo‘yicha yuqoridan pastga (telefon / ilova emas)
    return rows.slice().sort((a, b) => {
      const aMs = firstOrderMs[a.id]
      const bMs = firstOrderMs[b.id]
      if (aMs == null && bMs == null) {
        const an = a.user?.fullName || a.fullName || a.name || ''
        const bn = b.user?.fullName || b.fullName || b.name || ''
        return an.localeCompare(bn, 'uz')
      }
      if (aMs == null) return 1
      if (bMs == null) return -1
      return aMs - bMs
    })
  }, [list, locMap, filter, q, firstOrderMs])

  const tabs: { id: Filter; label: string }[] = [
    { id: 'all', label: tr.allStaff },
    { id: 'agent', label: tr.agents },
    { id: 'delivery', label: tr.delivery },
  ]

  return (
    <div style={{ width: '100%', height: '100%', overflowY: 'auto', background: c.bg, paddingBottom: 'calc(100px + var(--safe-bottom))' }} className="no-scrollbar">
      <div style={{ padding: 'var(--header-pad-top) max(20px, var(--safe-left)) 12px max(20px, var(--safe-right))' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: c.text }}>{tr.assignedStaff}</h1>
        <p style={{ fontSize: 12, color: c.mutedText, marginTop: 4 }}>{tr.agents} · {tr.delivery}</p>
        <p style={{ fontSize: 11, color: c.mutedText, marginTop: 6 }}>{tr.staffSortHint}</p>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, height: 48, padding: '0 14px',
          borderRadius: 16, background: c.card, border: `1px solid ${c.border}`,
        }}>
          <Search size={18} color={c.mutedText} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder={tr.search}
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: c.text, fontSize: 14, fontWeight: 600 }} />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {tabs.map(t => (
            <button key={t.id} type="button" onClick={() => setFilter(t.id)}
              style={{
                flex: 1, height: 38, borderRadius: 12, border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: 12,
                background: filter === t.id ? 'rgba(108,92,231,0.15)' : c.muted,
                color: filter === t.id ? c.primary : c.mutedText,
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {loading && <p style={{ textAlign: 'center', color: c.mutedText, padding: 24 }}>{tr.loading}</p>}

        {!loading && filtered.map(d => {
          const loc = locMap.get(d.id)
          const delivery = isDelivery(d, loc)
          const online = loc?.online ?? d.isOnline
          const name = d.user?.fullName || d.fullName || d.name || '—'
          const firstOrder = formatClockMs(firstOrderMs[d.id])
          return (
            <button
              key={d.id}
              type="button"
              className="card-hover"
              onClick={() => onSelectEmployee(d, loc)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                borderRadius: 20,
                padding: 16,
                background: c.card,
                border: `1px solid ${c.border}`,
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 16,
                  background: delivery ? 'rgba(230,150,60,0.18)' : 'rgba(108,92,231,0.18)',
                  color: delivery ? c.gold : c.primary,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 900, fontSize: 16, position: 'relative',
                }}>
                  {name.charAt(0).toUpperCase()}
                  <span style={{
                    position: 'absolute', bottom: 2, right: 2, width: 10, height: 10, borderRadius: '50%',
                    background: online ? c.green : c.mutedText, border: `2px solid ${c.card}`,
                  }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 15, fontWeight: 800, color: c.text }}>{name}</p>
                  <p style={{ fontSize: 12, color: c.mutedText, marginTop: 2 }}>
                    {delivery ? tr.delivery : tr.agents}
                    {d.lineCode ? ` · ${d.lineCode}` : ''}
                  </p>
                  {d.companyName && <p style={{ fontSize: 11, color: c.mutedText, marginTop: 2 }}>{d.companyName}</p>}
                  {firstOrder && (
                    <p style={{ fontSize: 11, color: c.green, marginTop: 4, fontWeight: 700 }}>
                      {tr.staffFirstOrderAt.replace('{time}', firstOrder)}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 800, padding: '4px 8px', borderRadius: 99,
                    background: online ? c.green + '22' : c.muted, color: online ? c.green : c.mutedText,
                  }}>
                    {online ? tr.online : tr.offline}
                  </span>
                  <ChevronRight size={16} color={c.mutedText} />
                </div>
              </div>
              {(d.phone || loc?.lastSeen || d.lastLocationAt) && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${c.border}`, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: 12, color: c.mutedText }}>{d.phone || '—'}</span>
                  <span style={{ fontSize: 11, color: c.mutedText, fontWeight: 600 }}>
                    {loc?.lastSeen || formatLastSeen(d.lastLocationAt)}
                  </span>
                </div>
              )}
            </button>
          )
        })}

        {!loading && filtered.length === 0 && (
          <p style={{ textAlign: 'center', color: c.mutedText, padding: 32 }}>{tr.noData}</p>
        )}
      </div>
    </div>
  )
}
