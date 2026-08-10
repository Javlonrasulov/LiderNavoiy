import { useEffect, useMemo, useState } from 'react'
import { Maximize2, X } from '../icons'
import LiveLeafletMap from './LiveLeafletMap'
import { connectTracking } from '../api/tracking'
import { isInServiceArea } from '../utils/gpsOnline'
import type { EmployeeLocation } from '../api/types'
import type { Translations } from '../i18n'
import { theme } from '../theme'

type LivePatch = {
  lat: number
  lng: number
  online: boolean
  lastSeen: string
  at: number
}

interface Props {
  dark: boolean
  tr: Translations
  employees: EmployeeLocation[]
}

function mergeEmployees(
  base: EmployeeLocation[],
  live: Record<string, LivePatch>,
): EmployeeLocation[] {
  const byId = new Map(base.map(e => [e.distributorId, { ...e }]))

  for (const [id, patch] of Object.entries(live)) {
    const existing = byId.get(id)
    if (!existing) continue // boshqa org pinlarini qo‘shma
    const hasCoords = isInServiceArea(patch.lat, patch.lng)

    byId.set(id, {
      ...existing,
      lat: hasCoords ? patch.lat : existing.lat,
      lng: hasCoords ? patch.lng : existing.lng,
      online: patch.online,
      lastSeen: patch.lastSeen,
    })
  }

  return [...byId.values()]
}

export default function EmployeeMap({ dark, tr, employees }: Props) {
  const c = theme(dark)
  const [live, setLive] = useState<Record<string, LivePatch>>({})
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    let socket: { disconnect: () => void } | null = null
    let cancelled = false

    void connectTracking({
      onLocation: data => {
        if (!data.distributorId || data.latitude == null || data.longitude == null) return
        if (!isInServiceArea(data.latitude, data.longitude)) return
        setLive(prev => ({
          ...prev,
          [data.distributorId]: {
            lat: data.latitude,
            lng: data.longitude,
            online: true,
            lastSeen: 'hozir',
            at: Date.now(),
          },
        }))
      },
      onOnline: d => {
        if (!d.distributorId) return
        setLive(prev => {
          const cur = prev[d.distributorId!]
          return {
            ...prev,
            [d.distributorId!]: {
              lat: cur?.lat ?? Number.NaN,
              lng: cur?.lng ?? Number.NaN,
              online: true,
              lastSeen: 'hozir',
              at: Date.now(),
            },
          }
        })
      },
      onOffline: d => {
        if (!d.distributorId) return
        setLive(prev => {
          const cur = prev[d.distributorId!]
          if (!cur) return prev
          return {
            ...prev,
            [d.distributorId!]: { ...cur, online: false, lastSeen: 'hozirgina', at: Date.now() },
          }
        })
      },
    }).then(s => {
      if (cancelled) {
        s?.disconnect()
        return
      }
      socket = s
    })

    const expire = window.setInterval(() => {
      const cutoff = Date.now() - 300_000
      setLive(prev => {
        let changed = false
        const next = { ...prev }
        for (const [id, patch] of Object.entries(next)) {
          if (patch.online && patch.at < cutoff) {
            next[id] = { ...patch, online: false, lastSeen: '5+ daqiqa oldin' }
            changed = true
          }
        }
        return changed ? next : prev
      })
    }, 20_000)

    return () => {
      cancelled = true
      socket?.disconnect()
      window.clearInterval(expire)
    }
  }, [])

  const markers = useMemo(() => mergeEmployees(employees, live), [employees, live])
  const online = markers.filter(e => e.online && e.lat != null && e.lng != null && isInServiceArea(e.lat, e.lng)).length

  useEffect(() => {
    if (!expanded) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [expanded])

  return (
    <>
      <div style={{ borderRadius: 24, overflow: 'hidden', border: `1px solid ${c.border}`, background: c.card }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 10px', gap: 8 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ fontSize: 15, fontWeight: 800, color: c.text }}>{tr.employeeMap}</p>
            <p style={{ fontSize: 11, color: c.mutedText, marginTop: 2 }}>{tr.mapHint}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: c.green, background: c.green + '22', padding: '4px 10px', borderRadius: 99 }}>
              {online} {tr.online}
            </span>
            <button
              type="button"
              onClick={() => setExpanded(true)}
              title={tr.mapFullscreen}
              style={{
                width: 34, height: 34, borderRadius: 12, border: 'none', cursor: 'pointer',
                background: c.muted, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Maximize2 size={15} color={c.text} />
            </button>
          </div>
        </div>

        <div style={{ margin: '0 12px 12px', borderRadius: 18, overflow: 'hidden' }}>
          <LiveLeafletMap employees={markers} dark={dark} tr={tr} height={220} />
        </div>

        <div style={{ display: 'flex', gap: 14, padding: '0 16px 14px' }}>
          <Legend color="#6366f1" label={tr.agents} />
          <Legend color="#10b981" label={tr.delivery} />
          <Legend color="#6b7280" label={tr.offline} />
        </div>
      </div>

      {expanded && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2000,
            background: dark ? '#0a0a0f' : '#f8f9fc',
            display: 'flex',
            flexDirection: 'column',
            paddingTop: 'var(--safe-top, 0px)',
            paddingBottom: 'var(--safe-bottom, 0px)',
          }}
        >
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
            padding: '12px 16px',
            borderBottom: `1px solid ${c.border}`,
            background: dark ? 'rgba(8,8,18,0.95)' : 'rgba(255,255,255,0.95)',
          }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontSize: 16, fontWeight: 800, color: c.text }}>{tr.employeeMap}</p>
              <p style={{ fontSize: 11, color: c.mutedText, marginTop: 2 }}>
                {markers.length} {tr.staffNav} · {online} {tr.online}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              style={{
                width: 40, height: 40, borderRadius: 14, border: 'none', cursor: 'pointer',
                background: c.muted, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <X size={18} color={c.text} />
            </button>
          </div>

          <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
            <LiveLeafletMap
              employees={markers}
              dark={dark}
              tr={tr}
              height="100%"
              interactive
            />
          </div>

          <div style={{
            display: 'flex', gap: 16, padding: '12px 16px',
            borderTop: `1px solid ${c.border}`,
            background: dark ? 'rgba(8,8,18,0.95)' : 'rgba(255,255,255,0.95)',
          }}>
            <Legend color="#6366f1" label={tr.agents} />
            <Legend color="#10b981" label={tr.delivery} />
            <Legend color="#6b7280" label={tr.offline} />
          </div>
        </div>
      )}
    </>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
      <span style={{ fontSize: 11, fontWeight: 600, color: '#9E9BC4' }}>{label}</span>
    </div>
  )
}
