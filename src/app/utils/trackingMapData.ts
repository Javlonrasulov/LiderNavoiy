import type { GpsTrailPoint, TrackingVisit } from '../api/agentTrackingTypes';

export interface MovementSegment { coords: [number, number][]; gap: boolean; sequence?: number }
export function splitGpsTrack(trail: GpsTrailPoint[]): MovementSegment[] {
  const segments: MovementSegment[] = [];
  let current: [number, number][] = [];
  trail.forEach((p, i) => {
    if (p.breakBefore && i > 0) {
      if (current.length > 1) segments.push({ coords: current, gap: false });
      segments.push({ coords: [[trail[i - 1].lat, trail[i - 1].lng], [p.lat, p.lng]], gap: true });
      current = [];
    }
    current.push([p.lat, p.lng]);
  });
  if (current.length > 1) segments.push({ coords: current, gap: false });
  return segments;
}

export function visitMovements(visits: TrackingVisit[], points: { clientId: string; lat: number; lng: number; hasCoords: boolean }[], trail: GpsTrailPoint[]): MovementSegment[] {
  const byId = new Map(points.map(p => [p.clientId, p]));
  const bound = (time: string, upper: boolean) => {
    let lo = 0, hi = trail.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (trail[mid].recordedAt < time || (upper && trail[mid].recordedAt === time)) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };
  return visits.slice(1).flatMap((visit, i) => {
    const previous = visits[i];
    const start = byId.get(previous.clientId), end = byId.get(visit.clientId);
    if (!start?.hasCoords || !end?.hasCoords) return [];
    const fixes = trail.slice(bound(previous.departedAt, false), bound(visit.arrivedAt, true));
    // Always distinguish shop-to-fix links and unrecorded movement from measured GPS geometry.
    if (fixes.length < 2) return [{ coords: [[start.lat, start.lng], [end.lat, end.lng]] as [number, number][], gap: true, sequence: visit.sequence }];
    return [
      { coords: [[start.lat, start.lng], [fixes[0].lat, fixes[0].lng]] as [number, number][], gap: true },
      ...splitGpsTrack(fixes),
      { coords: [[fixes[fixes.length - 1].lat, fixes[fixes.length - 1].lng], [end.lat, end.lng]] as [number, number][], gap: true },
    ].map(s => ({ ...s, sequence: visit.sequence }));
  });
}

/** Never interpolate across a missing GPS interval. */
export function replayPosition(trail: GpsTrailPoint[], progress: number) {
  if (!trail.length) return null;
  const target = +new Date(trail[0].recordedAt) + Math.max(0, Math.min(1, progress)) * (+new Date(trail[trail.length - 1].recordedAt) - +new Date(trail[0].recordedAt));
  let lo = 0, hi = trail.length - 1;
  while (lo < hi) { const mid = Math.ceil((lo + hi) / 2); if (+new Date(trail[mid].recordedAt) <= target) lo = mid; else hi = mid - 1; }
  const a = trail[lo], b = trail[lo + 1];
  if (!b || b.breakBefore) return { lat: a.lat, lng: a.lng, recordedAt: a.recordedAt, gap: !!b?.breakBefore };
  const duration = +new Date(b.recordedAt) - +new Date(a.recordedAt);
  const fraction = duration > 0 ? (target - +new Date(a.recordedAt)) / duration : 0;
  return { lat: a.lat + (b.lat - a.lat) * fraction, lng: a.lng + (b.lng - a.lng) * fraction, recordedAt: new Date(target).toISOString(), gap: false };
}
