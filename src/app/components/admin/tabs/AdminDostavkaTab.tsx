import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Truck, Search, Phone, MapPin, Edit2, Trash2, X,
  AlertTriangle, ChevronLeft, ChevronRight,
  Wifi, WifiOff, Navigation, Signal,
  Package, Clock, Maximize2, Minimize2, CheckCircle2, XCircle,
} from 'lucide-react';
import { type AgentRow } from '../../../data/adminData';
import { COMPANIES } from '../../AdminAuthContext';
import { MapLayerSwitcher, switchTileLayer, type LayerId } from '../../MapLayerSwitcher';
import L from 'leaflet';
import { formatUzPhoneInput, UZ_PHONE_DEFAULT } from '../../../utils/phoneFormat';
import { api, type BackendOrder, type Distributor } from '../../../api/client';
import { isDeliveryHint } from '../../../utils/appUserCreds';
import { DayHistoryPanel } from '../DayHistoryPanel';

interface Props {
  D: boolean;
  card: string;
  divider: string;
  sub: string;
  t: Record<string, string>;
  activeAgents: AgentRow[];
  selectedCompanyIds: Set<string>;
  showBalances: boolean;
}

const NAVOIY: [number, number] = [40.0843, 65.3791];
const PER_PAGE = 12;

type DeliveryStatus = 'delivered' | 'pending';

interface ClientDelivery {
  idx: number;
  orderId: string;
  name: string;
  district: string;
  time: string | null;
  status: DeliveryStatus;
  amount: number;
}

type DeliveryEmp = {
  id: number;
  name: string;
  avatar: string;
  role: string;
  phone: string;
  city: string;
  lat: number;
  lng: number;
  online: boolean;
  lastSeenLabel: string;
  street: string;
  deliveriesTotal: number;
  deliveriesDone: number;
  deliveryPct: number;
  deliveryList: ClientDelivery[];
  totalAmount: number;
  distributorId?: string;
  backendUserId?: string;
  orgId: string;
  status: string;
};

function hasApiToken(): boolean {
  return typeof localStorage !== 'undefined' && !!localStorage.getItem('api_access_token');
}

function stableAgentId(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (Math.imul(31, h) + key.charCodeAt(i)) | 0;
  return Math.abs(h) || 1;
}

function nameInitials(name: string): string {
  return name.split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'DS';
}

function fmtClock(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function sameLocalDay(iso: string, date = new Date()): boolean {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  return (
    d.getFullYear() === date.getFullYear() &&
    d.getMonth() === date.getMonth() &&
    d.getDate() === date.getDate()
  );
}

function isDeliveryPerson(d: Distributor): boolean {
  return isDeliveryHint(d.position) || isDeliveryHint(d.user?.username);
}

function orderToDeliveryStatus(status: string): DeliveryStatus {
  if (status === 'delivered') return 'delivered';
  return 'pending';
}

function buildDeliveryList(orders: BackendOrder[]): ClientDelivery[] {
  return orders
    .slice()
    .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
    .map((o, i) => {
      const status = orderToDeliveryStatus(o.status);
      return {
        idx: i + 1,
        orderId: o.id,
        name: o.client?.name || o.deliveryName || 'Klient',
        district: o.client?.address || o.client?.lineCode || '—',
        time: status === 'delivered' ? fmtClock(o.updatedAt || o.createdAt) : null,
        status,
        amount: Number(o.totalAmount) || 0,
      };
    });
}

function distributorToDelivery(
  d: Distributor,
  orders: BackendOrder[],
): DeliveryEmp {
  const name = d.user?.fullName?.trim() || d.user?.username || 'Dostavkachi';
  const assigned = orders.filter(o => o.deliveryDistributorId === d.id);
  const todayOrders = assigned.filter(o =>
    sameLocalDay(o.updatedAt || o.createdAt) ||
    o.status === 'on_way' ||
    o.status === 'delivered',
  );
  // Prefer today's activity; if empty show all assigned open/delivered
  const relevant = todayOrders.length > 0
    ? assigned.filter(o =>
        sameLocalDay(o.updatedAt || o.createdAt) ||
        o.status === 'on_way',
      )
    : assigned.filter(o => o.status === 'on_way' || o.status === 'delivered');

  const list = buildDeliveryList(
    relevant.length > 0 ? relevant : assigned.filter(o => o.status === 'on_way' || o.status === 'delivered'),
  );
  const done = list.filter(x => x.status === 'delivered').length;
  const total = list.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const totalAmount = list.reduce((s, x) => s + x.amount, 0);

  return {
    id: stableAgentId(d.userId || d.id),
    name,
    avatar: nameInitials(name),
    role: 'Dostavkachi',
    phone: d.phone?.trim() || '',
    city: d.companyName || '—',
    lat: d.lastLatitude ?? NAVOIY[0],
    lng: d.lastLongitude ?? NAVOIY[1],
    online: !!d.isOnline,
    lastSeenLabel: d.isOnline
      ? 'Faol'
      : (d.lastLocationAt ? new Date(d.lastLocationAt).toLocaleString() : '—'),
    street: d.lineCode ? `Liniya ${d.lineCode}` : '—',
    deliveriesTotal: total,
    deliveriesDone: done,
    deliveryPct: pct,
    deliveryList: list,
    totalAmount,
    distributorId: d.id,
    backendUserId: d.userId,
    orgId: d.companyId || 'boran',
    status: d.user?.isActive === false ? 'inactive' : 'active',
  };
}

// ── Live Location Map ─────────────────────────────────────────────────────────
interface LiveMapProps {
  emp: DeliveryEmp;
  D: boolean;
  height?: number;
  fullscreen?: boolean;
}

function LiveLocationMap({ emp, D, height = 580, fullscreen }: LiveMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const [activeLayer, setActiveLayer] = useState<LayerId>('standard');

  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map(containerRef.current, {
      center: [emp.lat, emp.lng],
      zoom: 13,
      zoomControl: false,
      attributionControl: false,
    });
    switchTileLayer(map, tileLayerRef, activeLayer, D);
    mapRef.current = map;

    const circleColor = emp.online ? '#6366f1' : '#9ca3af';
    L.circle([emp.lat, emp.lng], {
      radius: 150,
      color: circleColor,
      weight: 1.5,
      opacity: 0.8,
      fillColor: circleColor,
      fillOpacity: 0.1,
    }).addTo(map);

    const pinColor = emp.online ? '#6366f1' : '#9ca3af';
    const borderC = D ? '#1c1c1e' : '#ffffff';
    const initials = emp.avatar || emp.name.slice(0, 2).toUpperCase();

    const markerIcon = L.divIcon({
      className: '',
      iconSize: [50, 60],
      iconAnchor: [25, 55],
      popupAnchor: [0, -55],
      html: `
        <div style="position:relative;display:flex;align-items:center;justify-content:center;">
          ${emp.online ? `
          <div style="position:absolute;width:52px;height:52px;border-radius:50%;
            background:${pinColor};opacity:0.18;animation:lvPulse 2s ease-out infinite;"></div>` : ''}
          <div style="width:42px;height:42px;border-radius:50%;background:${pinColor};border:3px solid ${borderC};
            box-shadow:0 4px 16px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;position:relative;z-index:2;">
            <span style="color:#fff;font-size:13px;font-weight:700;">${initials}</span>
          </div>
          <div style="position:absolute;bottom:-9px;left:50%;transform:translateX(-50%);width:0;height:0;
            border-left:7px solid transparent;border-right:7px solid transparent;border-top:11px solid ${pinColor};z-index:1;"></div>
          <div style="position:absolute;top:-5px;right:-4px;z-index:3;width:14px;height:14px;border-radius:50%;
            background:${emp.online ? '#10b981' : '#9ca3af'};border:2px solid ${borderC};"></div>
        </div>`,
    });

    const marker = L.marker([emp.lat, emp.lng], { icon: markerIcon });
    marker.bindPopup(`
      <div style="min-width:170px;padding:6px 4px;font-family:system-ui,sans-serif;">
        <div style="font-weight:700;font-size:14px;margin-bottom:5px;">${emp.name}</div>
        <div style="font-size:11px;color:#6b7280;margin-bottom:2px;">${emp.role}</div>
        <div style="font-size:11px;color:#6b7280;margin-bottom:6px;">${emp.street}, ${emp.city}</div>
        <div style="display:flex;align-items:center;gap:6px;">
          <div style="width:8px;height:8px;border-radius:50%;background:${emp.online ? '#10b981' : '#9ca3af'};"></div>
          <span style="font-size:11px;color:${emp.online ? '#10b981' : '#9ca3af'};font-weight:600;">${emp.online ? 'Online' : 'Offline'}</span>
        </div>
      </div>
    `);
    marker.addTo(map);
    map.setView([emp.lat, emp.lng], 13);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [emp.id, emp.lat, emp.lng, emp.online, emp.name, emp.role, emp.street, emp.city, emp.avatar, D, activeLayer]);

  const handleLayerChange = (id: LayerId) => {
    setActiveLayer(id);
    if (mapRef.current) switchTileLayer(mapRef.current, tileLayerRef, id, D);
  };

  return (
    <div style={{ position: 'relative', height }}>
      <style>{`
        @keyframes lvPulse {
          0% { transform: scale(1); opacity: 0.35; }
          100% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>
      <div ref={containerRef} style={{ width: '100%', height: '100%', borderRadius: fullscreen ? 0 : 0, overflow: 'hidden' }} />
      <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 999 }}>
        <MapLayerSwitcher activeLayer={activeLayer} onChange={handleLayerChange} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export function AdminDostavkaTab({ D, t, selectedCompanyIds, showBalances }: Props) {
  const [localEmps, setLocalEmps] = useState<DeliveryEmp[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]       = useState('');
  const [page, setPage]           = useState(1);
  const [viewEmp, setViewEmp]     = useState<DeliveryEmp | null>(null);
  const [editEmp, setEditEmp]     = useState<DeliveryEmp | null>(null);
  const [deleteEmp, setDeleteEmp] = useState<DeliveryEmp | null>(null);
  const [saved, setSaved]         = useState(false);
  const [form, setForm]           = useState({ name: '', role: '', phone: UZ_PHONE_DEFAULT, city: '' });
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [mapKey, setMapKey]       = useState(0);
  const [isMobile, setIsMobile]   = useState(false);
  const [isSmall, setIsSmall]     = useState(false);

  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < 768);
      setIsSmall(window.innerWidth < 450);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const refresh = useCallback(async () => {
    if (!hasApiToken()) {
      setLocalEmps([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const companyId = selectedCompanyIds.size === 1 ? [...selectedCompanyIds][0] : undefined;
      const [distributors, orders] = await Promise.all([
        api.getDistributors(companyId),
        api.getOrders(companyId),
      ]);

      const deliveryStaff = distributors.filter(d => {
        if (!d.user || d.user.isActive === false) return false;
        if (selectedCompanyIds.size > 0 && d.companyId && !selectedCompanyIds.has(d.companyId)) return false;
        return isDeliveryPerson(d);
      });

      setLocalEmps(deliveryStaff.map(d => distributorToDelivery(d, orders)));
    } catch {
      setLocalEmps([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyIds]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!viewEmp) return;
    const fresh = localEmps.find(e => e.distributorId === viewEmp.distributorId || e.id === viewEmp.id);
    if (fresh) setViewEmp(fresh);
  }, [localEmps]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered   = localEmps.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.role.toLowerCase().includes(search.toLowerCase()) ||
    e.city.toLowerCase().includes(search.toLowerCase()) ||
    e.phone.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const txt     = D ? '#f9fafb' : '#111827';
  const muted   = D ? '#6b7280' : '#9ca3af';
  const border  = D ? 'rgba(255,255,255,0.07)' : '#e5e7eb';
  const inpBg   = D ? '#1a1a1a' : '#f9fafb';
  const indigo  = '#6366f1';
  const green   = '#10b981';
  const amber   = '#f59e0b';
  const red     = '#ef4444';
  const cardBg  = D ? '#161616' : '#ffffff';
  const modalBg = D ? '#1c1c1e' : '#ffffff';

  const roleColors: Record<string, string> = {
    Dostavkachi: '#6366f1', Haydovchi: '#06b6d4',
  };

  const openEdit = (e: DeliveryEmp) => {
    setForm({ name: e.name, role: e.role, phone: formatUzPhoneInput(e.phone || ''), city: e.city });
    setEditEmp(e);
  };

  const saveEdit = async () => {
    if (!editEmp) return;
    try {
      if (editEmp.backendUserId && hasApiToken()) {
        await api.updateAppUser(editEmp.backendUserId, {
          fullName: form.name.trim(),
          position: 'delivery',
        });
      }
      if (editEmp.distributorId && hasApiToken()) {
        await api.updateDistributor(editEmp.distributorId, {
          phone: form.phone.trim() || undefined,
          position: 'delivery',
        });
      }
      await refresh();
      setSaved(true);
      setTimeout(() => { setSaved(false); setEditEmp(null); }, 900);
    } catch {
      setLocalEmps(prev => prev.map(e => e.id === editEmp.id ? { ...e, ...form } : e));
      setSaved(true);
      setTimeout(() => { setSaved(false); setEditEmp(null); }, 900);
    }
  };

  const confirmDelete = async () => {
    if (!deleteEmp) return;
    try {
      if (deleteEmp.backendUserId && hasApiToken()) {
        await api.deactivateAppUser(deleteEmp.backendUserId);
      }
      await refresh();
    } catch {
      setLocalEmps(prev => prev.filter(e => e.id !== deleteEmp.id));
    }
    setDeleteEmp(null);
  };

  const InputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: inpBg, border: `1.5px solid ${border}`,
    borderRadius: 10, padding: '9px 12px',
    fontSize: 13, color: txt, outline: 'none',
  };

  const selOrgs = COMPANIES.filter(c => selectedCompanyIds.has(c.id));

  // ── LOCATION VIEW ─────────────────────────────────────────────────────────
  if (viewEmp) {
    const deliveryPct = viewEmp.deliveriesTotal > 0
      ? Math.round((viewEmp.deliveriesDone / viewEmp.deliveriesTotal) * 100)
      : 0;

    return (
      <div style={{ padding: '0 0 40px' }}>

        {mapFullscreen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: D ? '#111' : '#fff', display: 'flex', flexDirection: 'column' }}>
            <div style={{ height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', borderBottom: `1px solid ${border}`, background: cardBg, flexShrink: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: txt }}>{viewEmp.name} — Jonli joylashuv</div>
              <button onClick={() => { setMapFullscreen(false); setMapKey(k => k + 1); }}
                style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${border}`, background: D ? 'rgba(255,255,255,0.08)' : '#f3f4f6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Minimize2 size={16} color={txt} />
              </button>
            </div>
            <div style={{ flex: 1, position: 'relative' }}>
              <LiveLocationMap key={`fs-${mapKey}`} emp={viewEmp} D={D}
                height={typeof window !== 'undefined' ? window.innerHeight - 52 : 600} fullscreen />
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: isSmall ? 8 : 10, marginBottom: 16 }}>
          <button onClick={() => setViewEmp(null)} style={{ width: isSmall ? 32 : 36, height: isSmall ? 32 : 36, borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ChevronLeft size={15} color={txt} />
          </button>
          <div style={{ width: isSmall ? 34 : 38, height: isSmall ? 34 : 38, borderRadius: 11, background: `${indigo}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: isSmall ? 12 : 13, fontWeight: 700, color: indigo }}>{viewEmp.avatar}</span>
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: isSmall ? 13 : (isMobile ? 14 : 16), fontWeight: 700, color: txt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{viewEmp.name}</div>
            <div style={{ fontSize: 10, color: muted, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'nowrap', overflow: 'hidden' }}>
              <span style={{ color: roleColors[viewEmp.role] || indigo, flexShrink: 0 }}>{viewEmp.role}</span>
              <span style={{ flexShrink: 0 }}>·</span>
              {viewEmp.online
                ? <><Wifi size={9} color={green} style={{ flexShrink: 0 }} /><span style={{ color: green, flexShrink: 0 }}>Online</span></>
                : <><WifiOff size={9} color={muted} style={{ flexShrink: 0 }} /><span style={{ color: muted, flexShrink: 0 }}>Offline</span></>
              }
            </div>
          </div>
          {!isMobile && (
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Navigation size={15} color={indigo} />
              <span style={{ fontSize: 13, fontWeight: 600, color: txt }}>Jonli joylashuv</span>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: isSmall ? 8 : 10, marginBottom: 16 }}>
          {[
            { icon: Package,      label: 'Jami yetkazish', value: String(viewEmp.deliveriesTotal),                          color: '#94a3b8' },
            { icon: CheckCircle2, label: 'Yetkazildi',     value: String(viewEmp.deliveriesDone),                           color: green    },
            { icon: XCircle,      label: 'Qoldi',          value: String(Math.max(0, viewEmp.deliveriesTotal - viewEmp.deliveriesDone)), color: amber    },
            { icon: Clock,        label: 'Bajarildi',       value: `${deliveryPct}%`,                                        color: deliveryPct >= 70 ? green : deliveryPct >= 40 ? amber : red },
          ].map(s => (
            <div key={s.label} style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: isSmall ? '10px 12px' : '14px 16px', display: 'flex', flexDirection: isSmall ? 'row' : 'column', alignItems: isSmall ? 'center' : 'flex-start', gap: isSmall ? 10 : 0 }}>
              <s.icon size={isSmall ? 16 : 15} color={s.color} style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: isSmall ? 18 : 22, fontWeight: 700, color: txt, marginTop: isSmall ? 0 : 6 }}>{s.value}</div>
                <div style={{ fontSize: isSmall ? 9 : 10, color: muted, marginTop: 2 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 280px', background: cardBg, border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ position: 'relative' }}>
            <div style={{ isolation: 'isolate' as const }}>
              <LiveLocationMap key={`main-${mapKey}`} emp={viewEmp} D={D} height={isMobile ? 260 : 580} />
            </div>
            <button
              onClick={() => { setMapFullscreen(true); setMapKey(k => k + 1); }}
              title="To'liq ekran"
              style={{ position: 'absolute', top: 12, right: 12, zIndex: 2, width: 38, height: 38, borderRadius: 10, background: 'rgba(255,255,255,0.97)', border: '1.5px solid rgba(0,0,0,0.14)', boxShadow: '0 3px 12px rgba(0,0,0,0.22)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Maximize2 size={16} color="#374151" />
            </button>
          </div>

          <div style={{ borderLeft: isMobile ? 'none' : `1px solid ${border}`, borderTop: isMobile ? `1px solid ${border}` : 'none', padding: isMobile ? 14 : 20, display: 'flex', flexDirection: 'column', gap: isMobile ? 8 : 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Xodim ma'lumotlari
            </div>

            <div style={{ padding: '10px 12px', borderRadius: 10, background: D ? 'rgba(255,255,255,0.03)' : '#f8fafc', border: `1px solid ${border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: viewEmp.online ? green : '#9ca3af', boxShadow: viewEmp.online ? `0 0 0 3px ${green}30` : 'none', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: viewEmp.online ? green : muted }}>
                    {viewEmp.online ? 'Hozir online' : 'Offline'}
                  </div>
                  <div style={{ fontSize: 10, color: muted }}>
                    {viewEmp.lastSeenLabel}
                  </div>
                </div>
                {viewEmp.online && <div style={{ marginLeft: 'auto' }}><Signal size={14} color={green} /></div>}
              </div>
            </div>

            {[
              { icon: MapPin,  label: t.colLegalAddr||'Manzil',    value: viewEmp.street },
              { icon: MapPin,  label: t.colCity||'Shahar',          value: viewEmp.city },
              { icon: Phone,   label: t.colPhone||'Telefon',        value: viewEmp.phone || '—' },
              { icon: Package, label: t.colDelivery||'Yetkazish',   value: `${viewEmp.deliveriesDone}/${viewEmp.deliveriesTotal} ta` },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '7px 0', borderBottom: i < 3 ? `1px solid ${D ? 'rgba(255,255,255,0.04)' : '#f3f4f6'}` : 'none' }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: `${indigo}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <item.icon size={12} color={indigo} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: muted }}>{item.label}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: txt }}>{item.value}</div>
                </div>
              </div>
            ))}

            <div style={{ padding: '10px 12px', borderRadius: 10, background: D ? 'rgba(255,255,255,0.03)' : '#f8fafc', border: `1px solid ${border}` }}>
              <div style={{ fontSize: 10, color: muted, marginBottom: 6, fontWeight: 600 }}>Yetkazish jarayoni</div>
              <div style={{ height: 6, borderRadius: 3, background: D ? '#333' : '#e5e7eb', overflow: 'hidden', marginBottom: 4 }}>
                <div style={{ height: '100%', borderRadius: 3, background: indigo, width: `${deliveryPct}%`, transition: 'width 0.6s ease' }} />
              </div>
              <div style={{ fontSize: 10, color: muted }}>{deliveryPct}% bajarildi</div>
            </div>

            <div style={{ padding: '10px 12px', borderRadius: 10, background: D ? 'rgba(255,255,255,0.03)' : '#f8fafc', border: `1px solid ${border}` }}>
              <div style={{ fontSize: 10, color: muted, fontWeight: 600, marginBottom: 4 }}>Koordinatalar</div>
              <div style={{ fontSize: 11, color: txt, fontFamily: 'monospace' }}>{viewEmp.lat.toFixed(5)}, {viewEmp.lng.toFixed(5)}</div>
            </div>
          </div>
        </div>

        <DayHistoryPanel
          empId={viewEmp.id}
          empName={viewEmp.name}
          distributorId={viewEmp.distributorId}
          mode="delivery"
          D={D}
          t={t}
        />
      </div>
    );
  }

  // ── LIST VIEW ────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '0 0 32px', width: '100%', minWidth: 0, overflowX: 'hidden' }}>

      {editEmp && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setEditEmp(null)}>
          <div style={{ background: modalBg, borderRadius: 18, padding: 28, width: 420, maxWidth: '92vw', boxShadow: '0 24px 60px rgba(0,0,0,0.3)', border: `1px solid ${border}` }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: txt }}>{t.editEmpTitle || 'Xodimni tahrirlash'}</div>
              <button onClick={() => setEditEmp(null)} style={{ width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer', background: D ? 'rgba(255,255,255,0.08)' : '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={14} color={muted} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <div style={{ fontSize: 11, color: muted, marginBottom: 4, fontWeight: 600 }}>{t.formName || 'ISM FAMILIYA'}</div>
                <input style={InputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: muted, marginBottom: 4, fontWeight: 600 }}>{t.colPhone || 'Telefon'}</div>
                <input style={InputStyle} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: formatUzPhoneInput(e.target.value) }))} />
              </div>
              <button onClick={saveEdit} style={{ marginTop: 8, padding: '11px', borderRadius: 11, border: 'none', background: saved ? green : indigo, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                {saved ? (t.savedBtn || 'Saqlandi') : (t.saveBtn || 'Saqlash')}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteEmp && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setDeleteEmp(null)}>
          <div style={{ background: modalBg, borderRadius: 16, padding: 24, width: 360, maxWidth: '90vw', border: `1px solid ${border}` }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <AlertTriangle size={18} color={amber} />
              <div style={{ fontSize: 15, fontWeight: 700, color: txt }}>{t.deleteConfirmTitle || 'O‘chirish'}</div>
            </div>
            <div style={{ fontSize: 13, color: muted, marginBottom: 16 }}>{deleteEmp.name}</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteEmp(null)} style={{ padding: '8px 14px', borderRadius: 9, border: `1px solid ${border}`, background: 'transparent', color: muted, cursor: 'pointer' }}>{t.cancel || 'Bekor'}</button>
              <button onClick={confirmDelete} style={{ padding: '8px 14px', borderRadius: 9, border: 'none', background: red, color: '#fff', cursor: 'pointer', fontWeight: 700 }}>{t.delete || 'O‘chirish'}</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Truck size={16} color={indigo} />
          <span style={{ fontSize: 15, fontWeight: 700, color: txt }}>{t.navDostavka || 'Yetkazib berish'}</span>
          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: `${indigo}18`, color: indigo, fontWeight: 700 }}>{filtered.length}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: D ? '#0f0f0f' : '#fff', border: `1px solid ${border}`, borderRadius: 10, padding: '7px 12px', minWidth: 200 }}>
          <Search size={13} color={muted} />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder={t.searchLabel || 'Qidirish...'}
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: txt }}
          />
        </div>
      </div>

      {selOrgs.length > 0 && (
        <div style={{ fontSize: 11, color: muted, marginBottom: 10 }}>
          {selOrgs.map(o => o.name).join(' · ')}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: muted }}>{t.loading || 'Yuklanmoqda...'}</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: muted, fontSize: 13 }}>
          Dostavkachi topilmadi. Foydalanuvchilarida rol «Yetkazib beruvchi» bo‘lishi kerak.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {paginated.map(emp => (
            <div
              key={emp.distributorId || emp.id}
              onClick={() => setViewEmp(emp)}
              style={{
                background: cardBg, border: `1px solid ${border}`, borderRadius: 14,
                padding: isMobile ? '12px 14px' : '14px 16px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 12, flexWrap: isMobile ? 'wrap' : 'nowrap',
              }}
            >
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: `${indigo}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: indigo }}>{emp.avatar}</span>
                </div>
                <div style={{ position: 'absolute', bottom: -1, right: -1, width: 11, height: 11, borderRadius: '50%', background: emp.online ? green : '#9ca3af', border: `2px solid ${D ? '#0f0f0f' : '#ffffff'}` }} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: txt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.name}</div>
                <div style={{ fontSize: 11, color: muted, display: 'flex', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
                  <span style={{ color: indigo, fontWeight: 600 }}>{emp.role}</span>
                  <span>{emp.phone || '—'}</span>
                  <span>{emp.city}</span>
                </div>
                <div style={{ marginTop: 8 }}>
                  <div style={{ height: 4, background: D ? '#333' : '#e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: emp.deliveryPct >= 70 ? green : amber, borderRadius: 2, width: `${emp.deliveryPct}%` }} />
                  </div>
                  <div style={{ fontSize: 10, color: muted, marginTop: 3 }}>
                    {emp.deliveriesDone}/{emp.deliveriesTotal} yetkazildi · {emp.deliveryPct}%
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                <button type="button" onClick={() => openEdit(emp)}
                  style={{ width: 32, height: 32, borderRadius: 9, border: `1px solid ${border}`, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Edit2 size={13} color={muted} />
                </button>
                <button type="button" onClick={() => setDeleteEmp(emp)}
                  style={{ width: 32, height: 32, borderRadius: 9, border: `1px solid ${border}`, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Trash2 size={13} color={red} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${border}`, background: 'transparent', cursor: page <= 1 ? 'default' : 'pointer', opacity: page <= 1 ? 0.4 : 1 }}>
            <ChevronLeft size={14} color={txt} />
          </button>
          <span style={{ fontSize: 12, color: muted, alignSelf: 'center' }}>{page}/{totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${border}`, background: 'transparent', cursor: page >= totalPages ? 'default' : 'pointer', opacity: page >= totalPages ? 0.4 : 1 }}>
            <ChevronRight size={14} color={txt} />
          </button>
        </div>
      )}
    </div>
  );
}
