import { MapPin, Smartphone, X } from 'lucide-react';
import { fmtClock, type DayTrack } from '../../utils/agentTracking';

export function TrackingDetailsPanel({ mode, day, D, onClose }: { mode: 'client_orders' | 'no_gps'; day: DayTrack; D: boolean; onClose: () => void }) {
  const noGps = mode === 'no_gps';
  return <div className={`tracking-details ${D ? 'dark' : ''}`} role="region" aria-label={noGps ? 'GPSsiz mijozlar' : 'Mijoz ilovasi buyurtmalari'}>
    <div className="tracking-details-header"><div>{noGps ? <MapPin size={18}/> : <Smartphone size={18}/>}<strong>{noGps ? 'GPSsiz mijozlar' : 'Mijoz ilovasidan yuborilgan buyurtmalar'}</strong><span>{noGps ? day.noGps : day.clientOrders.length}</span></div><button type="button" onClick={onClose} aria-label="Ro‘yxatni yopish"><X size={17}/></button></div>
    <p>{noGps ? 'Bu mijozlar jami rejalashtirilgan nuqtalarga kiritilgan. Koordinata qo‘shilmaguncha xaritada ko‘rsatilmaydi.' : 'Bu buyurtmalar mijozning o‘zi tomonidan yuborilgan. Nuqtalarning 4 ta statusiga qo‘shilmaydi.'}</p>
    <div className="tracking-details-list">{noGps ? day.points.filter(p => !p.hasCoords).map(p => <div key={p.clientId}><div><strong>{p.name}</strong><span>{p.lineName} · {p.address || 'Manzil kiritilmagan'}</span></div><MapPin size={15}/></div>) : day.clientOrders.map(o => <div key={o.id}><div><strong>{o.clientName || day.points.find(p => p.clientId === o.clientId)?.name || `Mijoz #${o.clientId.slice(0, 8)}`}</strong><span>#{o.id.slice(0, 8)} · {fmtClock(o.createdAt)} · {o.status}{o.returnedAmount > 0 ? ` · Qaytarilgan: ${o.returnedAmount.toLocaleString()} so‘m` : ''}</span></div><b>{o.netAmount.toLocaleString()} so‘m</b></div>)}</div>
    {(noGps ? day.noGps === 0 : day.clientOrders.length === 0) && <div className="tracking-details-empty">Tanlangan kunda ma’lumot yo‘q.</div>}
  </div>;
}
