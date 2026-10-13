import { api } from '../api/client';
import type { DailyTracking, GpsTrailPoint, TrackingOrder, TrackingVisit } from '../api/agentTrackingTypes';

export type PointStatus = 'ordered' | 'visited' | 'missed' | 'remote_ordered' | 'client_ordered';
export interface TrackPoint {
  idx: number; clientId: string; name: string; address: string; lineName: string;
  lat: number; lng: number; hasCoords: boolean; status: PointStatus; time: string | null;
  duration: number | null; visits: TrackingVisit[]; orders: TrackingOrder[]; visitUnverified: boolean;
}
export interface DayTrack {
  date: string; label: string; total: number; visited: number; visitedNoOrder: number;
  remoteOrdered: number; clientOrdered: number; missed: number; noGps: number; km: number;
  startCity: string; endCity: string; loginTime: string; firstPointTime: string; lastPointTime: string;
  onlineHours: string; empLat: number | null; empLng: number | null; empOnline: boolean;
  empLastSeen: string; points: TrackPoint[]; gpsTrail: GpsTrailPoint[]; hasRealLocation: boolean;
  visits: TrackingVisit[]; clientOrders: TrackingOrder[]; warnings: string[];
}
export function tashkentDate(value: Date = new Date()): string {
  if (!Number.isFinite(+value)) return '';
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent' }).format(value);
}
export function fmtClock(iso: string | null | undefined): string {
  if (!iso || !Number.isFinite(+new Date(iso))) return '—';
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Tashkent', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso));
}
export function emptyDayTrack(date: string): DayTrack {
  const dt = new Date(`${date}T12:00:00Z`);
  const months = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
  return { date, label: `${['Yak', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'][dt.getUTCDay()]}, ${dt.getUTCDate()} ${months[dt.getUTCMonth()]}`,
    total: 0, visited: 0, visitedNoOrder: 0, remoteOrdered: 0, clientOrdered: 0, missed: 0, noGps: 0, km: 0,
    startCity: '—', endCity: '—', loginTime: '—', firstPointTime: '—', lastPointTime: '—', onlineHours: '—',
    empLat: null, empLng: null, empOnline: false, empLastSeen: '—', points: [], gpsTrail: [], hasRealLocation: false,
    visits: [], clientOrders: [], warnings: [] };
}
export async function fetchDayTrack(opts: {
  distributorId: string; dateStr: string; companyIds?: string[]; empOnline: boolean; empLat?: number | null; empLng?: number | null;
  lastLocationAt?: string | null; lastLoginAt?: string | null;
  labels?: { min: string; hour: string; onlineNow: string; route: string };
}): Promise<DayTrack> {
  const data: DailyTracking = await api.getDailyTracking(opts.distributorId, opts.dateStr, opts.companyIds?.join(','));
  const labels = opts.labels ?? { min: 'daq', hour: 'soat', onlineNow: 'Hozir online', route: 'Marshrut' };
  const points: TrackPoint[] = data.points.map((p, i) => ({ ...p, idx: i + 1,
    lat: p.lat == null ? 0 : Number(p.lat), lng: p.lng == null ? 0 : Number(p.lng),
    time: p.visits.length ? fmtClock(p.visits[0].arrivedAt) : null,
    duration: p.visits.length ? p.visits.reduce((sum, v) => sum + v.durationMinutes, 0) : null }));
  const today = opts.dateStr === tashkentDate();
  const lastGps = data.gpsTrail[data.gpsTrail.length - 1];
  const liveValid = opts.empLat != null && opts.empLng != null && Number.isFinite(Number(opts.empLat))
    && Number.isFinite(Number(opts.empLng)) && Math.abs(Number(opts.empLat)) <= 90 && Math.abs(Number(opts.empLng)) <= 180
    && !(Number(opts.empLat) === 0 && Number(opts.empLng) === 0)
    && !!opts.lastLocationAt && tashkentDate(new Date(opts.lastLocationAt)) === opts.dateStr;
  const pos = today && liveValid ? { lat: Number(opts.empLat), lng: Number(opts.empLng) } : lastGps;
  const empOnline = today && opts.empOnline;
  const firstVisit = data.visits[0], lastVisit = data.visits[data.visits.length - 1];
  const name = (id: string | undefined) => points.find(p => p.clientId === id)?.name ?? '—';
  const minutes = data.stats.observedMinutes;
  return { ...emptyDayTrack(opts.dateStr), points, visits: data.visits, clientOrders: data.clientOrders,
    warnings: data.warnings, gpsTrail: data.gpsTrail, total: data.stats.total, visited: data.stats.ordered,
    visitedNoOrder: data.stats.visited, remoteOrdered: data.stats.remoteOrdered, missed: data.stats.missed,
    noGps: data.stats.noGps, clientOrdered: data.stats.clientOrdered, km: data.stats.totalDistanceKm,
    startCity: name(firstVisit?.clientId), endCity: name(lastVisit?.clientId),
    firstPointTime: fmtClock(firstVisit?.arrivedAt), lastPointTime: fmtClock(lastVisit?.arrivedAt),
    loginTime: opts.lastLoginAt && tashkentDate(new Date(opts.lastLoginAt)) === opts.dateStr ? fmtClock(opts.lastLoginAt) : '—',
    onlineHours: minutes > 0 ? `${Math.floor(minutes / 60)} ${labels.hour} ${minutes % 60} ${labels.min}` : '—',
    empLat: pos?.lat ?? null, empLng: pos?.lng ?? null, empOnline,
    empLastSeen: empOnline ? labels.onlineNow : (lastGps ? fmtClock(lastGps.recordedAt) : '—'), hasRealLocation: !!pos };
}
