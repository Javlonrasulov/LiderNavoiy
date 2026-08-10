import { useEffect, useState } from 'react'
import { fetchPlans } from '../api/manager'
import type { AuthUser, PlanRow } from '../api/types'
import type { Lang, Translations } from '../i18n'
import { formatMoney, formatPct, theme } from '../theme'
import { managerCompanyId } from '../utils/staffScope'

interface Props {
  dark: boolean
  lang: Lang
  tr: Translations
  user?: AuthUser | null
}

export default function PlanScreen({ dark, lang, tr, user }: Props) {
  const c = theme(dark)
  const companyId = managerCompanyId(user)
  const [list, setList] = useState<PlanRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      try {
        const data = await fetchPlans(undefined, undefined, companyId)
        setList(Array.isArray(data) ? data : [])
      } catch {
        setList([])
      } finally {
        setLoading(false)
      }
    })()
  }, [companyId])

  const totals = list.reduce(
    (acc, r) => {
      acc.plan += r.totalPlan || 0
      acc.done += r.totalDone || 0
      return acc
    },
    { plan: 0, done: 0 },
  )
  const pct = totals.plan > 0 ? (totals.done / totals.plan) * 100 : 0

  return (
    <div style={{ width: '100%', height: '100%', overflowY: 'auto', background: c.bg, paddingBottom: 'calc(100px + var(--safe-bottom))' }} className="no-scrollbar">
      <div style={{ padding: 'var(--header-pad-top) max(20px, var(--safe-left)) 12px max(20px, var(--safe-right))' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: c.text }}>{tr.planNav}</h1>
        <p style={{ fontSize: 12, color: c.mutedText, marginTop: 4 }}>
          {new Date().toLocaleString(lang === 'ru' ? 'ru-RU' : 'uz-UZ', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{
          borderRadius: 28, padding: 20, position: 'relative', overflow: 'hidden',
          background: c.hero, boxShadow: '0 16px 48px rgba(108,92,231,0.35)',
        }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 10px)' }} />
          <div style={{ position: 'relative' }}>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, fontWeight: 700 }}>{tr.totalPlan}</p>
            <h2 style={{ color: 'white', fontSize: 26, fontWeight: 900, margin: '6px 0 14px' }}>
              {loading ? '—' : formatMoney(totals.plan, lang)}
            </h2>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>{tr.totalDone}</span>
              <span style={{ color: 'white', fontSize: 13, fontWeight: 800 }}>{formatPct(pct)}</span>
            </div>
            <div style={{ height: 8, borderRadius: 99, background: 'rgba(255,255,255,0.2)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, borderRadius: 99, background: 'linear-gradient(90deg, #FFFFFF, #E6963C)' }} />
            </div>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 10, fontWeight: 600 }}>
              {loading ? '—' : formatMoney(totals.done, lang)}
            </p>
          </div>
        </div>

        {loading && <p style={{ textAlign: 'center', color: c.mutedText, padding: 24 }}>{tr.loading}</p>}

        {!loading && list.map(row => (
          <div key={`${row.distributorId}-${row.year}-${row.month}`} className="card-hover" style={{
            borderRadius: 20, padding: 16, background: c.card, border: `1px solid ${c.border}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
              <p style={{ fontSize: 15, fontWeight: 800, color: c.text }}>{row.agentName}</p>
              <span style={{ fontSize: 14, fontWeight: 900, color: c.primary }}>{formatPct(row.donePct)}</span>
            </div>
            <div style={{ height: 6, borderRadius: 99, background: c.muted, overflow: 'hidden', marginBottom: 12 }}>
              <div style={{
                height: '100%', width: `${Math.min(100, row.donePct || 0)}%`, borderRadius: 99,
                background: 'linear-gradient(90deg, #6C5CE7, #E6963C)',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: c.mutedText }}>{tr.totalPlan}: <b style={{ color: c.text }}>{formatMoney(row.totalPlan, lang)}</b></span>
              <span style={{ fontSize: 12, color: c.mutedText }}>{tr.totalDone}: <b style={{ color: c.text }}>{formatMoney(row.totalDone, lang)}</b></span>
            </div>
            {(row.categories?.length ?? 0) > 0 && (
              <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {row.categories!.slice(0, 4).map(cat => (
                  <span key={cat.key} style={{
                    fontSize: 10, fontWeight: 700, padding: '4px 8px', borderRadius: 8,
                    background: (cat.color || '#6C5CE7') + '22', color: cat.color || c.primary,
                  }}>
                    {cat.name} {formatPct(cat.pct)}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}

        {!loading && list.length === 0 && (
          <p style={{ textAlign: 'center', color: c.mutedText, padding: 32 }}>{tr.noData}</p>
        )}
      </div>
    </div>
  )
}
