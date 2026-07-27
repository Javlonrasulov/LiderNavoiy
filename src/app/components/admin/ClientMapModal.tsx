import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { AlertTriangle, MapPin, X } from 'lucide-react';
import { StoreIcon } from '../icons';
import type { ClientRow } from '../../data/adminData';
import { switchTileLayer, type LayerId } from '../MapLayerSwitcher';

function parseClientGps(gps: string | undefined | null): { lat: number; lng: number } | null {
  if (!gps?.includes(',')) return null;
  const [la, ln] = gps.split(',').map(Number);
  if (isNaN(la) || isNaN(ln) || (la === 0 && ln === 0)) return null;
  return { lat: la, lng: ln };
}

interface Props {
  client: ClientRow;
  D: boolean;
  t: Record<string, string>;
  onClose: () => void;
}

/** GPS yo'q — ogohlantirish */
export function ClientGpsWarningModal({ client, D, t, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(6px)', backgroundColor: 'rgba(0,0,0,0.65)' }}
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl border p-5
          ${D ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className={`absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-xl transition-colors
            ${D ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
        >
          <X size={14} />
        </button>

        <div className="flex flex-col items-center text-center pt-2 pb-1">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4
            ${D ? 'bg-amber-900/40' : 'bg-amber-50'}`}>
            <AlertTriangle size={26} className={D ? 'text-amber-400' : 'text-amber-500'} />
          </div>
          <p className={`text-base font-bold mb-1 ${D ? 'text-white' : 'text-gray-900'}`}>
            {t.gpsMissingTitle ?? "GPS yo'q"}
          </p>
          <p className={`text-sm mb-1 truncate max-w-full px-2 ${D ? 'text-gray-300' : 'text-gray-700'}`}>
            {client.name}
          </p>
          <p className={`text-xs leading-relaxed ${D ? 'text-gray-400' : 'text-gray-500'}`}>
            {t.gpsMissingMsg
              ?? "Bu mijozda GPS koordinatalari saqlanmagan. Xarita ko'rsatib bo'lmaydi."}
          </p>
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors"
        >
          {t.closeBtn ?? 'Yopish'}
        </button>
      </div>
    </div>
  );
}

/** Haqiqiy GPS bilan Leaflet xarita (attribution / OSM tugmasi yo'q) */
export function ClientMapModal({ client, D, t, onClose }: Props) {
  const coords = parseClientGps(client.gps);
  const mapRef = useRef<L.Map | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!coords || !containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [coords.lat, coords.lng],
      zoom: 16,
      zoomControl: true,
      attributionControl: false,
    });
    switchTileLayer(map, tileRef, 'standard' as LayerId, D);
    mapRef.current = map;

    const pin = L.divIcon({
      className: '',
      iconSize: [28, 28],
      iconAnchor: [14, 28],
      html: `<div style="width:28px;height:28px;background:#10b981;border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 3px 10px rgba(0,0,0,.35);"></div>`,
    });
    L.marker([coords.lat, coords.lng], { icon: pin }).addTo(map);

    const tmr = setTimeout(() => map.invalidateSize(true), 80);

    return () => {
      clearTimeout(tmr);
      map.remove();
      mapRef.current = null;
      tileRef.current = null;
    };
  }, [coords?.lat, coords?.lng, D]);

  if (!coords) {
    return <ClientGpsWarningModal client={client} D={D} t={t} onClose={onClose} />;
  }

  const { lat, lng } = coords;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(6px)', backgroundColor: 'rgba(0,0,0,0.65)' }}
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl border
          ${D ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}
        onClick={e => e.stopPropagation()}
      >
        <div className={`flex items-center justify-between px-4 py-3 border-b ${D ? 'border-gray-700' : 'border-gray-100'}`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${D ? 'bg-sky-900/60' : 'bg-sky-100'}`}>
              <StoreIcon size={16} color="currentColor" className={D ? 'text-sky-400' : 'text-sky-600'} animated={false} />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{client.name}</p>
              <p className={`text-xs truncate ${D ? 'text-gray-400' : 'text-gray-500'}`}>
                {client.territory || client.legalAddr || `ID: ${client.code}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`w-7 h-7 flex items-center justify-center rounded-xl transition-colors flex-shrink-0
              ${D ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
          >
            <X size={14} />
          </button>
        </div>

        <div className={`flex items-center gap-4 px-4 py-2 text-xs font-mono ${D ? 'bg-gray-800/60 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
          <span>lat: {lat.toFixed(5)}</span>
          <span>lng: {lng.toFixed(5)}</span>
          <span className={`ml-auto text-[10px] flex items-center gap-1 ${D ? 'text-emerald-400' : 'text-emerald-600'}`}>
            <MapPin size={10} />
            {t.gpsAvailable ?? 'GPS mavjud'}
          </span>
        </div>

        <div
          ref={containerRef}
          className="client-map-leaflet"
          style={{ width: '100%', height: 340 }}
        />

        {client.agent && (
          <div className={`px-4 py-2.5 text-xs flex items-center gap-2 border-t ${D ? 'border-gray-700 text-gray-400' : 'border-gray-100 text-gray-500'}`}>
            <span className="opacity-60">{t.colAgent}:</span>
            <span className="font-medium">{client.agent}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function clientHasGps(client: ClientRow): boolean {
  return parseClientGps(client.gps) !== null;
}
