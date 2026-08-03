import { AlertTriangle, MapPin, X } from 'lucide-react';
import { StoreIcon } from '../icons';
import type { ClientRow } from '../../data/adminData';
import { clientIdHash } from '../../utils/clientApi';
import { formatDisplayDate } from '../../utils/dateFormat';

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

/** Haqiqiy GPS bilan OSM embed (Leaflet yo'q — production crash oldini olish) */
export function ClientMapModal({ client, D, t, onClose }: Props) {
  const coords = parseClientGps(client.gps);

  if (!coords) {
    return <ClientGpsWarningModal client={client} D={D} t={t} onClose={onClose} />;
  }

  const { lat, lng } = coords;
  const delta = 0.008;
  const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - delta},${lat - delta},${lng + delta},${lat + delta}&layer=mapnik&marker=${lat},${lng}`;

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
          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`}
              target="_blank"
              rel="noreferrer"
              className={`text-xs px-2 py-1 rounded-lg border font-medium transition-colors
                ${D ? 'border-gray-700 hover:bg-gray-800 text-gray-300' : 'border-gray-200 hover:bg-gray-50 text-gray-700'}`}
            >
              OSM
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

        <div className={`flex items-center gap-4 px-4 py-2 text-xs font-mono ${D ? 'bg-gray-800/60 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
          <span>lat: {lat.toFixed(5)}</span>
          <span>lng: {lng.toFixed(5)}</span>
          <span className={`ml-auto text-[10px] flex items-center gap-1 ${D ? 'text-emerald-400' : 'text-emerald-600'}`}>
            <MapPin size={10} />
            {t.gpsAvailable ?? 'GPS mavjud'}
          </span>
        </div>

        {(client.locationUpdatedAt || client.locationUpdatedBy) && (
          <div className={`px-4 py-2 text-xs flex flex-wrap gap-x-4 gap-y-1 border-b ${D ? 'border-gray-700 text-gray-400' : 'border-gray-100 text-gray-500'}`}>
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

        <iframe
          src={mapSrc}
          title={t.mapLabel ?? 'Xarita'}
          style={{ width: '100%', height: 340, border: 0, display: 'block' }}
          loading="lazy"
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

/** @deprecated — faqat eski taxminiy joylashuv uchun */
export function approxClientCoords(client: ClientRow): { lat: number; lng: number } {
  const seed = clientIdHash(client.id) % 500;
  return {
    lat: 40.0857 + ((seed * 7 + 13) % 100 - 50) * 0.004,
    lng: 64.4432 + ((seed * 11 + 7) % 100 - 50) * 0.003,
  };
}
