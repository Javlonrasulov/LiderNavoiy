import { useEffect, useMemo, useState } from 'react'
import { Search } from '../icons'
import { fetchAdminDashboard, fetchDistributors } from '../api/manager'
import type { Distributor, EmployeeLocation } from '../api/types'
import type { Translations } from '../i18n'
import { theme } from '../theme'

type Filter = 'all' | 'agent' | 'delivery'

interface Props {
  dark: boolean
  tr: Translations
}

function isDelivery(d: Distributor, loc?: EmployeeLocation) {
  if (loc) return loc.role === 'delivery'
  const p = (d.position || '').toLowerCase()
  return p.includes('dostav') || p.includes('delivery') || p.includes('yetkaz') || p.includes('курьер')
}

export default function StaffScreen({ dark, tr }: Props) {
  const c = theme(dark)
  const [list, setList] = useState<Distributor[]>([])
  const [locs, setLocs] = useState<EmployeeLocation[]>([])
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
        setList(Array.isArray(d) ? d : [])
        setLocs(dash?.employeeLocations ?? [])
      } catch {
        setList([])
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

  const filtered = list.filter(d => {
    const loc = locMap.get(d.id)
    const delivery = isDelivery(d, loc)
    if (filter === 'agent' && delivery) return false
    if (filter === 'delivery' && !delivery) return false
    const name = d.user?.fullName || d.fullName || d.name || ''
    const hay = `${name} ${d.phone || ''} ${d.lineCode || ''} ${d.companyName || ''}`.toLowerCase()
    return hay.includes(q.trim().toLowerCase())
  })

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
          return (
            <div key={d.id} className="card-hover" style={{
              borderRadius: 20, padding: 16, background: c.card, border: `1px solid ${c.border}`,
            }}>
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
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 800, padding: '4px 8px', borderRadius: 99,
                  background: online ? c.green + '22' : c.muted, color: online ? c.green : c.mutedText,
                }}>
                  {online ? tr.online : tr.offline}
                </span>
              </div>
              {(d.phone || loc?.lat) && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${c.border}`, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: 12, color: c.mutedText }}>{d.phone || '—'}</span>
                  <span style={{ fontSize: 11, color: c.mutedText, fontWeight: 600 }}>
                    {loc?.lat != null ? `${loc.lat.toFixed(4)}, ${loc.lng?.toFixed(4)}` : tr.noLocation}
                  </span>
                </div>
              )}
            </div>
          )
        })}

        {!loading && filtered.length === 0 && (
          <p style={{ textAlign: 'center', color: c.mutedText, padding: 32 }}>{tr.noData}</p>
        )}
      </div>
    </div>
  )
}
