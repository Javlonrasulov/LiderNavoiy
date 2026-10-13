export type TrackingStatus = 'ordered' | 'visited' | 'remote_ordered' | 'missed';
export interface TrackingOrder {
  id: string; clientId: string; createdAt: string; source: string; status: string;
  totalAmount: number; returnedAmount: number; netAmount: number; clientName?: string | null;
}
export interface TrackingVisit {
  clientId: string; arrivedAt: string; departedAt: string; durationMinutes: number;
  evidence: 'gps_dwell' | 'check_in'; sequence: number;
}
export interface GpsTrailPoint { lat: number; lng: number; recordedAt: string; breakBefore?: boolean }
export interface DailyTracking {
  date: string; distributorId: string;
  points: { idx: number; clientId: string; name: string; address: string; lineName: string;
    lat: number | null; lng: number | null; hasCoords: boolean; status: TrackingStatus;
    visits: TrackingVisit[]; orders: TrackingOrder[]; visitUnverified: boolean }[];
  visits: TrackingVisit[]; clientOrders: TrackingOrder[]; gpsTrail: GpsTrailPoint[]; warnings: string[];
  stats: { total: number; ordered: number; visited: number; remoteOrdered: number; missed: number;
    noGps: number; clientOrdered: number; unverified: number; totalDistanceKm: number; observedMinutes: number };
}
