import { useEffect, useRef, useState, useCallback } from 'react';
import { X, MapPin, Wifi, WifiOff, Maximize2, Minimize2, Search } from 'lucide-react';
import L from 'leaflet';
import { MapLayerSwitcher, switchTileLayer, type LayerId } from './MapLayerSwitcher';

export interface EmployeeMarker {
  id: number;
  name: string;
  avatar: string;
  role: 'agent' | 'delivery';
  online: boolean;
  lastSeen: string;
  lat: number;
  lng: number;
  orgId?: string;
  distributorId?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  dark: boolean;
  employees: EmployeeMarker[];
  centerCoord?: [number, number];
  initialZoom?: number;
  cityLabel?: string;
  t: Record<string, string>;
}

const NAVOIY: [number, number] = [40.0843, 65.3791];
const DEFAULT_ZOOM = 13;

function makeIcon(role: 'agent' | 'delivery', online: boolean, highlight = false) {
  const color = role === 'agent'
    ? (online ? '#6366f1' : '#6b7280')
    : (online ? '#10b981' : '#6b7280');
  const ring = highlight
    ? '#fbbf24'
    : role === 'agent'
      ? (online ? '#a5b4fc' : '#9ca3af')
      : (online ? '#6ee7b7' : '#9ca3af');
  const size = highlight ? 42 : 36;
  return L.divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2 - 4],
    html: `
      <div style="
        width:${size}px;height:${size}px;border-radius:50%;
        background:${color};
        border:${highlight ? 4 : 3}px solid ${ring};
        box-shadow:0 2px ${highlight ? 16 : 8}px rgba(0,0,0,${highlight ? 0.5 : 0.35});
        display:flex;align-items:center;justify-content:center;
        color:#fff;font-size:${highlight ? 14 : 12}px;font-weight:700;
        position:relative;transition:all .2s;">
        ${role === 'delivery' ? '🚚' : '👤'}
        ${online ? `<span style="position:absolute;bottom:0;right:0;width:10px;height:10px;background:#22c55e;border-radius:50%;border:2px solid #fff;"></span>` : ''}
      </div>`,
  });
}

export function EmployeeMapModal({ open, onClose, dark, employees, centerCoord, initialZoom, cityLabel, t }: Props) {
  const mapRef       = useRef<L.Map | null>(null);
  const divRef       = useRef<HTMLDivElement>(null);
  const tileRef      = useRef<L.TileLayer | null>(null);
  const markersRef   = useRef<Map<number, L.Marker>>(new Map());

  const [filter,      setFilter]      = useState<'all' | 'agent' | 'delivery'>('all');
  const [onlineOnly,  setOnlineOnly]  = useState(false);
  const [fullscreen,  setFullscreen]  = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocus, setSearchFocus] = useState(false);
  const [highlighted, setHighlighted] = useState<number | null>(null);
  const [activeLayer, setActiveLayer] = useState<LayerId>('standard');

  const refreshMapSize = useCallback(() => {
    mapRef.current?.invalidateSize(true);
  }, []);

  useEffect(() => {
    if (!open || !divRef.current || mapRef.current) return;

    const safeLat = centerCoord && isFinite(centerCoord[0]) ? centerCoord[0] : NAVOIY[0];
    const safeLng = centerCoord && isFinite(centerCoord[1]) ? centerCoord[1] : NAVOIY[1];

    const map = L.map(divRef.current, {
      center: [safeLat, safeLng],
      zoom: initialZoom || DEFAULT_ZOOM,
      zoomControl: false,
      attributionControl: false,
    });
    switchTileLayer(map, tileRef, activeLayer, dark);
    mapRef.current = map;

    requestAnimationFrame(refreshMapSize);
    setTimeout(refreshMapSize, 100);
    setTimeout(refreshMapSize, 350);

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
  }, [open]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !open) return;
    switchTileLayer(map, tileRef, activeLayer, dark);
  }, [activeLayer, dark, open]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !open || !centerCoord) return;
    if (!isFinite(centerCoord[0]) || !isFinite(centerCoord[1])) return;
    setSearchQuery('');
    setHighlighted(null);
    map.flyTo(centerCoord, initialZoom || DEFAULT_ZOOM, { duration: 0.9 });
  }, [centerCoord?.[0], centerCoord?.[1], open]);

  useEffect(() => {
    const timer = setTimeout(refreshMapSize, 320);
    return () => clearTimeout(timer);
  }, [fullscreen, refreshMapSize]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !open) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current.clear();

    const filtered = employees.filter(e => {
      if (filter !== 'all' && e.role !== filter) return false;
      if (onlineOnly && !e.online) return false;
      return true;
    });

    filtered.forEach(emp => {
      const isHL = highlighted === emp.id;
      const roleLabel   = emp.role === 'agent'
        ? (t.empRoleAgent    || 'Agent')
        : (t.empRoleDelivery || 'Dostavkachi');
      const statusLabel = emp.online
        ? (t.empOnline  || 'Online')
        : (t.empOffline || 'Offline');
      const statusColor = emp.online ? '#22c55e' : '#ef4444';

      const marker = L.marker([emp.lat, emp.lng], {
        icon: makeIcon(emp.role, emp.online, isHL),
        zIndexOffset: isHL ? 1000 : 0,
      });
      marker.bindPopup(`
        <div style="min-width:150px;font-family:sans-serif;">
          <div style="font-weight:700;font-size:13px;margin-bottom:4px;">${emp.name}</div>
          <div style="font-size:11px;color:#6b7280;margin-bottom:2px;">${roleLabel}</div>
          <div style="font-size:11px;color:${statusColor};font-weight:600;">${statusLabel}</div>
          <div style="font-size:10px;color:#9ca3af;margin-top:4px;">${emp.lastSeen}</div>
        </div>`);
      marker.addTo(map);
      markersRef.current.set(emp.id, marker);

      if (isHL) {
        setTimeout(() => marker.openPopup(), 150);
      }
    });
  }, [employees, filter, onlineOnly, open, highlighted, t]);

  const flyTo = useCallback((emp: EmployeeMarker) => {
    setHighlighted(emp.id);
    setSearchQuery(emp.name);
    setSearchFocus(false);
    mapRef.current?.flyTo([emp.lat, emp.lng], 15, { duration: 0.9 });
  }, []);

  if (!open) return null;

  const total   = employees.length;
  const agentCt = employees.filter(e => e.role === 'agent').length;
  const drivers = employees.filter(e => e.role === 'delivery').length;
  const online  = employees.filter(e => e.online).length;

  const trimmedQ      = searchQuery.trim().toLowerCase();
  const searchResults = trimmedQ.length >= 1
    ? employees.filter(e => e.name.toLowerCase().includes(trimmedQ))
    : [];

  const bg  = dark ? 'bg-[#111112] border-gray-800' : 'bg-white border-gray-200';
  const hdr = dark ? 'bg-[#0a0a0a] border-gray-800' : 'bg-gray-50 border-gray-200';
  const sub = dark ? 'text-gray-400' : 'text-gray-500';
  const pill = (active: boolean) =>
    active
      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-900/30'
      : dark
        ? 'bg-gray-800 text-gray-400 hover:text-white'
        : 'bg-gray-100 text-gray-500 hover:text-gray-800';
  const iconBtn = `w-8 h-8 rounded-xl flex items-center justify-center transition-colors flex-shrink-0
    ${dark ? 'hover:bg-gray-800 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-800'}`;

  const outerCls = fullscreen
    ? 'fixed inset-0 z-[501] p-0'
    : 'fixed inset-0 z-[500] flex items-center justify-center p-4';
  const innerCls = fullscreen
    ? `w-full h-full flex flex-col border-0 ${bg.replace('border-gray-800', '').replace('border-gray-200', '')}`
    : `relative w-full max-w-2xl rounded-2xl border ${bg} overflow-hidden shadow-2xl flex flex-col`;
  const innerStyle = fullscreen ? {} : { height: 'min(88vh, 620px)' };

  return (
    <div
      className={outerCls}
      onClick={fullscreen ? undefined : onClose}
      style={fullscreen ? {} : { background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className={innerCls}
        style={innerStyle}
        onClick={e => e.stopPropagation()}
      >
        <div className={`px-4 py-3 border-b ${hdr} flex-shrink-0`}>
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="min-w-0 flex-1">
              <h2 className="font-bold text-sm truncate">
                {t.empMapTitle || 'Xodimlar joylashuvi'}
              </h2>
              <p className={`text-xs ${sub}`}>
                {total} {t.empTotal || 'xodim'} · {online} {t.empOnlineCount || 'online'}
              </p>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => setFullscreen(v => !v)}
                className={iconBtn}
                title={fullscreen ? (t.empMinimize || 'Kichraytirish') : (t.empMaximize || 'Kattalashtirish')}
              >
                {fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              </button>
              <button onClick={onClose} className={iconBtn}>
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1 flex-wrap">
            {(['all', 'agent', 'delivery'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex-shrink-0 ${pill(filter === f)}`}
              >
                {f === 'all'
                  ? (t.empAll || 'Barchasi')
                  : f === 'agent'
                  ? `👤 ${agentCt}`
                  : `🚚 ${drivers}`}
              </button>
            ))}

            <button
              onClick={() => setOnlineOnly(v => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex-shrink-0 ${pill(onlineOnly)}`}
            >
              {onlineOnly ? <Wifi size={12} /> : <WifiOff size={12} />}
              <span>{t.empOnlineOnly || 'Online'}</span>
            </button>
          </div>
        </div>

        <div className={`px-4 py-2.5 border-b ${hdr} flex-shrink-0`}>
          <div className="flex items-center gap-3 flex-wrap mb-2">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-indigo-500 inline-block flex-shrink-0" />
              <span className={`text-xs ${sub} whitespace-nowrap`}>{t.empRoleAgent || 'Agent'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block flex-shrink-0" />
              <span className={`text-xs ${sub} whitespace-nowrap`}>{t.empRoleDelivery || 'Dostavkachi'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-gray-500 inline-block flex-shrink-0" />
              <span className={`text-xs ${sub} whitespace-nowrap`}>{t.empOffline || 'Offline'}</span>
            </div>
            <div className="flex items-center gap-1.5 ml-1">
              <MapPin size={11} className="text-indigo-400 flex-shrink-0" />
              <span className={`text-xs ${sub} truncate max-w-[120px]`}>
                {cityLabel || t.empCity || 'Navoiy shahri'}
              </span>
            </div>
          </div>

          <div className="relative w-full">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all
              ${searchFocus
                ? dark
                  ? 'bg-gray-800 border-indigo-500/60 text-white'
                  : 'bg-white border-indigo-400 text-gray-900'
                : dark
                  ? 'bg-gray-800/60 border-gray-700 text-gray-300'
                  : 'bg-gray-100 border-gray-200 text-gray-600'
              }`}
            >
              <Search size={13} className={searchFocus ? 'text-indigo-400' : sub} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setHighlighted(null); }}
                onFocus={() => setSearchFocus(true)}
                onBlur={() => setTimeout(() => setSearchFocus(false), 180)}
                placeholder={t.empSearch || 'Xodim qidirish...'}
                className="bg-transparent outline-none text-xs w-full placeholder:text-gray-500"
              />
              {searchQuery && (
                <button
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => { setSearchQuery(''); setHighlighted(null); }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={11} />
                </button>
              )}
            </div>

            {searchFocus && searchResults.length > 0 && (
              <div className={`absolute right-0 top-full mt-1 w-56 rounded-xl border shadow-2xl z-[900] overflow-hidden
                ${dark ? 'bg-[#1a1a1b] border-gray-700' : 'bg-white border-gray-200'}`}
              >
                {searchResults.map(emp => {
                  const isAgent = emp.role === 'agent';
                  const dotColor = isAgent
                    ? (emp.online ? 'bg-indigo-500' : 'bg-gray-500')
                    : (emp.online ? 'bg-emerald-500' : 'bg-gray-500');
                  return (
                    <button
                      key={emp.id}
                      onMouseDown={e => { e.preventDefault(); flyTo(emp); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors
                        ${dark
                          ? 'hover:bg-gray-800 text-gray-200'
                          : 'hover:bg-gray-50 text-gray-800'}`}
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white flex-shrink-0
                        ${isAgent
                          ? (emp.online ? 'bg-indigo-600' : 'bg-gray-500')
                          : (emp.online ? 'bg-emerald-600' : 'bg-gray-500')}`}
                        style={{ fontSize: 10, fontWeight: 700 }}
                      >
                        {emp.avatar}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold truncate">{emp.name}</p>
                        <p className={`text-[10px] ${sub} truncate`}>{emp.lastSeen}</p>
                      </div>
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
                    </button>
                  );
                })}
              </div>
            )}

            {searchFocus && trimmedQ.length >= 1 && searchResults.length === 0 && (
              <div className={`absolute right-0 top-full mt-1 w-52 rounded-xl border shadow-xl z-[900] px-4 py-3
                ${dark ? 'bg-[#1a1a1b] border-gray-700 text-gray-400' : 'bg-white border-gray-200 text-gray-500'}`}
              >
                <p className="text-xs">{t.empNoResults || 'Xodim topilmadi'}</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 w-full" style={{ minHeight: 280, position: 'relative', overflow: 'hidden' }}>
          <div ref={divRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
          <div style={{
            position: 'absolute', top: 8, left: 8, zIndex: 800,
            display: 'flex', flexDirection: 'column',
            borderRadius: 8, overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
            border: dark ? '1px solid #374151' : '1px solid #d1d5db',
          }}>
            <button
              onClick={() => mapRef.current?.zoomIn()}
              style={{
                width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, fontWeight: 700, cursor: 'pointer', border: 'none', outline: 'none',
                background: dark ? '#1f2937' : '#ffffff',
                color: dark ? '#f9fafb' : '#374151',
              }}
            >+</button>
            <div style={{ height: 1, background: dark ? '#374151' : '#e5e7eb' }} />
            <button
              onClick={() => mapRef.current?.zoomOut()}
              style={{
                width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, fontWeight: 700, cursor: 'pointer', border: 'none', outline: 'none',
                background: dark ? '#1f2937' : '#ffffff',
                color: dark ? '#f9fafb' : '#374151',
              }}
            >−</button>
          </div>
          <MapLayerSwitcher activeLayer={activeLayer} onChange={setActiveLayer} bottom={12} left={12} />
        </div>
      </div>
    </div>
  );
}
