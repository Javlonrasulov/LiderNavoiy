import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flag,
  LogIn,
  MapPin,
  Navigation,
  Phone,
  ShoppingCart,
  Smartphone,
  X,
} from '../icons'
import DayTrackingMap from '../components/DayTrackingMap'
import SingleDatePicker from '../components/SingleDatePicker'
import type { Distributor, EmployeeLocation, PointStatus } from '../api/types'
import type { Lang, Translations } from '../i18n'
import { theme } from '../theme'
import {
  addDays,
  emptyDayTrack,
  fetchDayTrack,
  todayLocal,
  trackStatusColor,
  type DayTrack,
} from '../utils/dayTrack'

interface Props {
  dark: boolean
  lang: Lang
  tr: Translations
  distributor: Distributor
  location?: EmployeeLocation
  onBack: () => void
}

function statusShort(status: PointStatus, tr: Translations): string {
  if (status === 'ordered') return tr.trackOrderedShort
  if (status === 'visited') return tr.trackVisitedShort
  if (status === 'remote_ordered') return tr.trackRemoteShort
  if (status === 'client_ordered') return tr.trackClientShort
  return tr.trackMissedShort
}

export default function EmployeeTrackingScreen({
  dark,
  lang,
  tr,
  distributor,
  location,
  onBack,
}: Props) {
  const c = theme(dark)
  const today = todayLocal()
  const [selectedDate, setSelectedDate] = useState(today)
  const [dayTrack, setDayTrack] = useState<DayTrack>(() => emptyDayTrack(today))
  const [loading, setLoading] = useState(true)
  const [pointFilter, setPointFilter] = useState<PointStatus | null>(null)
  const [mapKey, setMapKey] = useState(0)

  const name =
    distributor.user?.fullName || distributor.fullName || distributor.name || '—'
  const online = location?.online ?? distributor.isOnline ?? false
  const green = c.green
  const amber = '#f59e0b'
  const indigo = c.primary
  const teal = '#0ea5e9'

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void (async () => {
      try {
        const track = await fetchDayTrack({
          distributorId: distributor.id,
          dateStr: selectedDate,
          empOnline: online,
          empLat: location?.lat ?? distributor.lastLatitude,
          empLng: location?.lng ?? distributor.lastLongitude,
          lastLocationAt: distributor.lastLocationAt
            ? String(distributor.lastLocationAt)
            : null,
          lastLoginAt: distributor.user?.lastLoginAt ?? null,
          labels: { min: tr.trackMin, hour: tr.trackHour, onlineNow: tr.trackOnlineNow },
        })
        if (!cancelled) setDayTrack(track)
      } catch {
        if (!cancelled) setDayTrack(emptyDayTrack(selectedDate))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [
    distributor.id,
    distributor.lastLatitude,
    distributor.lastLongitude,
    distributor.lastLocationAt,
    distributor.user?.lastLoginAt,
    location?.lat,
    location?.lng,
    online,
    selectedDate,
    tr.trackHour,
    tr.trackMin,
    tr.trackOnlineNow,
  ])

  const filteredPoints = useMemo(() => {
    if (!pointFilter) return dayTrack.points
    return dayTrack.points.filter(p => p.status === pointFilter)
  }, [dayTrack.points, pointFilter])

  const mapPoints = useMemo(
    () => filteredPoints.filter(p => p.hasCoords),
    [filteredPoints],
  )

  const changeDate = (next: string) => {
    if (next > today) return
    setSelectedDate(next)
    setPointFilter(null)
    setMapKey(k => k + 1)
  }

  const stats: {
    label: string
    value: number
    color: string
    filter: PointStatus | null
  }[] = [
    { label: tr.trackTotalPoints, value: dayTrack.total, color: '#94a3b8', filter: null },
    { label: tr.trackOrdered, value: dayTrack.visited, color: green, filter: 'ordered' },
    { label: tr.trackVisitedNoOrder, value: dayTrack.visitedNoOrder, color: amber, filter: 'visited' },
    { label: tr.trackRemoteOrdered, value: dayTrack.remoteOrdered, color: indigo, filter: 'remote_ordered' },
    { label: tr.trackClientOrdered, value: dayTrack.clientOrdered, color: teal, filter: 'client_ordered' },
  ]

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 40,
        background: c.bg,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: 'var(--header-pad-top) max(16px, var(--safe-right)) 12px max(16px, var(--safe-left))',
          borderBottom: `1px solid ${c.border}`,
          background: c.card,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={onBack}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              border: `1px solid ${c.border}`,
              background: c.muted,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <ArrowLeft size={18} color={c.text} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1
              style={{
                fontSize: 17,
                fontWeight: 800,
                color: c.text,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {name}
            </h1>
            <p style={{ fontSize: 12, color: c.mutedText, marginTop: 2 }}>{tr.trackTitle}</p>
          </div>
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              padding: '4px 8px',
              borderRadius: 99,
              background: online ? `${green}22` : c.muted,
              color: online ? green : c.mutedText,
            }}
          >
            {online ? tr.online : tr.offline}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
          <button
            type="button"
            onClick={() => changeDate(addDays(selectedDate, -1))}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              border: `1px solid ${c.border}`,
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ChevronLeft size={16} color={c.text} />
          </button>
          <SingleDatePicker
            value={selectedDate}
            max={today}
            dark={dark}
            lang={lang}
            tr={tr}
            onChange={changeDate}
            onClear={() => changeDate(today)}
          />
          <button
            type="button"
            disabled={selectedDate >= today}
            onClick={() => changeDate(addDays(selectedDate, 1))}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              border: `1px solid ${c.border}`,
              background: 'transparent',
              cursor: selectedDate >= today ? 'default' : 'pointer',
              opacity: selectedDate >= today ? 0.35 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ChevronRight size={16} color={c.text} />
          </button>
          <button
            type="button"
            onClick={() => changeDate(today)}
            style={{
              height: 36,
              padding: '0 12px',
              borderRadius: 10,
              border: `1px solid ${c.border}`,
              background: selectedDate === today ? `${indigo}18` : 'transparent',
              color: selectedDate === today ? indigo : c.mutedText,
              fontWeight: 700,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            {tr.trackToday}
          </button>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px max(16px, var(--safe-right)) calc(24px + var(--safe-bottom)) max(16px, var(--safe-left))',
        }}
        className="no-scrollbar"
      >
        {loading && (
          <p style={{ textAlign: 'center', color: c.mutedText, padding: 20 }}>{tr.loading}</p>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 8,
            marginBottom: 12,
          }}
        >
          {stats.map(s => {
            const active = pointFilter === s.filter
            return (
              <button
                key={s.label}
                type="button"
                onClick={() => setPointFilter(active ? null : s.filter)}
                style={{
                  textAlign: 'left',
                  borderRadius: 14,
                  padding: '12px 14px',
                  border: `1.5px solid ${active ? s.color : c.border}`,
                  background: active ? `${s.color}18` : c.card,
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: 20, fontWeight: 800, color: active ? s.color : c.text }}>
                  {s.value}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: active ? s.color : c.mutedText,
                    marginTop: 2,
                    lineHeight: 1.3,
                    fontWeight: 600,
                  }}
                >
                  {s.label}
                </div>
              </button>
            )
          })}
        </div>

        <div
          style={{
            borderRadius: 16,
            overflow: 'hidden',
            border: `1px solid ${c.border}`,
            background: c.card,
            marginBottom: 12,
          }}
        >
          <div style={{ padding: '12px 14px', borderBottom: `1px solid ${c.border}` }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: c.text }}>{dayTrack.label}</div>
            <div style={{ fontSize: 11, color: c.mutedText, marginTop: 2 }}>
              {tr.trackDayStats}
            </div>
          </div>

          <DayTrackingMap
            key={`${selectedDate}-${mapKey}-${pointFilter ?? 'all'}`}
            points={mapPoints}
            gpsTrail={dayTrack.gpsTrail}
            empLocation={
              dayTrack.empLat != null && dayTrack.empLng != null
                ? { lat: dayTrack.empLat, lng: dayTrack.empLng, online: dayTrack.empOnline }
                : null
            }
            dark={dark}
            tr={tr}
            height={260}
          />

          <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[
              { icon: LogIn, color: indigo, label: tr.trackLoginTime, value: dayTrack.loginTime, bg: `${indigo}12` },
              { icon: Flag, color: green, label: tr.trackFirstPoint, value: dayTrack.firstPointTime, bg: `${green}12` },
              { icon: MapPin, color: amber, label: tr.trackLastPoint, value: dayTrack.lastPointTime, bg: `${amber}12` },
              { icon: Clock, color: '#8b5cf6', label: tr.trackOnlineTime, value: dayTrack.onlineHours, bg: 'rgba(139,92,246,0.10)' },
              { icon: Navigation, color: '#06b6d4', label: tr.trackDistance, value: `${dayTrack.km} km`, bg: 'rgba(6,182,212,0.10)' },
            ].map((item, idx) => (
              <div
                key={item.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 0',
                  borderBottom: idx < 4 ? `1px solid ${c.border}` : 'none',
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    background: item.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <item.icon size={14} color={item.color} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: c.mutedText, fontWeight: 600 }}>{item.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: c.text, marginTop: 1 }}>
                    {item.value}
                  </div>
                </div>
              </div>
            ))}

            <div
              style={{
                marginTop: 8,
                padding: '10px 12px',
                borderRadius: 12,
                background: c.muted,
                border: `1px solid ${c.border}`,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: dayTrack.empOnline ? green : c.mutedText,
                  boxShadow: dayTrack.empOnline ? `0 0 0 3px ${green}30` : 'none',
                }}
              />
              <div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: dayTrack.empOnline ? green : c.mutedText,
                  }}
                >
                  {dayTrack.empOnline ? tr.trackOnlineNow : tr.offline}
                </div>
                <div style={{ fontSize: 11, color: c.mutedText }}>{dayTrack.empLastSeen}</div>
              </div>
            </div>
          </div>
        </div>

        {pointFilter && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 10,
              padding: '8px 12px',
              borderRadius: 10,
              background: c.card,
              border: `1px solid ${c.border}`,
            }}
          >
            <span style={{ fontSize: 12, color: c.mutedText, flex: 1, fontWeight: 600 }}>
              {tr.trackPointsShowing.replace('{n}', String(filteredPoints.length))}
            </span>
            <button
              type="button"
              onClick={() => setPointFilter(null)}
              style={{
                fontSize: 11,
                color: c.mutedText,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontWeight: 700,
              }}
            >
              <X size={12} color={c.mutedText} /> {tr.trackClear}
            </button>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filteredPoints.map(p => {
            const color = trackStatusColor(p.status, green, amber, indigo, teal)
            return (
              <div
                key={`${p.idx}-${p.name}-${p.time}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 14px',
                  borderRadius: 14,
                  border: `1px solid ${c.border}`,
                  background: c.card,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: c.mutedText,
                    width: 22,
                    textAlign: 'center',
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  #{p.idx}
                </div>
                <div style={{ flexShrink: 0 }}>
                  {p.status === 'ordered' ? (
                    <ShoppingCart size={15} color={green} />
                  ) : p.status === 'client_ordered' ? (
                    <Smartphone size={15} color={teal} />
                  ) : p.status === 'remote_ordered' ? (
                    <Phone size={15} color={indigo} />
                  ) : p.status === 'visited' ? (
                    <CheckCircle size={15} color={amber} />
                  ) : (
                    <X size={15} color={c.mutedText} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: c.text,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {p.name}
                  </div>
                  <div style={{ fontSize: 11, color: c.mutedText, marginTop: 2 }}>
                    {p.time ?? '—'}
                    {p.address && p.address !== '—' ? ` · ${p.address}` : ''}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: 8,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    background: `${color}18`,
                    color,
                  }}
                >
                  {statusShort(p.status, tr)}
                </span>
              </div>
            )
          })}

          {!loading && filteredPoints.length === 0 && (
            <p style={{ textAlign: 'center', color: c.mutedText, padding: 28 }}>{tr.noData}</p>
          )}
        </div>
      </div>
    </div>
  )
}
