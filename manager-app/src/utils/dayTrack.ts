import { fetchDailyRoute, fetchVisitsForDistributor } from '../api/manager'
import type { PointStatus, VisitAdminRow } from '../api/types'
import { isInServiceArea } from './gpsOnline'

export interface TrackPoint {
  idx: number
  name: string
  address: string
  lat: number
  lng: number
  hasCoords: boolean
  time: string | null
  visitedAtMs: number
  status: PointStatus
}

export interface DayTrack {
  date: string
  label: string
  total: number
  visited: number
  visitedNoOrder: number
  remoteOrdered: number
  clientOrdered: number
  missed: number
  km: number
  loginTime: string
  firstPointTime: string
  lastPointTime: string
  onlineHours: string
  empLat: number | null
  empLng: number | null
  empOnline: boolean
  empLastSeen: string
  points: TrackPoint[]
  gpsTrail: { lat: number; lng: number }[]
  hasRealLocation: boolean
}

function fmtClock(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** ISO timestamp → "06/08/2026, 11:07" (yilsiz matnni qayta parse qilmaydi) */
function fmtLastSeenAt(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${day}/${month}/${year}, ${hh}:${mm}`
}

function fmtDurationMinutes(mins: number, labels: { min: string; hour: string }): string {
  if (!mins || mins <= 0) return '—'
  const h = Math.floor(mins / 60)
  const m = Math.round(mins % 60)
  if (h <= 0) return `${m} ${labels.min}`
  return `${h} ${labels.hour} ${m} ${labels.min}`
}

function sameLocalDay(iso: string, dateStr: string): boolean {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return false
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}` === dateStr
}

function asCoord(
  lat: number | null | undefined,
  lng: number | null | undefined,
): { lat: number; lng: number } | null {
  const la = Number(lat)
  const ln = Number(lng)
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return null
  if (la === 0 && ln === 0) return null
  if (!isInServiceArea(la, ln)) return null
  return { lat: la, lng: ln }
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function filterGpsTrail(
  points: { lat: number; lng: number; recordedAt?: string }[],
): { lat: number; lng: number; recordedAt?: string }[] {
  const MAX_JUMP_KM = 80
  const out: { lat: number; lng: number; recordedAt?: string }[] = []
  for (const p of points) {
    if (!isInServiceArea(p.lat, p.lng)) continue
    if (out.length === 0) {
      out.push(p)
      continue
    }
    const prev = out[out.length - 1]
    if (haversineKm(prev.lat, prev.lng, p.lat, p.lng) > MAX_JUMP_KM) continue
    out.push(p)
  }
  return out
}

function trailDistanceKm(points: { lat: number; lng: number }[]): number {
  let total = 0
  for (let i = 1; i < points.length; i++) {
    total += haversineKm(points[i - 1].lat, points[i - 1].lng, points[i].lat, points[i].lng)
  }
  return Math.round(total * 10) / 10
}

export function todayLocal(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + n)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function dayLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const months = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek']
  const days = ['Yak', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh']
  const dt = new Date(y, m - 1, d)
  return `${days[dt.getDay()]}, ${d} ${months[m - 1]}`
}

/** Joyida borib zakaz — telefon / mijoz ilovasi emas */
export function classifyVisit(v: VisitAdminRow): PointStatus {
  const check = asCoord(v.checkInLatitude, v.checkInLongitude)
  const fromApp = !!v.fromClientOrder || v.orderSource === 'client'
  const hasOrder = Number(v.orderTotal) > 0
  if (fromApp && hasOrder) return 'client_ordered'
  if (!check && hasOrder) return 'remote_ordered'
  if (hasOrder) return 'ordered'
  if (check) return 'visited'
  return 'visited'
}

/**
 * Shu kun ichida birinchi joyida borib olingan zakaz vaqti (ms).
 * Telefon / klient o‘zi bergan zakazlar hisobga olinmaydi.
 */
export function firstOnSiteOrderMs(visits: VisitAdminRow[]): number | null {
  let best: number | null = null
  for (const v of visits) {
    if (classifyVisit(v) !== 'ordered') continue
    const ms = new Date(v.visitedAt).getTime()
    if (Number.isNaN(ms)) continue
    if (best == null || ms < best) best = ms
  }
  return best
}

export function emptyDayTrack(dateStr: string): DayTrack {
  return {
    date: dateStr,
    label: dayLabel(dateStr),
    total: 0,
    visited: 0,
    visitedNoOrder: 0,
    remoteOrdered: 0,
    clientOrdered: 0,
    missed: 0,
    km: 0,
    loginTime: '—',
    firstPointTime: '—',
    lastPointTime: '—',
    onlineHours: '—',
    empLat: null,
    empLng: null,
    empOnline: false,
    empLastSeen: '—',
    points: [],
    gpsTrail: [],
    hasRealLocation: false,
  }
}

export async function fetchDayTrack(opts: {
  distributorId: string
  dateStr: string
  empOnline: boolean
  empLat?: number | null
  empLng?: number | null
  lastLocationAt?: string | null
  lastLoginAt?: string | null
  labels?: { min: string; hour: string; onlineNow: string }
}): Promise<DayTrack> {
  const labels = opts.labels ?? { min: 'daq', hour: 'soat', onlineNow: 'Hozir online' }
  const base = emptyDayTrack(opts.dateStr)

  const [routeRes, visitsRes] = await Promise.allSettled([
    fetchDailyRoute(opts.distributorId, opts.dateStr),
    fetchVisitsForDistributor(opts.distributorId, opts.dateStr),
  ])

  const route = routeRes.status === 'fulfilled' ? routeRes.value : null
  const visits = visitsRes.status === 'fulfilled' ? visitsRes.value : []

  const gpsPoints = filterGpsTrail(
    (route?.points ?? [])
      .map(p => {
        const c = asCoord(p.latitude, p.longitude)
        if (!c) return null
        return { ...c, recordedAt: p.recordedAt }
      })
      .filter((p): p is { lat: number; lng: number; recordedAt: string } => !!p),
  )
  const lastGps = gpsPoints[gpsPoints.length - 1]
  const gpsTrail = gpsPoints.map(p => ({ lat: p.lat, lng: p.lng }))

  const visitPoints: TrackPoint[] = visits
    .slice()
    .sort((a, b) => new Date(a.visitedAt).getTime() - new Date(b.visitedAt).getTime())
    .map((v, i) => {
      const check = asCoord(v.checkInLatitude, v.checkInLongitude)
      const client = asCoord(v.clientLatitude, v.clientLongitude)
      const coords = check ?? client
      const status = classifyVisit(v)
      const ms = new Date(v.visitedAt).getTime()
      return {
        idx: i + 1,
        name: v.clientName || 'Klient',
        address: v.clientAddress || '—',
        lat: coords?.lat ?? 0,
        lng: coords?.lng ?? 0,
        hasCoords: !!coords,
        time: fmtClock(v.visitedAt),
        visitedAtMs: Number.isNaN(ms) ? 0 : ms,
        status,
      }
    })

  const points = visitPoints.map((p, i) => ({ ...p, idx: i + 1 }))

  // Birinchi / oxirgi nuqta: faqat joyida borilganlar (telefon / ilova emas)
  const onSite = points.filter(p => p.status === 'ordered' || p.status === 'visited')
  const firstOnSiteOrder = points.find(p => p.status === 'ordered')
  const firstOnSite = firstOnSiteOrder ?? onSite[0]
  const lastOnSite = onSite[onSite.length - 1]

  const ordered = points.filter(p => p.status === 'ordered').length
  const visitedNoOrder = points.filter(p => p.status === 'visited').length
  const remoteOrdered = points.filter(p => p.status === 'remote_ordered').length
  const clientOrdered = points.filter(p => p.status === 'client_ordered').length

  const loginAt =
    opts.lastLoginAt && sameLocalDay(opts.lastLoginAt, opts.dateStr) ? opts.lastLoginAt : null

  const liveEmp = asCoord(opts.empLat, opts.empLng)
  const trailEmp = lastGps ? { lat: lastGps.lat, lng: lastGps.lng } : null
  const empPos = liveEmp ?? trailEmp
  const empLastSeen = opts.empOnline
    ? labels.onlineNow
    : fmtLastSeenAt(opts.lastLocationAt)

  const durationMins = Number(route?.stats?.durationMinutes) || 0
  const apiKm = Number(route?.stats?.totalDistanceKm) || 0
  const km = gpsTrail.length >= 2 ? trailDistanceKm(gpsTrail) : apiKm

  return {
    ...base,
    total: points.length,
    visited: ordered,
    visitedNoOrder,
    remoteOrdered,
    clientOrdered,
    missed: 0,
    km: Math.round(km * 10) / 10,
    loginTime: fmtClock(loginAt),
    firstPointTime: firstOnSite?.time ?? '—',
    lastPointTime: lastOnSite?.time ?? '—',
    onlineHours: fmtDurationMinutes(durationMins, labels),
    empLat: empPos?.lat ?? null,
    empLng: empPos?.lng ?? null,
    empOnline: opts.empOnline,
    empLastSeen,
    points,
    gpsTrail,
    hasRealLocation: empPos != null,
  }
}

export function trackStatusColor(
  status: PointStatus,
  green: string,
  amber: string,
  indigo: string,
  teal: string,
): string {
  if (status === 'ordered') return green
  if (status === 'client_ordered') return teal
  if (status === 'remote_ordered') return indigo
  if (status === 'visited') return amber
  return '#9ca3af'
}
