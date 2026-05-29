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

export function TrackingMap({ points, startCity, endCity, D, height = 280, empLocation }: TrackingMapProps) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const mapRef        = useRef<L.Map | null>(null);
  const tileLayerRef  = useRef<L.TileLayer | null>(null);

  const [activeLayer, setActiveLayer] = useState<LayerId>('standard');

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const allCoords     = points.map(p => [p.lat, p.lng] as [number, number]);
    const visited       = points.filter(p => p.status !== 'missed');
    const visitedCoords = visited.map(p => [p.lat, p.lng] as [number, number]);

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
      zoomControl: true,
      attributionControl: false,
      scrollWheelZoom: true,
      fadeAnimation: true,
      zoomAnimation: false,
    });
    mapRef.current = map;

    const tile = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      subdomains: ['a', 'b', 'c'],
    }).addTo(map);
    tileLayerRef.current = tile;

    if (D) {
      const tilePane = map.getPane('tilePane');
      if (tilePane) {
        tilePane.style.filter = 'invert(1) hue-rotate(180deg) brightness(0.85) saturate(0.7)';
      }
    }

    if (allCoords.length > 1) {
      L.polyline(allCoords, {
        color: D ? '#4b5563' : '#9ca3af',
        weight: 2,
        opacity: 0.5,
        dashArray: '5 8',
      }).addTo(map);
    }

    if (visitedCoords.length > 1) {
      L.polyline(visitedCoords, {
        color: '#6366f1',
        weight: 3.5,
        opacity: 0.95,
      }).addTo(map);
    }

    points.forEach((p, i) => {
      const isFirst = i === 0;
      const isLast  = i === points.length - 1;

      const markerColor =
        p.status === 'ordered'       ? '#10b981' :
        p.status === 'visited'       ? '#f59e0b' :
        p.status === 'remote_ordered'? '#6366f1' :
        '#9ca3af';

      const borderColor = D ? '#1a1a1a' : '#ffffff';

      // Truncate name for label
      const shortName = p.name.length > 16 ? p.name.slice(0, 15) + '…' : p.name;

      // ── Icon: pill label with colored dot + name ──────────────────────────
      let iconHtml: string;
      let iconW: number;
      let iconH: number;

      if (isFirst) {
        iconW = 36; iconH = 36;
        iconHtml = `
          <div style="
            width:36px;height:36px;border-radius:50%;
            background:${markerColor};border:3px solid ${borderColor};
            box-shadow:0 3px 12px rgba(0,0,0,0.35);
            display:flex;align-items:center;justify-content:center;cursor:pointer;
          ">
            <svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2.5' stroke-linecap='round'>
              <circle cx='12' cy='12' r='4'/>
              <line x1='12' y1='2' x2='12' y2='5'/>
              <line x1='12' y1='19' x2='12' y2='22'/>
              <line x1='2' y1='12' x2='5' y2='12'/>
              <line x1='19' y1='12' x2='22' y2='12'/>
            </svg>
          </div>`;
      } else if (isLast) {
        iconW = 36; iconH = 36;
        iconHtml = `
          <div style="
            width:36px;height:36px;border-radius:50%;
            background:${markerColor};border:3px solid ${borderColor};
            box-shadow:0 3px 12px rgba(0,0,0,0.35);
            display:flex;align-items:center;justify-content:center;cursor:pointer;
          ">
            <svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'>
              <path d='M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z'/>
              <circle cx='12' cy='10' r='3'/>
            </svg>
          </div>`;
      } else {
        // Pill label: colored left bar + name text
        const labelBg    = D ? 'rgba(30,30,30,0.97)' : 'rgba(255,255,255,0.97)';
        const labelTxt   = D ? '#f9fafb' : '#111827';
        const estW = Math.max(90, shortName.length * 7 + 26);
        iconW = estW; iconH = 26;
        iconHtml = `
          <div style="
            display:inline-flex;align-items:center;gap:5px;
            background:${labelBg};
            border:1.5px solid ${markerColor};
            border-radius:20px;
            padding:0 9px 0 7px;
            height:26px;
            box-shadow:0 2px 8px rgba(0,0,0,0.22);
            cursor:pointer;white-space:nowrap;
          ">
            <div style="
              width:8px;height:8px;border-radius:50%;
              background:${markerColor};flex-shrink:0;
            "></div>
            <span style="
              font-size:10.5px;font-weight:600;
              color:${labelTxt};
              font-family:system-ui,sans-serif;
              line-height:1;
            ">${shortName}</span>
          </div>`;
      }

      const icon = L.divIcon({
        className: '',
        html: iconHtml,
        iconSize:    [iconW, iconH],
        iconAnchor:  [iconW / 2, iconH / 2],
        popupAnchor: [0, -(iconH / 2) - 4],
      });

      const statusBadge =
        p.status === 'ordered'        ? `<span style="color:#10b981;font-weight:700">✓ Borildi, zakaz olindi</span>` :
        p.status === 'visited'        ? `<span style="color:#f59e0b;font-weight:700">✓ Borildi, zakaz olinmadi</span>` :
        p.status === 'remote_ordered' ? `<span style="color:#6366f1;font-weight:700">📞 Bormay, zakaz olindi</span>` :
        `<span style="color:#9ca3af">✗ Borilmadi, zakaz olinmadi</span>`;

      const popupHtml = `
        <div style="font-family:system-ui,sans-serif;padding:6px 2px;min-width:180px">
          <div style="font-weight:700;font-size:13px;margin-bottom:3px;color:#111827">${p.name}</div>
          <div style="font-size:11px;color:#6b7280;margin-bottom:8px">${p.address}</div>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
            <div style="font-size:11px">${statusBadge}</div>
            ${p.time ? `<div style="font-size:11px;color:#6b7280">🕐 ${p.time}</div>` : ''}
          </div>
        </div>
      `;

      L.marker([p.lat, p.lng], { icon })
        .bindPopup(L.popup({ maxWidth: 220, className: 'lider-tracking-popup' }).setContent(popupHtml))
        .addTo(map);
    });

    if (allCoords.length > 1) {
      try {
        map.fitBounds(L.latLngBounds(allCoords), { padding: [40, 40], maxZoom: 14 });
      } catch {
        map.setView(center, 12);
      }
    }

    const sizeTimer = setTimeout(() => {
      if (mapRef.current) map.invalidateSize();
    }, 150);

    // ── Employee location marker ──────────────────────────────────────────
    if (empLocation) {
      const pulseColor = empLocation.online ? '#10b981' : '#9ca3af';
      const empIcon = L.divIcon({
        className: '',
        html: `
          <div style="position:relative;width:46px;height:46px;display:flex;align-items:center;justify-content:center;">
            ${empLocation.online ? `
              <div style="position:absolute;inset:0;border-radius:50%;background:${pulseColor};opacity:0.15;animation:empPulse 2s ease-in-out infinite;"></div>
              <div style="position:absolute;inset:6px;border-radius:50%;background:${pulseColor};opacity:0.2;animation:empPulse 2s ease-in-out infinite .4s;"></div>
            ` : ''}
            <div style="
              width:26px;height:26px;border-radius:50%;
              background:${pulseColor};
              border:3px solid white;
              box-shadow:0 4px 14px rgba(0,0,0,0.35);
              display:flex;align-items:center;justify-content:center;
              position:relative;z-index:1;
            ">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
          </div>
        `,
        iconSize:    [46, 46],
        iconAnchor:  [23, 23],
        popupAnchor: [0, -26],
      });

      const empPopup = `
        <div style="font-family:system-ui,sans-serif;padding:6px 2px;min-width:160px">
          <div style="font-weight:700;font-size:13px;color:#111827;margin-bottom:4px;display:flex;align-items:center;gap:6px">
            <div style="width:8px;height:8px;border-radius:50%;background:${pulseColor};flex-shrink:0"></div>
            ${empLocation.online ? 'Online' : 'Offline'}
          </div>
          <div style="font-size:11px;color:#6b7280">${empLocation.lastSeen ?? ''}</div>
        </div>
      `;

      L.marker([empLocation.lat, empLocation.lng], { icon: empIcon, zIndexOffset: 1000 })
        .bindPopup(L.popup({ maxWidth: 200, className: 'lider-tracking-popup' }).setContent(empPopup))
        .addTo(map);
    }

    return () => {
      clearTimeout(sizeTimer);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        tileLayerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !tileLayerRef.current) return;
    switchTileLayer(mapRef.current, tileLayerRef, activeLayer, D);
  }, [activeLayer]);

  return (
    <div style={{ width: '100%', height, position: 'relative', overflow: 'hidden' }}>
      <style>{`
        .lider-tracking-popup .leaflet-popup-content-wrapper {
          border-radius: 12px !important;
          box-shadow: 0 8px 24px rgba(0,0,0,0.18) !important;
          padding: 0 !important;
          border: 1px solid #e5e7eb !important;
        }
        .lider-tracking-popup .leaflet-popup-content {
          margin: 12px 14px !important;
        }
        .lider-tracking-popup .leaflet-popup-close-button {
          top: 8px !important; right: 8px !important;
          width: 22px !important; height: 22px !important;
          font-size: 18px !important; color: #6b7280 !important;
          padding: 0 !important; display: flex !important;
          align-items: center !important; justify-content: center !important;
          border-radius: 50% !important; background: #f3f4f6 !important;
          border: none !important;
        }
        .lider-tracking-popup .leaflet-popup-close-button:hover {
          color: #111827 !important; background: #e5e7eb !important;
        }
        .leaflet-control-zoom { border: none !important; box-shadow: 0 2px 8px rgba(0,0,0,0.2) !important; }
        .leaflet-control-zoom a {
          border-radius: 8px !important; border: none !important;
          width: 30px !important; height: 30px !important;
          line-height: 30px !important; font-size: 16px !important;
          color: #374151 !important; background: rgba(255,255,255,0.95) !important;
          margin-bottom: 3px !important;
        }
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