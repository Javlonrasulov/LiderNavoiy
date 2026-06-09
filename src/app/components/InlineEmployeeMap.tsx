import { useEffect, useRef, useState } from 'react';
import { Wifi, WifiOff, Maximize2 } from 'lucide-react';
import L from 'leaflet';
import { MapLayerSwitcher, switchTileLayer, type LayerId } from './MapLayerSwitcher';
import type { EmployeeMarker } from './EmployeeMapModal';

interface Props {
  employees: EmployeeMarker[];
  centerCoord: [number, number];
  initialZoom?: number;
  dark: boolean;
  height?: number;
  t: Record<string, string>;
  onExpand?: () => void;
}

const NAVOIY: [number, number] = [40.0843, 65.3791];

function makeMarkerIcon(role: 'agent' | 'delivery', online: boolean) {
  const bg = role === 'agent'
    ? (online ? '#6366f1' : '#6b7280')
    : (online ? '#10b981' : '#6b7280');
  const border = role === 'agent'
    ? (online ? '#a5b4fc' : '#9ca3af')
    : (online ? '#6ee7b7' : '#9ca3af');
  return L.divIcon({
    className: '',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -18],
    html: `<div style="width:30px;height:30px;border-radius:50%;background:${bg};border:2.5px solid ${border};box-shadow:0 2px 6px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;position:relative;">
      ${role === 'delivery' ? '🚚' : '👤'}
      ${online ? `<span style="position:absolute;bottom:0;right:0;width:8px;height:8px;background:#22c55e;border-radius:50%;border:2px solid #fff;"></span>` : ''}
    </div>`,
  });
}

export function InlineEmployeeMap({
  employees,
  centerCoord,
  initialZoom = 13,
  dark,
  height = 220,
  t,
  onExpand,
}: Props) {
  const mapRef     = useRef<L.Map | null>(null);
  const divRef     = useRef<HTMLDivElement>(null);
  const tileRef    = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [activeLayer, setActiveLayer] = useState<LayerId>('standard');

  useEffect(() => {
    if (!divRef.current || mapRef.current) return;

    const safeLat = isFinite(centerCoord[0]) ? centerCoord[0] : NAVOIY[0];
    const safeLng = isFinite(centerCoord[1]) ? centerCoord[1] : NAVOIY[1];

    const map = L.map(divRef.current, {
      center: [safeLat, safeLng],
      zoom: initialZoom,
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
      zoomAnimation: false,
    });
    switchTileLayer(map, tileRef, activeLayer, dark);
    mapRef.current = map;

    setTimeout(() => map.invalidateSize(true), 100);

    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    switchTileLayer(map, tileRef, activeLayer, dark);
  }, [activeLayer, dark]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!isFinite(centerCoord[0]) || !isFinite(centerCoord[1])) return;
    map.setView(centerCoord, initialZoom, { animate: false });
  }, [centerCoord[0], centerCoord[1], initialZoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    employees.filter(e => !onlineOnly || e.online).forEach(emp => {
      const roleLabel   = emp.role === 'agent' ? (t.empRoleAgent || 'Agent') : (t.empRoleDelivery || 'Dostavkachi');
      const statusColor = emp.online ? '#22c55e' : '#ef4444';
      const statusLabel = emp.online ? (t.empOnline || 'Online') : (t.empOffline || 'Offline');
      const marker = L.marker([emp.lat, emp.lng], { icon: makeMarkerIcon(emp.role, emp.online) });
      marker.bindPopup(`
        <div style="min-width:130px;font-family:sans-serif;">
          <div style="font-weight:700;font-size:12px;margin-bottom:3px;">${emp.name}</div>
          <div style="font-size:10px;color:#6b7280;">${roleLabel}</div>
          <div style="font-size:10px;color:${statusColor};font-weight:600;">${statusLabel}</div>
          <div style="font-size:10px;color:#9ca3af;margin-top:3px;">${emp.lastSeen}</div>
        </div>`, { closeButton: false });
      marker.addTo(map);
      markersRef.current.push(marker);
    });
  }, [employees, onlineOnly, t]);

  const online = employees.filter(e => e.online).length;
  const total  = employees.length;
  const sub    = dark ? 'text-gray-400' : 'text-gray-500';
  const pillActive   = 'bg-indigo-600 text-white';
  const pillInactive = dark ? 'bg-gray-700 text-gray-300 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-700';

  return (
    <div className="relative w-full rounded-xl overflow-hidden" style={{ height, isolation: 'isolate' }}>
      <div ref={divRef} className="absolute inset-0 w-full h-full" />

      <div style={{ position: 'absolute', bottom: 8, right: 8, zIndex: 400, display: 'flex', flexDirection: 'column', borderRadius: 6, overflow: 'hidden', boxShadow: '0 1px 5px rgba(0,0,0,0.3)', border: dark ? '1px solid #374151' : '1px solid #d1d5db' }}>
        <button onClick={() => mapRef.current?.zoomIn()} style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 700, cursor: 'pointer', border: 'none', background: dark ? '#1f2937' : '#ffffff', color: dark ? '#f9fafb' : '#374151' }}>+</button>
        <div style={{ height: 1, background: dark ? '#374151' : '#e5e7eb' }} />
        <button onClick={() => mapRef.current?.zoomOut()} style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 700, cursor: 'pointer', border: 'none', background: dark ? '#1f2937' : '#ffffff', color: dark ? '#f9fafb' : '#374151' }}>−</button>
      </div>

      <div className="absolute top-2 right-2 z-[400] flex items-center gap-1.5">
        <button onClick={() => setOnlineOnly(v => !v)}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium shadow transition-all backdrop-blur-sm ${onlineOnly ? pillActive : pillInactive + ' ' + (dark ? 'bg-gray-800/80' : 'bg-white/80')}`}>
          {onlineOnly ? <Wifi size={10} /> : <WifiOff size={10} />}
          <span>{online}/{total}</span>
        </button>
        {onExpand && (
          <button onClick={onExpand} title={t.empMaximize || 'Kattalashtirish'}
            className={`w-7 h-7 rounded-lg flex items-center justify-center shadow transition-all backdrop-blur-sm ${dark ? 'bg-gray-800/80 text-gray-300 hover:text-white' : 'bg-white/80 text-gray-500 hover:text-gray-800'}`}>
            <Maximize2 size={12} />
          </button>
        )}
      </div>

      <div className={`absolute bottom-2 left-2 z-[400] flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg shadow backdrop-blur-sm ${dark ? 'bg-gray-900/75 text-gray-300' : 'bg-white/80 text-gray-600'}`}>
        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" /><span className={`text-[10px] ${sub}`}>{t.empRoleAgent || 'Agent'}</span></div>
        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /><span className={`text-[10px] ${sub}`}>{t.empRoleDelivery || 'Dostavkachi'}</span></div>
        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-500 inline-block" /><span className={`text-[10px] ${sub}`}>{t.empOffline || 'Offline'}</span></div>
      </div>

      <MapLayerSwitcher activeLayer={activeLayer} onChange={setActiveLayer} bottom={44} left={8} rightInset={36} />
    </div>
  );
}
