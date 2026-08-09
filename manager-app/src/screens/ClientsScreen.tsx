import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, ImageIcon, PenSquare, Plus, Search, X } from '../icons'
import {
  deleteClientRequest,
  fetchClientRequests,
  fetchClients,
  fetchLines,
  resolveMediaUrl,
  type ClientRequestRow,
  type SalesLine,
} from '../api/manager'
import { ApiError, getStoredUser } from '../api/client'
import type { Client } from '../api/types'
import type { Lang, Translations } from '../i18n'
import { localizeApiError } from '../i18n'
import { formatMoney, theme } from '../theme'
import ClientStatsPanel from '../components/ClientStatsPanel'
import { showToast } from '../components/Toast'
import { pushBackHandler } from '../utils/hardwareBack'

type ClientSort = 'all' | 'top_desc' | 'top_asc' | 'debt_desc' | 'debt_asc'

interface Props {
  dark: boolean
  lang: Lang
  tr: Translations
  onAdd: () => void
  onEdit: (client: Client) => void
  onEditRequest: (req: ClientRequestRow) => void
}

function clientDebt(cl: Client): number {
  return Number(cl.debt ?? 0) || 0
}

function statusStyle(status: ClientRequestRow['status'], dark: boolean) {
  if (status === 'pending') {
    return {
      bg: 'rgba(245, 158, 11, 0.16)',
      color: dark ? '#FBBF24' : '#B45309',
    }
  }
  if (status === 'approved') {
    return {
      bg: 'rgba(16, 185, 129, 0.16)',
      color: dark ? '#34D399' : '#047857',
    }
  }
  return {
    bg: 'rgba(239, 68, 68, 0.14)',
    color: dark ? '#FCA5A5' : '#B91C1C',
  }
}

export default function ClientsScreen({ dark, lang, tr, onAdd, onEdit, onEditRequest }: Props) {
  const c = theme(dark)
  const companyId = getStoredUser()?.companyId || undefined
  const [list, setList] = useState<Client[]>([])
  const [lines, setLines] = useState<SalesLine[]>([])
  const [requests, setRequests] = useState<ClientRequestRow[]>([])
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<ClientSort>('all')
  const [lineFilter, setLineFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Client | null>(null)
  const [photoClient, setPhotoClient] = useState<Client | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const photoSrc = photoClient?.photoUrl ? resolveMediaUrl(photoClient.photoUrl) : ''

  const lineNameByCode = useMemo(() => {
    const map = new Map<string, string>()
    for (const line of lines) {
      const code = line.code?.trim()
      if (!code) continue
      map.set(code, line.name?.trim() || code)
    }
    return map
  }, [lines])

  const agentNameByCode = useMemo(() => {
    const map = new Map<string, string>()
    for (const line of lines) {
      const code = line.code?.trim()
      const agent = line.agentName?.trim()
      if (!code || !agent) continue
      map.set(code, agent)
    }
    return map
  }, [lines])

  const resolveLineLabel = (code?: string | null) => {
    const key = code?.trim()
    if (!key) return '—'
    return lineNameByCode.get(key) || '—'
  }

  const resolveAgentLabel = (code?: string | null) => {
    const key = code?.trim()
    if (!key) return '—'
    return agentNameByCode.get(key) || '—'
  }

  const load = async () => {
    setLoading(true)
    try {
      const [data, reqs, lineRows] = await Promise.all([
        fetchClients(companyId),
        fetchClientRequests({ companyId, status: 'all' }).catch(() => [] as ClientRequestRow[]),
        fetchLines(companyId).catch(() => [] as SalesLine[]),
      ])
      setList(Array.isArray(data) ? data : [])
      setRequests(Array.isArray(reqs) ? reqs : [])
      setLines(Array.isArray(lineRows) ? lineRows : [])
    } catch {
      setList([])
      setRequests([])
      setLines([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [companyId])

  useEffect(() => {
    return pushBackHandler(() => {
      if (photoClient) {
        setPhotoClient(null)
        return true
      }
      if (selected) {
        setSelected(null)
        return true
      }
      return false
    })
  }, [selected, photoClient])

  const sortTabs: { id: ClientSort; label: string }[] = [
    { id: 'all', label: tr.clientSortAll },
    { id: 'top_desc', label: tr.clientSortTopDesc },
    { id: 'top_asc', label: tr.clientSortTopAsc },
    { id: 'debt_desc', label: tr.clientSortDebtDesc },
    { id: 'debt_asc', label: tr.clientSortDebtAsc },
  ]

  const lineOptions = useMemo(() => {
    const fromApi = lines
      .map(l => ({
        code: (l.code || '').trim(),
        name: (l.name || '').trim() || (l.code || '').trim(),
      }))
      .filter(l => l.code)
    const seen = new Set(fromApi.map(l => l.code))
    for (const cl of list) {
      const code = (cl.lineCode || '').trim()
      if (!code || seen.has(code)) continue
      seen.add(code)
      fromApi.push({ code, name: code })
    }
    return fromApi.sort((a, b) => a.name.localeCompare(b.name, 'uz'))
  }, [lines, list])

  const sortLabel = sortTabs.find(t => t.id === sort)?.label ?? tr.clientSortAll
  const lineFilterLabel = lineFilter
    ? (lineNameByCode.get(lineFilter) || lineFilter)
    : tr.clientFilterLineAll

  const visibleRequests = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return requests
      .filter(r => r.status === 'pending' || r.status === 'rejected')
      .filter(r => {
        if (!needle) return true
        const hay = `${r.name} ${r.fullName || ''} ${r.phone || ''} ${r.inn || ''}`.toLowerCase()
        return hay.includes(needle)
      })
      .slice(0, 40)
  }, [requests, q])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    let rows = list.filter(cl => {
      if (lineFilter && (cl.lineCode || '').trim() !== lineFilter) return false
      if (!needle) return true
      const hay = `${cl.name} ${cl.fullName || ''} ${cl.phone || ''} ${cl.code || ''}`.toLowerCase()
      return hay.includes(needle)
    })

    if (sort === 'debt_desc' || sort === 'debt_asc') {
      rows = rows.filter(cl => clientDebt(cl) > 0.005)
    }

    const byName = (a: Client, b: Client) =>
      (a.name || '').localeCompare(b.name || '', 'uz')

    return rows.slice().sort((a, b) => {
      if (sort === 'all') return byName(a, b)
      const da = clientDebt(a)
      const db = clientDebt(b)
      if (sort === 'top_desc' || sort === 'debt_desc') {
        if (db !== da) return db - da
        return byName(a, b)
      }
      if (sort === 'top_asc' || sort === 'debt_asc') {
        if (da !== db) return da - db
        return byName(a, b)
      }
      return byName(a, b)
    })
  }, [list, q, sort, lineFilter])

  const statusLabel = (status: ClientRequestRow['status']) => {
    if (status === 'pending') return tr.clientReqPending
    if (status === 'approved') return tr.clientReqApproved
    return tr.clientReqRejected
  }

  const dismissRequest = async (req: ClientRequestRow) => {
    if (busyId) return
    setBusyId(req.id)
    try {
      await deleteClientRequest(req.id)
      setRequests(prev => prev.filter(r => r.id !== req.id))
      showToast(tr.clientReqDeleted, 'success')
    } catch (e) {
      showToast(e instanceof ApiError ? localizeApiError(e.message, tr) : tr.loginError)
    } finally {
      setBusyId(null)
    }
  }

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

        {!loading && visibleRequests.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: c.mutedText, letterSpacing: 0.4 }}>
              {tr.clientRequestsTitle}
            </p>
            {visibleRequests.map(req => {
              const st = statusStyle(req.status, dark)
              return (
                <div
                  key={req.id}
                  style={{
                    borderRadius: 16, padding: 14, background: c.card,
                    border: `1px solid ${c.border}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: c.text }}>
                        {req.name}
                      </p>
                      {req.fullName && req.fullName !== req.name && (
                        <p style={{ margin: '3px 0 0', fontSize: 12, color: c.mutedText }}>{req.fullName}</p>
                      )}
                      <p style={{ margin: '6px 0 0', fontSize: 11, color: c.mutedText }}>
                        {req.requestType === 'update' ? tr.clientReqUpdate : tr.clientReqCreate}
                        {req.phone ? ` · ${req.phone}` : ''}
                      </p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                      <span style={{
                        fontSize: 11, fontWeight: 800,
                        padding: '5px 10px', borderRadius: 999,
                        background: st.bg, color: st.color,
                      }}>
                        {statusLabel(req.status)}
                      </span>
                      {req.status === 'rejected' && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            type="button"
                            disabled={busyId === req.id}
                            title={tr.editItem}
                            aria-label={tr.editItem}
                            onClick={() => onEditRequest(req)}
                            style={{
                              width: 34, height: 34, borderRadius: 10, border: 'none', cursor: 'pointer',
                              background: 'rgba(108,92,231,0.12)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              opacity: busyId === req.id ? 0.5 : 1,
                            }}
                          >
                            <PenSquare size={15} color={c.primary} />
                          </button>
                          <button
                            type="button"
                            disabled={busyId === req.id}
                            title={tr.cancel}
                            aria-label={tr.cancel}
                            onClick={() => void dismissRequest(req)}
                            style={{
                              width: 34, height: 34, borderRadius: 10, border: 'none', cursor: 'pointer',
                              background: 'rgba(239,68,68,0.12)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              opacity: busyId === req.id ? 0.5 : 1,
                            }}
                          >
                            <X size={16} color="#DC2626" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <FilterDropdown
            dark={dark}
            label={tr.clientFilterSort}
            valueLabel={sortLabel}
            active={sort !== 'all'}
            options={sortTabs.map(t => ({ id: t.id, label: t.label }))}
            selectedId={sort}
            onSelect={id => setSort(id as ClientSort)}
          />
          <FilterDropdown
            dark={dark}
            label={tr.clientFilterLine}
            valueLabel={lineFilterLabel}
            active={!!lineFilter}
            options={[
              { id: '', label: tr.clientFilterLineAll },
              ...lineOptions.map(l => ({ id: l.code, label: l.name })),
            ]}
            selectedId={lineFilter}
            onSelect={setLineFilter}
          />
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
                <button
                  type="button"
                  title={tr.clientPhoto}
                  aria-label={tr.clientPhoto}
                  onClick={e => {
                    e.stopPropagation()
                    if (!cl.photoUrl) {
                      showToast(tr.clientPhotoMissing)
                      return
                    }
                    setPhotoClient(cl)
                  }}
                  style={{
                    width: 34, height: 34, borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: cl.photoUrl ? 'rgba(108,92,231,0.12)' : c.muted,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    opacity: cl.photoUrl ? 1 : 0.55,
                  }}
                >
                  <ImageIcon size={15} color={cl.photoUrl ? c.primary : c.mutedText} />
                </button>
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
              <Meta label={tr.clientOrderAgent} value={resolveAgentLabel(cl.lineCode)} muted={c.mutedText} text={c.text} />
              <Meta label={tr.line} value={resolveLineLabel(cl.lineCode)} muted={c.mutedText} text={c.text} />
              <Meta
                label={tr.debt}
                value={cl.debt != null ? formatMoney(cl.debt, lang) : '—'}
                muted={c.mutedText}
                text={c.red}
              />
              <div style={{ gridColumn: '1 / -1' }}>
                <Meta label={tr.address} value={cl.address || '—'} muted={c.mutedText} text={c.text} />
              </div>
            </div>
          </div>
        ))}

        {!loading && filtered.length === 0 && visibleRequests.length === 0 && (
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

      {photoClient && photoSrc && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setPhotoClient(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 95,
            background: 'rgba(0,0,0,0.94)',
            display: 'flex', flexDirection: 'column',
          }}
        >
          <div style={{
            padding: 'var(--header-pad-top) max(16px, var(--safe-left)) 10px max(16px, var(--safe-right))',
            display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
          }}>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); setPhotoClient(null) }}
              style={{
                width: 40, height: 40, borderRadius: 13, border: 'none',
                background: 'rgba(255,255,255,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}
            >
              <X size={18} color="#fff" />
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {photoClient.name}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>
                {tr.clientPhotoTapToClose}
              </p>
            </div>
          </div>
          <div
            style={{
              flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '8px max(12px, var(--safe-left)) 8px max(12px, var(--safe-right))',
            }}
          >
            <img
              src={photoSrc}
              alt=""
              style={{
                maxWidth: '100%', maxHeight: '100%',
                width: 'auto', height: 'auto',
                objectFit: 'contain', borderRadius: 8,
                pointerEvents: 'none',
              }}
            />
          </div>
          <div style={{
            padding: '10px max(16px, var(--safe-left)) max(16px, var(--safe-bottom)) max(16px, var(--safe-right))',
            flexShrink: 0,
          }}>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); setPhotoClient(null) }}
              style={{
                width: '100%', height: 48, borderRadius: 14, border: 'none', cursor: 'pointer',
                background: 'rgba(255,255,255,0.14)', color: '#fff',
                fontSize: 15, fontWeight: 800,
              }}
            >
              {tr.clientPhotoClose}
            </button>
          </div>
        </div>,
        document.body,
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

function FilterDropdown({
  dark,
  label,
  valueLabel,
  active,
  options,
  selectedId,
  onSelect,
}: {
  dark: boolean
  label: string
  valueLabel: string
  active: boolean
  options: { id: string; label: string }[]
  selectedId: string
  onSelect: (id: string) => void
}) {
  const c = theme(dark)
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('touchstart', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('touchstart', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} style={{ position: 'relative', minWidth: 0 }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          width: '100%',
          height: 44,
          padding: '0 12px',
          borderRadius: 14,
          border: `1px solid ${active ? 'rgba(108,92,231,0.35)' : c.border}`,
          background: active ? 'rgba(108,92,231,0.12)' : c.card,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          textAlign: 'left',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: c.mutedText, lineHeight: 1.1 }}>
            {label}
          </p>
          <p style={{
            margin: '2px 0 0',
            fontSize: 13,
            fontWeight: 800,
            color: active ? c.primary : c.text,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {valueLabel}
          </p>
        </div>
        <ChevronDown
          size={16}
          color={c.mutedText}
          style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="no-scrollbar"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            maxHeight: 260,
            overflowY: 'auto',
            borderRadius: 14,
            background: c.card,
            border: `1px solid ${c.border}`,
            boxShadow: dark
              ? '0 12px 32px rgba(0,0,0,0.45)'
              : '0 12px 28px rgba(91,45,142,0.18)',
            zIndex: 70,
            animation: 'fadeIn 0.15s ease both',
          }}
        >
          {options.map(opt => {
            const selected = opt.id === selectedId
            return (
              <button
                key={opt.id || '__all__'}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onSelect(opt.id)
                  setOpen(false)
                }}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  background: selected ? 'rgba(108,92,231,0.12)' : 'transparent',
                  color: selected ? c.primary : c.text,
                  fontSize: 13,
                  fontWeight: selected ? 800 : 600,
                }}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
