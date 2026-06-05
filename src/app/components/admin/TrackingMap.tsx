import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  MapLayerSwitcher,
  switchTileLayer,
  type LayerId,
} from '../MapLayerSwitcher';

type PointStatus = 'ordered' | 'visited' | 'missed' | 'remote_ordered';

interface MapPoint {
  idx: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  status: PointStatus;
  time: string | null;
}

interface TrackingMapProps {
  points: MapPoint[];
  startCity: string;
  endCity: string;
  D: boolean;
  height?: number;
  empLocation?: { lat: number; lng: number; online: boolean; lastSeen?: string };
  t?: Record<string, string>;
}

const NAVOIY: [number, number] = [40.0843, 65.3791];

function tr(t: Record<string, string> | undefined, key: string, fallback: string): string {
  return t?.[key] || fallback;
}

function isVisitedOnSite(status: PointStatus): boolean {
  return status === 'ordered' || status === 'visited';
}

function statusColor(status: PointStatus): string {
  if (status === 'ordered') return '#10b981';
  if (status === 'visited') return '#f59e0b';
  if (status === 'remote_ordered') return '#6366f1';
  return '#9ca3af';
}

/** Ekranda ko'rinadigan yo'nalish — xarita proyeksiyasiga mos */
function screenAngle(map: L.Map, lat1: number, lng1: number, lat2: number, lng2: number): number {
  const p1 = map.latLngToContainerPoint([lat1, lng1]);
  const p2 = map.latLngToContainerPoint([lat2, lng2]);
  return (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180) / Math.PI;
}

function makeVisitedIcon(p: MapPoint, visitOrder: number, D: boolean): L.DivIcon {
  const markerColor = statusColor(p.status);
  const borderColor = D ? '#1a1a1a' : '#ffffff';
  const shortName = p.name.length > 14 ? `${p.name.slice(0, 13)}…` : p.name;

  return L.divIcon({
    className: '',
    iconSize: [36, 52],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;">
        <div style="width:34px;height:34px;border-radius:50%;background:${markerColor};border:3px solid ${borderColor};
          box-shadow:0 3px 12px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;">
          <span style="font-size:13px;font-weight:800;color:#fff;font-family:system-ui,sans-serif;line-height:1;">${visitOrder}</span>
        </div>
        <div style="max-width:88px;padding:2px 6px;border-radius:6px;background:${D ? 'rgba(30,30,30,0.92)' : 'rgba(255,255,255,0.95)'};
          border:1px solid ${markerColor}55;box-shadow:0 1px 4px rgba(0,0,0,0.15);">
          <span style="font-size:9px;font-weight:600;color:${D ? '#f9fafb' : '#111827'};font-family:system-ui,sans-serif;
            display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center;">${shortName}</span>
        </div>
      </div>`,
  });
}

function makeMissedIcon(D: boolean): L.DivIcon {
  const borderColor = D ? '#1a1a1a' : '#ffffff';
  return L.divIcon({
    className: '',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10],
    html: `
      <div style="width:14px;height:14px;border-radius:50%;background:#9ca3af;border:2px solid ${borderColor};
        box-shadow:0 1px 4px rgba(0,0,0,0.25);opacity:0.75;cursor:pointer;"></div>`,
  });
}

function makeRemoteIcon(D: boolean): L.DivIcon {
  const borderColor = D ? '#1a1a1a' : '#ffffff';
  return L.divIcon({
    className: '',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -12],
    html: `
      <div style="width:22px;height:22px;border-radius:50%;background:#6366f1;border:2px solid ${borderColor};
        box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;cursor:pointer;opacity:0.9;">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
        </svg>
      </div>`,
  });
}

function makeArrowIcon(angle: number, color: string): L.DivIcon {
  return L.divIcon({
    className: '',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    html: `
      <div style="width:22px;height:22px;display:flex;align-items:center;justify-content:center;transform:rotate(${angle}deg);">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M3 8 H13 M10 5 L13 8 L10 11" stroke="${color}" stroke-width="2.5"
            stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>`,
  });
}

function statusBadge(p: MapPoint, t?: Record<string, string>): string {
  if (p.status === 'ordered') {
    return `<span style="color:#10b981;font-weight:700">${tr(t, 'trackMapPopupOrdered', '✓ Borildi, zakaz olindi')}</span>`;
  }
  if (p.status === 'visited') {
    return `<span style="color:#f59e0b;font-weight:700">${tr(t, 'trackMapPopupVisited', '✓ Borildi, zakaz olinmadi')}</span>`;
  }
  if (p.status === 'remote_ordered') {
    return `<span style="color:#6366f1;font-weight:700">${tr(t, 'trackMapPopupRemote', '📞 Bormay, zakaz olindi')}</span>`;
  }
  return `<span style="color:#9ca3af">${tr(t, 'trackMapPopupMissed', '✗ Borilmadi, zakaz olinmadi')}</span>`;
}

function addDirectionArrows(
  map: L.Map,
  pathPoints: MapPoint[],
  color: string,
  added: L.Layer[],
) {
  for (let i = 0; i < pathPoints.length - 1; i++) {
    const p1 = pathPoints[i];
    const p2 = pathPoints[i + 1];
    const midLat = (p1.lat + p2.lat) / 2;
    const midLng = (p1.lng + p2.lng) / 2;
    const angle = screenAngle(map, p1.lat, p1.lng, p2.lat, p2.lng);
    const arrow = L.marker([midLat, midLng], {
      icon: makeArrowIcon(angle, color),
      interactive: false,
      zIndexOffset: 200 + i,
    });
    arrow.addTo(map);
    added.push(arrow);
  }
}

export function TrackingMap({ points, D, height = 280, empLocation, t }: TrackingMapProps) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const mapRef        = useRef<L.Map | null>(null);
  const tileLayerRef  = useRef<L.TileLayer | null>(null);
  const layersRef     = useRef<L.Layer[]>([]);

  const [activeLayer, setActiveLayer] = useState<LayerId>('standard');

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const orderedPoints = [...points].sort((a, b) => a.idx - b.idx);
    const visitedPath = orderedPoints.filter(p => isVisitedOnSite(p.status));
    const visitOrderMap = new Map<number, number>();
    visitedPath.forEach((p, i) => visitOrderMap.set(p.idx, i + 1));

    const allCoords: [number, number][] = orderedPoints.map(p => [p.lat, p.lng]);

    let center: [number, number] = NAVOIY;
    if (allCoords.length > 0) {
      center = [
        allCoords.reduce((s, c) => s + c[0], 0) / allCoords.length,
        allCoords.reduce((s, c) => s + c[1], 0) / allCoords.length,
      ];
    }

    const map = L.map(containerRef.current, {
      center,
      zoom: 12,
      zoomControl: false,
      attributionControl: false,
    });
    switchTileLayer(map, tileLayerRef, activeLayer, D);
    mapRef.current = map;

    const added: L.Layer[] = [];
    const routeColor = '#6366f1';

    if (visitedPath.length > 1) {
      const routeCoords = visitedPath.map(p => [p.lat, p.lng] as [number, number]);
      const visitedRoute = L.polyline(routeCoords, {
        color: routeColor,
        weight: 4,
        opacity: 0.95,
      }).addTo(map);
      added.push(visitedRoute);
      addDirectionArrows(map, visitedPath, routeColor, added);
    }

    orderedPoints.forEach(p => {
      const visitOrder = visitOrderMap.get(p.idx);
      const popupTitle = visitOrder
        ? `#${visitOrder} · ${p.name}`
        : p.name;

      const popupHtml = `
        <div style="padding:6px 2px;min-width:180px;font-family:system-ui,sans-serif;">
          <div style="font-weight:700;font-size:13px;margin-bottom:2px;color:#111827">${popupTitle}</div>
          <div style="font-size:11px;color:#6b7280;margin-bottom:8px">${p.address}</div>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
            <div style="font-size:11px">${statusBadge(p, t)}</div>
            ${p.time ? `<div style="font-size:11px;color:#6b7280">🕐 ${p.time}</div>` : ''}
          </div>
        </div>`;

      let icon: L.DivIcon;
      let zIndex = 0;
      if (visitOrder != null) {
        icon = makeVisitedIcon(p, visitOrder, D);
        zIndex = visitOrder;
      } else if (p.status === 'remote_ordered') {
        icon = makeRemoteIcon(D);
        zIndex = -10;
      } else {
        icon = makeMissedIcon(D);
        zIndex = -20;
      }

      const marker = L.marker([p.lat, p.lng], { icon, zIndexOffset: zIndex });
      marker.bindPopup(popupHtml, { className: 'lider-tracking-popup' });
      marker.addTo(map);
      added.push(marker);
    });

    if (empLocation) {
      const pulseColor = empLocation.online ? '#10b981' : '#9ca3af';
      const empIcon = L.divIcon({
        className: '',
        iconSize: [46, 46],
        iconAnchor: [23, 23],
        popupAnchor: [0, -24],
        html: `
          <div style="position:relative;width:46px;height:46px;display:flex;align-items:center;justify-content:center;">
            ${empLocation.online ? `
              <div style="position:absolute;inset:0;border-radius:50%;background:${pulseColor};opacity:0.15;animation:empPulse 2s ease-in-out infinite;"></div>
              <div style="position:absolute;inset:6px;border-radius:50%;background:${pulseColor};opacity:0.2;animation:empPulse 2s ease-in-out infinite .4s;"></div>
            ` : ''}
            <div style="width:26px;height:26px;border-radius:50%;background:${pulseColor};border:3px solid white;
              box-shadow:0 4px 14px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;position:relative;z-index:1;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
          </div>`,
      });
      const empMarker = L.marker([empLocation.lat, empLocation.lng], { icon: empIcon, zIndexOffset: 1000 });
      empMarker.bindPopup(`
        <div style="padding:6px 2px;min-width:160px;font-family:system-ui,sans-serif;">
          <div style="font-weight:700;font-size:13px;color:#111827;margin-bottom:4px;display:flex;align-items:center;gap:6px">
            <div style="width:8px;height:8px;border-radius:50%;background:${pulseColor};flex-shrink:0"></div>
            ${empLocation.online ? tr(t, 'trackOnlineNow', 'Hozir online') : tr(t, 'trackOffline', 'Offline')}
          </div>
          <div style="font-size:11px;color:#6b7280">${empLocation.lastSeen ?? ''}</div>
        </div>`, { className: 'lider-tracking-popup' });
      empMarker.addTo(map);
      added.push(empMarker);
    }

    layersRef.current = added;

    if (allCoords.length > 0) {
      map.fitBounds(L.latLngBounds(allCoords), { padding: [40, 40], maxZoom: 14 });
    }

    return () => {
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
      layersRef.current = [];
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    switchTileLayer(map, tileLayerRef, activeLayer, D);
  }, [activeLayer, D]);

  return (
    <div style={{ width: '100%', height, position: 'relative', overflow: 'hidden' }}>
      <style>{`
        .lider-tracking-popup { font-family: system-ui, sans-serif; }
        @keyframes empPulse {
          0%, 100% { transform: scale(1); opacity: 0.15; }
          50% { transform: scale(1.6); opacity: 0; }
        }
      `}</style>

      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      <MapLayerSwitcher
        activeLayer={activeLayer}
        onChange={setActiveLayer}
        bottom={50}
        left={12}
      />
    </div>
  );
}
