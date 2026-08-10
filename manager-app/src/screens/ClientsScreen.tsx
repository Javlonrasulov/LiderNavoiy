import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, ImageIcon, PenSquare, Plus, Search, X } from '../icons'
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
import { managerCompanyId, managerCompanySet } from '../utils/staffScope'
import { textMatchesSearch } from '../utils/searchText'
import {
  buildClientSimilarityMap,
  findBestSimilarityMatch,
  similarityRisk,
  similarityRiskColors,
  type SimilarityFieldKey,
  type SimilarityMatch,
} from '../utils/clientSimilarity'

type ClientSort = 'all' | 'top_desc' | 'top_asc' | 'debt_desc' | 'debt_asc'
type MarkFilter = 'all' | 'green' | 'yellow' | 'red'

function clientMark(cl: Client): 'green' | 'yellow' | 'red' {
  return cl.markColor === 'yellow' || cl.markColor === 'red' ? cl.markColor : 'green'
}

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
  const user = getStoredUser()
  const companyId = managerCompanyId(user)
  const companySet = managerCompanySet(user)
  const [list, setList] = useState<Client[]>([])
  const [lines, setLines] = useState<SalesLine[]>([])
  const [requests, setRequests] = useState<ClientRequestRow[]>([])
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<ClientSort>('all')
  const [lineFilter, setLineFilter] = useState('')
  const [markFilter, setMarkFilter] = useState<MarkFilter>('all')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Client | null>(null)
  const [photoClient, setPhotoClient] = useState<Client | null>(null)
  const [similarityDetail, setSimilarityDetail] = useState<{
    source: Client
    match: SimilarityMatch
  } | null>(null)
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

  const similarityById = useMemo(() => buildClientSimilarityMap(list), [list])

  const load = async () => {
    setLoading(true)
    try {
      const [data, reqs, lineRows] = await Promise.all([
        fetchClients(companyId),
        fetchClientRequests({ companyId, status: 'all' }).catch(() => [] as ClientRequestRow[]),
        fetchLines(companyId).catch(() => [] as SalesLine[]),
      ])
      setList(
        (Array.isArray(data) ? data : []).filter(cl => {
          if (!companySet) return true
          const cid = cl.companyId?.trim()
          if (!cid) return false
          return companySet.has(cid)
        }),
      )
      setRequests(
        (Array.isArray(reqs) ? reqs : []).filter(r => {
          if (!companySet) return true
          const cid = r.companyId?.trim()
          if (!cid) return false
          return companySet.has(cid)
        }),
      )
      setLines(Array.isArray(lineRows) ? lineRows : [])
    } catch {
      setList([])
      setRequests([])
      setLines([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [companyId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return pushBackHandler(() => {
      if (similarityDetail) {
        setSimilarityDetail(null)
        return true
      }
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
  }, [selected, photoClient, similarityDetail])

  const dupFieldLabel = (key: SimilarityFieldKey): string => {
    if (key === 'name') return tr.dupFieldName
    if (key === 'fullName') return tr.dupFieldFullName
    if (key === 'phone') return tr.dupFieldPhone
    if (key === 'inn') return tr.dupFieldInn
    return tr.dupFieldTerritory
  }

  const fieldValue = (cl: Client, key: SimilarityFieldKey): string => {
    if (key === 'name') return cl.name || '—'
    if (key === 'fullName') return cl.fullName || '—'
    if (key === 'phone') return cl.phone || '—'
    if (key === 'inn') return cl.inn || '—'
    return cl.territory || '—'
  }

  const openSimilarity = (cl: Client) => {
    const match = findBestSimilarityMatch(
      {
        name: cl.name ?? '',
        fullName: cl.fullName ?? undefined,
        phone: cl.phone ?? undefined,
        inn: cl.inn ?? undefined,
        territory: cl.territory ?? undefined,
      },
      list,
      { excludeClientId: cl.id },
    )
    if (!match) return
    setSimilarityDetail({ source: cl, match })
  }

  const sortTabs: { id: ClientSort; label: string }[] = [
    { id: 'all', label: tr.clientSortAll },
    { id: 'top_desc', label: tr.clientSortTopDesc },
    { id: 'top_asc', label: tr.clientSortTopAsc },
    { id: 'debt_desc', label: tr.clientSortDebtDesc },
    { id: 'debt_asc', label: tr.clientSortDebtAsc },
  ]

  const lineOptions = useMemo(() => {
    const counts = new Map<string, number>()
    for (const cl of list) {
      const code = (cl.lineCode || '').trim()
      if (!code) continue
      counts.set(code, (counts.get(code) || 0) + 1)
    }

    const fromApi = lines
      .map(l => {
        const code = (l.code || '').trim()
        const name = (l.name || '').trim() || code
        return {
          code,
          name,
          count: (counts.get(code) ?? Number(l.clientCount)) || 0,
        }
      })
      .filter(l => l.code)
    const seen = new Set(fromApi.map(l => l.code))
    for (const cl of list) {
      const code = (cl.lineCode || '').trim()
      if (!code || seen.has(code)) continue
      seen.add(code)
      fromApi.push({ code, name: code, count: counts.get(code) || 0 })
    }
    return fromApi.sort((a, b) => a.name.localeCompare(b.name, 'uz'))
  }, [lines, list])

  const sortLabel = sortTabs.find(t => t.id === sort)?.label ?? tr.clientSortAll
  const selectedLine = lineOptions.find(l => l.code === lineFilter)
  const lineFilterLabel = lineFilter
    ? `${selectedLine?.name || lineNameByCode.get(lineFilter) || lineFilter} ${selectedLine?.count ?? 0}`
    : `${tr.clientFilterLineAll} ${list.length}`

  const markCounts = useMemo(() => {
    let green = 0
    let yellow = 0
    let red = 0
    for (const cl of list) {
      const m = clientMark(cl)
      if (m === 'yellow') yellow += 1
      else if (m === 'red') red += 1
      else green += 1
    }
    return { all: list.length, green, yellow, red }
  }, [list])

  const markFilterLabel =
    markFilter === 'green' ? `${tr.markGreen} ${markCounts.green}` :
    markFilter === 'yellow' ? `${tr.markYellow} ${markCounts.yellow}` :
    markFilter === 'red' ? `${tr.markRed} ${markCounts.red}` :
    `${tr.markFilterAll} ${markCounts.all}`

  const visibleRequests = useMemo(() => {
    const needle = q.trim()
    return requests
      .filter(r => r.status === 'pending' || r.status === 'rejected')
      .filter(r => {
        if (!needle) return true
        const hay = `${r.name} ${r.fullName || ''} ${r.phone || ''} ${r.inn || ''}`
        return textMatchesSearch(hay, needle)
      })
      .slice(0, 40)
  }, [requests, q])

  const filtered = useMemo(() => {
    const needle = q.trim()
    let rows = list.filter(cl => {
      if (lineFilter && (cl.lineCode || '').trim() !== lineFilter) return false
      if (markFilter !== 'all' && clientMark(cl) !== markFilter) return false
      if (!needle) return true
      const hay = `${cl.name} ${cl.fullName || ''} ${cl.phone || ''} ${cl.code || ''}`
      return textMatchesSearch(hay, needle)
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
  }, [list, q, sort, lineFilter, markFilter])

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
              { id: '', label: `${tr.clientFilterLineAll} ${list.length}` },
              ...lineOptions.map(l => ({ id: l.code, label: `${l.name} ${l.count}` })),
            ]}
            selectedId={lineFilter}
            onSelect={setLineFilter}
          />
        </div>

        <MarkFilterDropdown
          dark={dark}
          label={tr.markColor}
          valueLabel={markFilterLabel}
          active={markFilter !== 'all'}
          selectedId={markFilter}
          counts={markCounts}
          labels={{
            all: tr.markFilterAll,
            green: tr.markGreen,
            yellow: tr.markYellow,
            red: tr.markRed,
          }}
          onSelect={setMarkFilter}
        />

        {loading && <p style={{ textAlign: 'center', color: c.mutedText, padding: 24 }}>{tr.loading}</p>}

        {!loading && filtered.map(cl => {
          const sim = similarityById.get(cl.id)
          const risk = sim ? similarityRisk(sim.pct) : null
          const riskColors = risk ? similarityRiskColors(risk, dark) : null
          return (
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
              borderRadius: 20, padding: 16, background: c.card,
              border: `1px solid ${riskColors ? riskColors.border : c.border}`,
              textAlign: 'left', cursor: 'pointer', width: '100%',
              boxShadow: riskColors ? `inset 3px 0 0 ${riskColors.color}` : undefined,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {(() => {
                    const mark = cl.markColor === 'yellow' || cl.markColor === 'red' ? cl.markColor : 'green'
                    return (
                      <span
                        title={mark}
                        style={{
                          width: 12, height: 12, borderRadius: 99, flexShrink: 0,
                          background:
                            mark === 'green' ? '#22C55E'
                              : mark === 'yellow' ? '#EAB308'
                                : '#EF4444',
                        }}
                      />
                    )
                  })()}
                  <p style={{
                    margin: 0,
                    fontSize: 18, fontWeight: 800, color: c.primary, lineHeight: 1.25,
                    letterSpacing: '-0.02em',
                  }}>
                    {cl.name}
                  </p>
                  {sim && riskColors && (
                    <button
                      type="button"
                      title={`${sim.matchName} · ${sim.pct}%`}
                      onClick={e => {
                        e.stopPropagation()
                        openSimilarity(cl)
                      }}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '3px 8px', borderRadius: 999,
                        background: riskColors.bg, color: riskColors.color,
                        border: `1px solid ${riskColors.border}`,
                        fontSize: 10, fontWeight: 800, flexShrink: 0,
                        cursor: 'pointer', font: 'inherit',
                      }}
                    >
                      <span style={{
                        width: 7, height: 7, borderRadius: 99, background: riskColors.color,
                      }} />
                      {tr.dupSimilarBadge.replace('{pct}', String(sim.pct))}
                    </button>
                  )}
                </div>
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
          )
        })}

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

      {similarityDetail && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setSimilarityDetail(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 96,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            paddingBottom: 'var(--safe-bottom)',
          }}
        >
          {(() => {
            const { source, match } = similarityDetail
            const risk = similarityRisk(match.overallPct)
            const colors = similarityRiskColors(risk, dark)
            const riskLabel = risk === 'red' ? tr.dupRiskRed : risk === 'yellow' ? tr.dupRiskYellow : tr.dupRiskGreen
            const activeFields = match.fields.filter(f => f.pct > 0)
            return (
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  width: '100%', maxWidth: 480,
                  borderRadius: '24px 24px 0 0',
                  background: c.card,
                  border: `1px solid ${c.border}`,
                  padding: '18px 16px max(16px, env(safe-area-inset-bottom, 0px))',
                  maxHeight: '85vh',
                  overflowY: 'auto',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: c.text }}>{tr.dupDetailTitle}</p>
                    <p style={{ margin: '8px 0 0', fontSize: 14, fontWeight: 800, color: colors.color }}>
                      {tr.dupChance.replace('{pct}', String(match.overallPct))}
                    </p>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      marginTop: 8, padding: '4px 10px', borderRadius: 999,
                      background: colors.bg, color: colors.color, border: `1px solid ${colors.border}`,
                      fontSize: 11, fontWeight: 800,
                    }}>
                      <span style={{ width: 8, height: 8, borderRadius: 99, background: colors.color, flexShrink: 0 }} />
                      {riskLabel}
                    </span>
                  </div>
                  <div style={{
                    width: 64, height: 64, borderRadius: 18, flexShrink: 0,
                    background: colors.bg, border: `1px solid ${colors.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 900, fontSize: 20, color: colors.color,
                  }}>
                    {match.overallPct}%
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                  <div style={{
                    borderRadius: 14, padding: 12,
                    background: dark ? '#1A1A2E' : '#F3F4F6',
                    border: `1px solid ${c.border}`,
                  }}>
                    <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: c.mutedText }}>{tr.dupThisClient}</p>
                    <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 800, color: c.primary, lineHeight: 1.3 }}>
                      {source.name}
                    </p>
                    {source.phone && (
                      <p style={{ margin: '3px 0 0', fontSize: 11, color: c.mutedText }}>{source.phone}</p>
                    )}
                  </div>
                  <div style={{
                    borderRadius: 14, padding: 12,
                    background: dark ? '#1A1A2E' : '#F3F4F6',
                    border: `1px solid ${colors.border}`,
                  }}>
                    <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: c.mutedText }}>{tr.dupMatchedClient}</p>
                    <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 800, color: c.text, lineHeight: 1.3 }}>
                      {match.client.name}
                    </p>
                    {match.client.phone && (
                      <p style={{ margin: '3px 0 0', fontSize: 11, color: c.mutedText }}>{match.client.phone}</p>
                    )}
                  </div>
                </div>

                <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 800, color: c.mutedText, letterSpacing: 0.3 }}>
                  {tr.dupMatchFields}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                  {(activeFields.length ? activeFields : match.fields).map(f => {
                    const barColor = f.pct <= 0
                      ? c.mutedText
                      : similarityRiskColors(f.pct >= 70 ? 'red' : f.pct >= 40 ? 'yellow' : 'green', dark).color
                    return (
                      <div
                        key={f.key}
                        style={{
                          borderRadius: 14, padding: 12,
                          background: dark ? '#13132A' : '#F8F9FC',
                          border: `1px solid ${c.border}`,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: c.text }}>{dupFieldLabel(f.key)}</span>
                          <span style={{ fontSize: 12, fontWeight: 800, color: barColor }}>{f.pct}%</span>
                        </div>
                        <div style={{
                          height: 6, borderRadius: 99, background: dark ? '#0F0F1A' : '#E5E7EB',
                          overflow: 'hidden', marginBottom: 8,
                        }}>
                          <div style={{
                            height: '100%', width: `${f.pct}%`, borderRadius: 99, background: barColor,
                          }} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          <div>
                            <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: c.mutedText }}>{tr.dupThisClient}</p>
                            <p style={{
                              margin: '2px 0 0', fontSize: 12, fontWeight: 700, color: c.text,
                              wordBreak: 'break-word',
                            }}>
                              {fieldValue(source, f.key)}
                            </p>
                          </div>
                          <div>
                            <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: c.mutedText }}>{tr.dupMatchedClient}</p>
                            <p style={{
                              margin: '2px 0 0', fontSize: 12, fontWeight: 700, color: c.text,
                              wordBreak: 'break-word',
                            }}>
                              {fieldValue(match.client, f.key)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setSimilarityDetail(null)}
                  style={{
                    width: '100%', height: 48, borderRadius: 14, border: 'none', cursor: 'pointer',
                    background: c.primary, color: '#fff', fontWeight: 800, fontSize: 14,
                  }}
                >
                  {tr.dupClose}
                </button>
              </div>
            )
          })()}
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

function MarkFilterDropdown({
  dark,
  label,
  valueLabel,
  active,
  selectedId,
  counts,
  labels,
  onSelect,
}: {
  dark: boolean
  label: string
  valueLabel: string
  active: boolean
  selectedId: MarkFilter
  counts: { all: number; green: number; yellow: number; red: number }
  labels: { all: string; green: string; yellow: string; red: string }
  onSelect: (id: MarkFilter) => void
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

  const markMeta: {
    id: Exclude<MarkFilter, 'all'>
    label: string
    count: number
    dot: string
    badgeBg: string
    badgeText: string
  }[] = [
    {
      id: 'green',
      label: labels.green,
      count: counts.green,
      dot: '#22C55E',
      badgeBg: dark ? 'rgba(34,197,94,0.18)' : 'rgba(34,197,94,0.12)',
      badgeText: dark ? '#4ADE80' : '#15803D',
    },
    {
      id: 'yellow',
      label: labels.yellow,
      count: counts.yellow,
      dot: '#EAB308',
      badgeBg: dark ? 'rgba(234,179,8,0.2)' : 'rgba(234,179,8,0.14)',
      badgeText: dark ? '#FACC15' : '#A16207',
    },
    {
      id: 'red',
      label: labels.red,
      count: counts.red,
      dot: '#EF4444',
      badgeBg: dark ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.12)',
      badgeText: dark ? '#FCA5A5' : '#B91C1C',
    },
  ]

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
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            {selectedId !== 'all' && (
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 99,
                  flexShrink: 0,
                  background:
                    selectedId === 'green' ? '#22C55E'
                      : selectedId === 'yellow' ? '#EAB308'
                        : '#EF4444',
                }}
              />
            )}
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
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            borderRadius: 14,
            background: c.card,
            border: `1px solid ${c.border}`,
            boxShadow: dark
              ? '0 12px 32px rgba(0,0,0,0.45)'
              : '0 12px 28px rgba(91,45,142,0.18)',
            zIndex: 70,
            overflow: 'hidden',
            animation: 'fadeIn 0.15s ease both',
          }}
        >
          <button
            type="button"
            role="option"
            aria-selected={selectedId === 'all'}
            onClick={() => {
              onSelect('all')
              setOpen(false)
            }}
            style={{
              width: '100%',
              padding: '12px 14px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              background: selectedId === 'all' ? 'rgba(108,92,231,0.12)' : 'transparent',
              color: selectedId === 'all' ? c.primary : c.text,
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            <span>{labels.all}</span>
            {selectedId === 'all' && <Check size={16} color={c.primary} />}
          </button>

          {markMeta.map(opt => {
            const selected = selectedId === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onSelect(opt.id)
                  setOpen(false)
                }}
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: selected ? 'rgba(108,92,231,0.08)' : 'transparent',
                  color: c.text,
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 99,
                    flexShrink: 0,
                    background: opt.dot,
                  }}
                />
                <span style={{ flex: 1, textAlign: 'left' }}>{opt.label}</span>
                <span
                  style={{
                    minWidth: 28,
                    padding: '3px 10px',
                    borderRadius: 999,
                    background: opt.badgeBg,
                    color: opt.badgeText,
                    fontSize: 12,
                    fontWeight: 800,
                    textAlign: 'center',
                    lineHeight: 1.2,
                  }}
                >
                  {opt.count}
                </span>
                {selected && <Check size={16} color={c.primary} />}
              </button>
            )
          })}
        </div>
      )}
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
