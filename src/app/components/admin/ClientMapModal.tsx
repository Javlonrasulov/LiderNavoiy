import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { AlertTriangle, MapPin, Maximize2, X } from 'lucide-react';
import { StoreIcon } from '../icons';
import type { ClientRow } from '../../data/adminData';
import { clientIdHash } from '../../utils/clientApi';
import { formatDisplayDate } from '../../utils/dateFormat';
import { MapLayerSwitcher, switchTileLayer, type LayerId } from '../MapLayerSwitcher';

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

/** Haqiqiy GPS — Leaflet (OSM iframe bloklanganda ham Carto/Esri ishlaydi) */
export function ClientMapModal({ client, D, t, onClose }: Props) {
  const coords = parseClientGps(client.gps);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  // shortbread = CartoCDN — openstreetmap.org bloklangan tarmoqlarda ham ochiladi
  const [activeLayer, setActiveLayer] = useState<LayerId>('shortbread');
  const [mapFullscreen, setMapFullscreen] = useState(false);

  useEffect(() => {
    if (!coords || !containerRef.current || mapRef.current) return;

    const pinIcon = L.divIcon({
      className: '',
      iconSize: [28, 28],
      iconAnchor: [14, 28],
      html: `<div style="width:28px;height:28px;background:#0ea5e9;border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 3px 10px rgba(0,0,0,.35);"></div>`,
    });

    const map = L.map(containerRef.current, {
      center: [coords.lat, coords.lng],
      zoom: 16,
      zoomControl: true,
      attributionControl: false,
    });
    switchTileLayer(map, tileRef, activeLayer, D);
    markerRef.current = L.marker([coords.lat, coords.lng], { icon: pinIcon }).addTo(map);
    mapRef.current = map;

    requestAnimationFrame(() => map.invalidateSize());
    const tmr = window.setTimeout(() => map.invalidateSize(), 120);

    return () => {
      window.clearTimeout(tmr);
      map.remove();
      mapRef.current = null;
      tileRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!coords, client.id]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    switchTileLayer(map, tileRef, activeLayer, D);
  }, [activeLayer, D]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const tmr = window.setTimeout(() => map.invalidateSize(), 80);
    return () => window.clearTimeout(tmr);
  }, [mapFullscreen]);

  if (!coords) {
    return <ClientGpsWarningModal client={client} D={D} t={t} onClose={onClose} />;
  }

  const { lat, lng } = coords;
  const shellClass = mapFullscreen
    ? 'fixed inset-0 z-[210] flex flex-col rounded-none'
    : 'relative w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl border';

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center ${mapFullscreen ? 'p-0' : 'p-4'}`}
      style={{ backdropFilter: 'blur(6px)', backgroundColor: 'rgba(0,0,0,0.65)' }}
      onClick={onClose}
    >
      <div
        className={`${shellClass} ${D ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}${mapFullscreen ? ' h-full w-full' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        <div className={`flex items-center justify-between px-4 py-3 border-b flex-shrink-0 ${D ? 'border-gray-700' : 'border-gray-100'}`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${D ? 'bg-sky-900/60' : 'bg-sky-100'}`}>
              <StoreIcon size={16} color="currentColor" className={D ? 'text-sky-400' : 'text-sky-600'} animated={false} />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{client.name}</p>
              <p className={`text-xs truncate ${D ? 'text-gray-400' : 'text-gray-500'}`}>
                {client.territory || client.legalAddr || `Kod: ${client.code}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => setMapFullscreen(v => !v)}
              title={mapFullscreen ? (t.closeBtn ?? 'Yopish') : 'Katta ekran'}
              className={`w-7 h-7 flex items-center justify-center rounded-xl transition-colors
                ${D ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}
            >
              <Maximize2 size={14} />
            </button>
            <a
              href={`https://www.google.com/maps?q=${lat},${lng}`}
              target="_blank"
              rel="noreferrer"
              className={`text-xs px-2 py-1 rounded-lg border font-medium transition-colors
                ${D ? 'border-gray-700 hover:bg-gray-800 text-gray-300' : 'border-gray-200 hover:bg-gray-50 text-gray-700'}`}
            >
              Maps
            </a>
            <button
              onClick={onClose}
              className={`w-7 h-7 flex items-center justify-center rounded-xl transition-colors
                ${D ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        <div className={`flex items-center gap-4 px-4 py-2 text-xs font-mono flex-shrink-0 ${D ? 'bg-gray-800/60 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
          <span>lat: {lat.toFixed(5)}</span>
          <span>lng: {lng.toFixed(5)}</span>
          <span className={`ml-auto text-[10px] flex items-center gap-1 ${D ? 'text-emerald-400' : 'text-emerald-600'}`}>
            <MapPin size={10} />
            {t.gpsAvailable ?? 'GPS mavjud'}
          </span>
        </div>

        {(client.locationUpdatedAt || client.locationUpdatedBy) && (
          <div className={`px-4 py-2 text-xs flex flex-wrap gap-x-4 gap-y-1 border-b flex-shrink-0 ${D ? 'border-gray-700 text-gray-400' : 'border-gray-100 text-gray-500'}`}>
            {client.locationUpdatedAt && (
              <span>
                <span className="opacity-60">{t.gpsUpdatedAt ?? 'Qachon'}: </span>
                <span className="font-medium">{formatDisplayDate(client.locationUpdatedAt)}</span>
              </span>
            )}
            {client.locationUpdatedBy && (
              <span>
                <span className="opacity-60">{t.gpsUpdatedBy ?? 'Kim'}: </span>
                <span className="font-medium">{client.locationUpdatedBy}</span>
              </span>
            )}
          </div>
        )}

        <div
          className="relative flex-1 min-h-0"
          style={mapFullscreen ? { flex: 1 } : { height: 340 }}
        >
          <div
            ref={containerRef}
            style={{ width: '100%', height: '100%', minHeight: mapFullscreen ? 0 : 340 }}
          />
          <MapLayerSwitcher
            activeLayer={activeLayer}
            onChange={setActiveLayer}
            bottom={12}
            left={12}
          />
        </div>

        {client.agent && (
          <div className={`px-4 py-2.5 text-xs flex items-center gap-2 border-t flex-shrink-0 ${D ? 'border-gray-700 text-gray-400' : 'border-gray-100 text-gray-500'}`}>
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

/** @deprecated — faqat eski taxminiy joylashuv uchun */
export function approxClientCoords(client: ClientRow): { lat: number; lng: number } {
  const seed = clientIdHash(client.id) % 500;
  return {
    lat: 40.0857 + ((seed * 7 + 13) % 100 - 50) * 0.004,
    lng: 64.4432 + ((seed * 11 + 7) % 100 - 50) * 0.003,
  };
}
