import { useEffect, useState } from 'react'
import { PenSquare, Plus, Search } from '../icons'
import { fetchClients } from '../api/manager'
import type { Client } from '../api/types'
import type { Lang, Translations } from '../i18n'
import { formatMoney, theme } from '../theme'
import ClientStatsPanel from '../components/ClientStatsPanel'
import { pushBackHandler } from '../utils/hardwareBack'

interface Props {
  dark: boolean
  lang: Lang
  tr: Translations
  onAdd: () => void
  onEdit: (client: Client) => void
}

export default function ClientsScreen({ dark, lang, tr, onAdd, onEdit }: Props) {
  const c = theme(dark)
  const [list, setList] = useState<Client[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Client | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const data = await fetchClients()
      setList(Array.isArray(data) ? data : [])
    } catch {
      setList([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  useEffect(() => {
    return pushBackHandler(() => {
      if (selected) {
        setSelected(null)
        return true
      }
      return false
    })
  }, [selected])

  const filtered = list.filter(cl => {
    const hay = `${cl.name} ${cl.fullName || ''} ${cl.phone || ''} ${cl.code || ''}`.toLowerCase()
    return hay.includes(q.trim().toLowerCase())
  })

  return (
    <div style={{ width: '100%', height: '100%', overflowY: 'auto', background: c.bg, paddingBottom: 'calc(100px + var(--safe-bottom))' }} className="no-scrollbar">
      <div style={{
        padding: 'var(--header-pad-top) max(20px, var(--safe-left)) 12px max(20px, var(--safe-right))',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: c.text, flex: 1 }}>{tr.clientsNav}</h1>
        <button type="button" className="btn-primary" onClick={onAdd}
          style={{ height: 40, padding: '0 14px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <Plus size={16} color="white" />
          {tr.addClient}
        </button>
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

        {loading && <p style={{ textAlign: 'center', color: c.mutedText, padding: 24 }}>{tr.loading}</p>}

        {!loading && filtered.map(cl => (
          <div
            key={cl.id}
            role="button"
            tabIndex={0}
            className="card-hover"
            onClick={() => setSelected(cl)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') setSelected(cl)
            }}
            style={{
              borderRadius: 20, padding: 16, background: c.card, border: `1px solid ${c.border}`,
              textAlign: 'left', cursor: 'pointer', width: '100%',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{
                  fontSize: 18, fontWeight: 800, color: c.primary, lineHeight: 1.25,
                  letterSpacing: '-0.02em',
                }}>
                  {cl.name}
                </p>
                {cl.fullName && cl.fullName !== cl.name && (
                  <p style={{ fontSize: 12, color: c.mutedText, marginTop: 3 }}>{cl.fullName}</p>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, flexShrink: 0 }}>
                {cl.code && (
                  <span style={{
                    fontSize: 11, fontWeight: 800, color: c.primary,
                    background: 'rgba(108,92,231,0.12)', padding: '4px 8px',
                    borderRadius: 8, height: 'fit-content',
                  }}>
                    {cl.code}
                  </span>
                )}
                <button
                  type="button"
                  title={tr.editClient}
                  aria-label={tr.editClient}
                  onClick={e => {
                    e.stopPropagation()
                    onEdit(cl)
                  }}
                  style={{
                    width: 34, height: 34, borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: 'rgba(108,92,231,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}
                >
                  <PenSquare size={15} color={c.primary} />
                </button>
              </div>
            </div>
            <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <Meta label={tr.phone} value={cl.phone || '—'} muted={c.mutedText} text={c.text} />
              <Meta label={tr.line} value={cl.lineCode || '—'} muted={c.mutedText} text={c.text} />
              <Meta label={tr.address} value={cl.address || '—'} muted={c.mutedText} text={c.text} />
              <Meta
                label={tr.debt}
                value={cl.debt != null ? formatMoney(cl.debt, lang) : '—'}
                muted={c.mutedText}
                text={c.red}
              />
            </div>
          </div>
        ))}

        {!loading && filtered.length === 0 && (
          <p style={{ textAlign: 'center', color: c.mutedText, padding: 32 }}>{tr.noData}</p>
        )}
      </div>

      {selected && (
        <ClientStatsPanel
          client={selected}
          dark={dark}
          lang={lang}
          tr={tr}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}

function Meta({ label, value, muted, text }: { label: string; value: string; muted: string; text: string }) {
  return (
    <div>
      <p style={{ fontSize: 10, color: muted, fontWeight: 600 }}>{label}</p>
      <p style={{ fontSize: 12, color: text, fontWeight: 700, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</p>
    </div>
  )
}
