import { useEffect, useRef, useState } from 'react';
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
}

const NAVOIY: [number, number] = [40.0843, 65.3791];

function makePointIcon(
  p: MapPoint,
  i: number,
  total: number,
  D: boolean,
): L.DivIcon {
  const isFirst = i === 0;
  const isLast  = i === total - 1;
  const markerColor =
    p.status === 'ordered'        ? '#10b981' :
    p.status === 'visited'        ? '#f59e0b' :
    p.status === 'remote_ordered' ? '#6366f1' :
    '#9ca3af';
  const borderColor = D ? '#1a1a1a' : '#ffffff';
  const shortName = p.name.length > 16 ? p.name.slice(0, 15) + '…' : p.name;

  if (isFirst) {
    return L.divIcon({
      className: '',
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -20],
      html: `
        <div style="width:36px;height:36px;border-radius:50%;background:${markerColor};border:3px solid ${borderColor};
          box-shadow:0 3px 12px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;cursor:pointer;">
          <svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2.5' stroke-linecap='round'>
            <circle cx='12' cy='12' r='4'/><line x1='12' y1='2' x2='12' y2='5'/><line x1='12' y1='19' x2='12' y2='22'/>
            <line x1='2' y1='12' x2='5' y2='12'/><line x1='19' y1='12' x2='22' y2='12'/>
          </svg>
        </div>`,
    });
  }

  if (isLast) {
    return L.divIcon({
      className: '',
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -20],
      html: `
        <div style="width:36px;height:36px;border-radius:50%;background:${markerColor};border:3px solid ${borderColor};
          box-shadow:0 3px 12px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;cursor:pointer;">
          <svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'>
            <path d='M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z'/><circle cx='12' cy='10' r='3'/>
          </svg>
        </div>`,
    });
  }

  const labelBg  = D ? 'rgba(30,30,30,0.97)' : 'rgba(255,255,255,0.97)';
  const labelTxt = D ? '#f9fafb' : '#111827';
  const estW = Math.max(90, shortName.length * 7 + 26);
  return L.divIcon({
    className: '',
    iconSize: [estW, 26],
    iconAnchor: [estW / 2, 13],
    popupAnchor: [0, -16],
    html: `
      <div style="display:inline-flex;align-items:center;gap:5px;background:${labelBg};
        border:1.5px solid ${markerColor};border-radius:20px;padding:0 9px 0 7px;height:26px;
        box-shadow:0 2px 8px rgba(0,0,0,0.22);cursor:pointer;white-space:nowrap;">
        <div style="width:8px;height:8px;border-radius:50%;background:${markerColor};flex-shrink:0;"></div>
        <span style="font-size:10.5px;font-weight:600;color:${labelTxt};font-family:system-ui,sans-serif;line-height:1;">${shortName}</span>
      </div>`,
  });
}

function statusBadge(p: MapPoint): string {
  if (p.status === 'ordered')        return `<span style="color:#10b981;font-weight:700">✓ Borildi, zakaz olindi</span>`;
  if (p.status === 'visited')        return `<span style="color:#f59e0b;font-weight:700">✓ Borildi, zakaz olinmadi</span>`;
  if (p.status === 'remote_ordered') return `<span style="color:#6366f1;font-weight:700">📞 Bormay, zakaz olindi</span>`;
  return `<span style="color:#9ca3af">✗ Borilmadi, zakaz olinmadi</span>`;
}

export function TrackingMap({ points, startCity, endCity, D, height = 280, empLocation }: TrackingMapProps) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const mapRef        = useRef<L.Map | null>(null);
  const tileLayerRef  = useRef<L.TileLayer | null>(null);
  const layersRef     = useRef<L.Layer[]>([]);

  const [activeLayer, setActiveLayer] = useState<LayerId>('standard');

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const allCoords: [number, number][] = points.map(p => [p.lat, p.lng]);
    const visitedCoords = points.filter(p => p.status !== 'missed').map(p => [p.lat, p.lng] as [number, number]);

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

    if (allCoords.length > 1) {
      const route = L.polyline(allCoords, {
        color: D ? '#4b5563' : '#9ca3af',
        weight: 2,
        opacity: 0.5,
      }).addTo(map);
      added.push(route);
    }

    if (visitedCoords.length > 1) {
      const visitedRoute = L.polyline(visitedCoords, {
        color: '#6366f1',
        weight: 3.5,
        opacity: 0.95,
      }).addTo(map);
      added.push(visitedRoute);
    }

    points.forEach((p, i) => {
      const popupHtml = `
        <div style="padding:6px 2px;min-width:180px;font-family:system-ui,sans-serif;">
          <div style="font-weight:700;font-size:13px;margin-bottom:3px;color:#111827">${p.name}</div>
          <div style="font-size:11px;color:#6b7280;margin-bottom:8px">${p.address}</div>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
            <div style="font-size:11px">${statusBadge(p)}</div>
            ${p.time ? `<div style="font-size:11px;color:#6b7280">🕐 ${p.time}</div>` : ''}
          </div>
        </div>`;

      const marker = L.marker([p.lat, p.lng], {
        icon: makePointIcon(p, i, points.length, D),
      });
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
            ${empLocation.online ? 'Online' : 'Offline'}
          </div>
          <div style="font-size:11px;color:#6b7280">${empLocation.lastSeen ?? ''}</div>
        </div>`, { className: 'lider-tracking-popup' });
      empMarker.addTo(map);
      added.push(empMarker);
    }

    layersRef.current = added;

    if (allCoords.length > 1) {
      map.fitBounds(L.latLngBounds(allCoords), { padding: [30, 30], maxZoom: 14 });
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
