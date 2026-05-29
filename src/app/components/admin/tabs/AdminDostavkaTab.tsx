import { useState, useEffect, useRef } from 'react';
import {
  Truck, Search, Plus, Phone, MapPin, Edit2, Trash2, X,
  AlertTriangle, Check, ChevronLeft, ChevronRight,
  GitBranch, Wifi, WifiOff, Navigation, Signal,
  Package, Clock, Maximize2, Minimize2, CheckCircle2, XCircle, CalendarDays,
} from 'lucide-react';
import L from 'leaflet';
import { LINES, type AgentRow } from '../../../data/adminData';
import { COMPANIES } from '../../AdminAuthContext';
import { MapLayerSwitcher, switchTileLayer, type LayerId } from '../../MapLayerSwitcher';
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

const ROLES = ['Dostavkachi', 'Haydovchi'];

// All employees default to Navoiy
const NAVOIY: [number, number] = [40.0843, 65.3791];

const CITY_COORDS: Record<string, [number, number]> = {
  'Navoiy':    [40.0843, 65.3791],
  'Toshkent':  [41.2995, 69.2401],
  'Samarqand': [39.6547, 66.9758],
  'Buxoro':    [39.7747, 64.4286],
  "Farg'ona":  [40.3834, 71.7833],
  'Karmana':   [40.1434, 65.3664],
  'Uchquduq':  [41.5567, 63.5503],
};

const STREETS = [
  "Yengilik ko'chasi", "Mustaqillik shoh ko'chasi", "Navoiy ko'chasi",
  "Karmana ko'chasi", "Metallurglar ko'chasi", "Do'stlik ko'chasi",
  "Sultonov ko'chasi", "Gulsanam ko'chasi", "Xorazm ko'chasi",
];

const CLIENT_NAMES = [
  'Ahmed Ota Markit', 'Gemur Ruslan', 'Muratov Jahongir',
  'Armixon Grand Savdo', 'Asad Asil Beklarim', 'Gulsevar Baraka',
  'Timurbekd Shirina', 'Ahmadova Dildora', 'Ikronov Urozbek',
  'Axtan bobo do\'koni', 'Akranov Murodjon', 'ODILBEK ZIYOSI',
  'IBODULLO savdosi', 'MOHINUR MALIKAM', 'LAZIZJON TURSUNOV',
  'Gulsanam Ruslan', 'Baxtiyor Savdo Markazi', 'Navoiy Oziq-Ovqat',
  'Hamza Do\'koni', 'Sarvar Supermarket', 'Dilnoza Nonvoyxona',
  'Umarov Sherzod', 'Kenja Savdo', 'Abdullayev Jamshid',
];

const NAVOIY_DISTRICTS = [
  'Janubiy', 'Shimoliy', 'Markaziy', "G'arbiy", 'Sharqiy',
  '1-mavze', '2-mavze', '3-mavze', 'Karmana', 'Ravshan',
];

const PER_PAGE = 12;

type DeliveryStatus = 'delivered' | 'pending';

interface ClientDelivery {
  idx: number;
  name: string;
  district: string;
  time: string | null;
  status: DeliveryStatus;
}

function generateDeliveryList(empId: number, total: number): ClientDelivery[] {
  const seed = empId * 31;
  return Array.from({ length: total }, (_, i) => {
    const r = (seed + i * 137) % 100;
    const status: DeliveryStatus = r < 65 ? 'delivered' : 'pending';
    const h = 8 + Math.floor((seed + i * 17) % 10);
    const m = (seed + i * 23) % 60;
    return {
      idx: i + 1,
      name: CLIENT_NAMES[(seed + i * 7) % CLIENT_NAMES.length],
      district: NAVOIY_DISTRICTS[(seed + i * 3) % NAVOIY_DISTRICTS.length],
      time: status === 'pending' ? null : `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
      status,
    };
  });
}

function toDelivery(a: AgentRow, i: number) {
  // Default city = Navoiy
  const city = 'Navoiy';
  const base = NAVOIY;
  const idStr = String(a.id);
  const seed = (idStr.charCodeAt(0) + i) * 137;
  const lat = base[0] + ((seed % 100) - 50) * 0.002;
  const lng = base[1] + ((seed % 73) - 36) * 0.002;
  const onlineSeed = (idStr.charCodeAt(1) ?? 65) + i;
  const online = onlineSeed % 3 !== 0;
  const lastSeenMins = online ? 0 : (seed % 120) + 5;
  const street = STREETS[i % STREETS.length];
  const deliveriesTotal = 8 + (seed % 12);
  const deliveriesDone = Math.floor(deliveriesTotal * (0.4 + (seed % 6) * 0.1));
  const deliveryPct = Math.round((deliveriesDone / deliveriesTotal) * 100);
  const count = (a.id + i) % 3 === 0 ? 2 : 1;
  const line1 = LINES[(a.id * 3 + i) % LINES.length];
  const line2 = LINES[(a.id * 7 + i + 5) % LINES.length];
  const lines = count === 2 ? [line1, line2] : [line1];
  return {
    ...a,
    role: ROLES[i % ROLES.length],
    phone: `+998 9${(i % 9) + 1} ${String(30000000 + (i * 1234567) % 90000000).slice(0, 7)}`,
    city,
    lat,
    lng,
    online,
    lastSeenMins,
    street,
    deliveriesTotal,
    deliveriesDone,
    deliveryPct,
    liniyaCount: count,
    lines,
    deliveryList: generateDeliveryList(a.id, deliveriesTotal),
  };
}

// ── Live Location Map ─────────────────────────────────────────────────────────
interface LiveMapProps {
  emp: ReturnType<typeof toDelivery>;
  D: boolean;
  height?: number;
  fullscreen?: boolean;
}

function LiveLocationMap({ emp, D, height = 580, fullscreen }: LiveMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  const [activeLayer, setActiveLayer] = useState<LayerId>('standard');

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: NAVOIY,   // Always start at Navoiy
      zoom: 13,
      zoomControl: true,
      attributionControl: false,
      scrollWheelZoom: true,
      zoomAnimation: false,
    });
    mapRef.current = map;

    const tile = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      subdomains: ['a', 'b', 'c'],
    }).addTo(map);
    tileRef.current = tile;

    if (D) {
      const tilePane = map.getPane('tilePane');
      if (tilePane) {
        tilePane.style.filter = 'invert(1) hue-rotate(180deg) brightness(0.85) saturate(0.7)';
      }
    }

    // Accuracy circle
    L.circle([emp.lat, emp.lng], {
      radius: 150,
      color: emp.online ? '#6366f1' : '#9ca3af',
      fillColor: emp.online ? '#6366f1' : '#9ca3af',
      fillOpacity: 0.10,
      weight: 1.5,
      dashArray: '4 5',
    }).addTo(map);

    // Main marker
    const pinColor = emp.online ? '#6366f1' : '#9ca3af';
    const borderC = D ? '#1c1c1e' : '#ffffff';
    const initials = emp.avatar || emp.name.slice(0, 2).toUpperCase();

    const markerHtml = `
      <div style="position:relative;display:flex;align-items:center;justify-content:center;">
        ${emp.online ? `
        <div style="
          position:absolute;width:52px;height:52px;border-radius:50%;
          background:${pinColor};opacity:0.18;
          animation:lvPulse 2s ease-out infinite;
        "></div>` : ''}
        <div style="
          width:42px;height:42px;border-radius:50%;
          background:${pinColor};border:3px solid ${borderC};
          box-shadow:0 4px 16px rgba(0,0,0,0.35);
          display:flex;align-items:center;justify-content:center;
          position:relative;z-index:2;
        ">
          <span style="color:#fff;font-size:13px;font-weight:700;">${initials}</span>
        </div>
        <div style="
          position:absolute;bottom:-9px;left:50%;transform:translateX(-50%);
          width:0;height:0;
          border-left:7px solid transparent;border-right:7px solid transparent;
          border-top:11px solid ${pinColor};
          z-index:1;
        "></div>
        <div style="
          position:absolute;top:-5px;right:-4px;z-index:3;
          width:14px;height:14px;border-radius:50%;
          background:${emp.online ? '#10b981' : '#9ca3af'};
          border:2px solid ${borderC};
        "></div>
      </div>
    `;

    const icon = L.divIcon({
      html: markerHtml,
      className: '',
      iconSize: [50, 60],
      iconAnchor: [25, 60],
      popupAnchor: [0, -62],
    });

    const marker = L.marker([emp.lat, emp.lng], { icon }).addTo(map);
    marker.bindPopup(`
      <div style="font-family:system-ui;min-width:170px;padding:6px 4px;">
        <div style="font-weight:700;font-size:14px;margin-bottom:5px;">${emp.name}</div>
        <div style="font-size:11px;color:#6b7280;margin-bottom:2px;">${emp.role}</div>
        <div style="font-size:11px;color:#6b7280;margin-bottom:6px;">${emp.street}, ${emp.city}</div>
        <div style="display:flex;align-items:center;gap:6px;">
          <div style="width:8px;height:8px;border-radius:50%;background:${emp.online ? '#10b981' : '#9ca3af'};"></div>
          <span style="font-size:11px;font-weight:600;color:${emp.online ? '#10b981' : '#9ca3af'};">
            ${emp.online ? 'Online' : `${emp.lastSeenMins} daqiqa oldin`}
          </span>
        </div>
      </div>
    `).openPopup();

    // Pan to employee location
    map.panTo([emp.lat, emp.lng]);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const handleLayerChange = (id: LayerId) => {
    setActiveLayer(id);
    if (mapRef.current && tileRef.current) {
      switchTileLayer(mapRef.current, tileRef.current, id, (newTile) => {
        tileRef.current = newTile;
        if (D) {
          const pane = mapRef.current?.getPane('tilePane');
          if (pane) pane.style.filter = 'invert(1) hue-rotate(180deg) brightness(0.85) saturate(0.7)';
        }
      });
    }
  };

  return (
    <div style={{ position: 'relative', height }}>
      <style>{`
        @keyframes lvPulse {
          0%   { transform: scale(1);   opacity: 0.18; }
          70%  { transform: scale(2.5); opacity: 0;    }
          100% { transform: scale(2.5); opacity: 0;    }
        }
      `}</style>
      <div ref={containerRef} style={{ width: '100%', height: '100%', borderRadius: fullscreen ? 0 : 0, overflow: 'hidden' }} />
      <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 999 }}>
        <MapLayerSwitcher activeLayer={activeLayer} onChange={handleLayerChange} D={D} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export function AdminDostavkaTab({ D, card, sub, t, activeAgents, selectedCompanyIds }: Props) {
  const [localEmps, setLocalEmps] = useState(() => activeAgents.map(toDelivery));
  const [search, setSearch]       = useState('');
  const [page, setPage]           = useState(1);
  const [viewEmp, setViewEmp]     = useState<ReturnType<typeof toDelivery> | null>(null);
  const [editEmp, setEditEmp]     = useState<ReturnType<typeof toDelivery> | null>(null);
  const [deleteEmp, setDeleteEmp] = useState<ReturnType<typeof toDelivery> | null>(null);
  const [saved, setSaved]         = useState(false);
  const [form, setForm]           = useState({ name: '', role: '', phone: '', city: '' });
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [mapKey, setMapKey]       = useState(0);
  const [listFilter, setListFilter] = useState<'all' | 'delivered' | 'pending'>('all');
  const [historyEmp, setHistoryEmp] = useState<ReturnType<typeof toDelivery> | null>(null);
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

  useEffect(() => {
    setLocalEmps(activeAgents.map(toDelivery));
    setPage(1);
  }, [activeAgents]);

  const filtered   = localEmps.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.role.toLowerCase().includes(search.toLowerCase()) ||
    e.city.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
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

  const openEdit = (e: ReturnType<typeof toDelivery>) => {
    setForm({ name: e.name, role: e.role, phone: e.phone, city: e.city });
    setEditEmp(e);
  };
  const saveEdit = () => {
    setLocalEmps(prev => prev.map(e => e.id === editEmp!.id ? { ...e, ...form } : e));
    setSaved(true);
    setTimeout(() => { setSaved(false); setEditEmp(null); }, 900);
  };
  const confirmDelete = () => {
    setLocalEmps(prev => prev.filter(e => e.id !== deleteEmp!.id));
    setDeleteEmp(null);
  };

  const InputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: inpBg, border: `1.5px solid ${border}`,
    borderRadius: 10, padding: '9px 12px',
    fontSize: 13, color: txt, outline: 'none',
  };

  const selOrgs = COMPANIES.filter(c => selectedCompanyIds.has(c.id));

  // ── HISTORY PAGE VIEW ────────────────────────────────────────────────────
  if (historyEmp) {
    return (
      <div style={{ padding: '0 0 40px' }}>
        {/* Back header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isSmall ? 8 : 12, marginBottom: 20 }}>
          <button
            onClick={() => setHistoryEmp(null)}
            style={{ width: isSmall ? 32 : 38, height: isSmall ? 32 : 38, borderRadius: 11, border: `1px solid ${D ? 'rgba(255,255,255,0.12)' : '#e5e7eb'}`, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <ChevronLeft size={15} color={txt} />
          </button>
          <div style={{ width: isSmall ? 34 : 40, height: isSmall ? 34 : 40, borderRadius: 12, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: isSmall ? 12 : 14, fontWeight: 700, color: indigo }}>{historyEmp.avatar}</span>
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: isSmall ? 13 : (isMobile ? 14 : 17), fontWeight: 700, color: txt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{historyEmp.name}</div>
            <div style={{ fontSize: 10, color: muted, display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden' }}>
              <span style={{ color: roleColors[historyEmp.role] || indigo, flexShrink: 0 }}>{historyEmp.role}</span>
              <span style={{ flexShrink: 0 }}>·</span>
              <CalendarDays size={9} color={muted} style={{ flexShrink: 0 }} />
              <span style={{ flexShrink: 0 }}>Tarixi</span>
            </div>
          </div>
        </div>

        <DayHistoryPanel empId={historyEmp.id} empName={historyEmp.name} mode="delivery" D={D} />
      </div>
    );
  }

  // ── LOCATION VIEW ─────────────────────────────────────────────────────────
  if (viewEmp) {
    const deliveryPct = Math.round((viewEmp.deliveriesDone / viewEmp.deliveriesTotal) * 100);
    const filteredList = viewEmp.deliveryList.filter(d =>
      listFilter === 'all' ? true : d.status === listFilter
    );

    const statusColor = (s: DeliveryStatus) =>
      s === 'delivered' ? green : amber;
    const statusLabel = (s: DeliveryStatus) =>
      s === 'delivered' ? 'Yetkazildi' : 'Kutilmoqda';

    return (
      <div style={{ padding: '0 0 40px' }}>

        {/* Fullscreen overlay */}
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

        {/* Back header */}
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

        {/* Stats cards */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: isSmall ? 8 : 10, marginBottom: 16 }}>
          {[
            { icon: Package,      label: 'Jami yetkazish', value: String(viewEmp.deliveriesTotal),                          color: '#94a3b8' },
            { icon: CheckCircle2, label: 'Yetkazildi',     value: String(viewEmp.deliveriesDone),                           color: green    },
            { icon: XCircle,      label: 'Qoldi',          value: String(viewEmp.deliveriesTotal - viewEmp.deliveriesDone), color: amber    },
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

        {/* Map + Info */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 280px', background: cardBg, border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden', marginBottom: 16 }}>

          {/* Map */}
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

          {/* Info panel */}
          <div style={{ borderLeft: isMobile ? 'none' : `1px solid ${border}`, borderTop: isMobile ? `1px solid ${border}` : 'none', padding: isMobile ? 14 : 20, display: 'flex', flexDirection: 'column', gap: isMobile ? 8 : 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Xodim ma'lumotlari
            </div>

            {/* Online status */}
            <div style={{ padding: '10px 12px', borderRadius: 10, background: D ? 'rgba(255,255,255,0.03)' : '#f8fafc', border: `1px solid ${border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: viewEmp.online ? green : '#9ca3af', boxShadow: viewEmp.online ? `0 0 0 3px ${green}30` : 'none', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: viewEmp.online ? green : muted }}>
                    {viewEmp.online ? 'Hozir online' : 'Offline'}
                  </div>
                  <div style={{ fontSize: 10, color: muted }}>
                    {viewEmp.online ? 'Faol' : `${viewEmp.lastSeenMins} daqiqa oldin ko'rindi`}
                  </div>
                </div>
                {viewEmp.online && <div style={{ marginLeft: 'auto' }}><Signal size={14} color={green} /></div>}
              </div>
            </div>

            {/* Info rows */}
            {[
              { icon: MapPin,  label: t.colLegalAddr||'Manzil',    value: viewEmp.street },
              { icon: MapPin,  label: t.colCity||'Shahar',          value: viewEmp.city },
              { icon: Phone,   label: t.colPhone||'Telefon',        value: viewEmp.phone },
              { icon: Package, label: t.colDelivery||'Yetkazish',   value: `${viewEmp.deliveriesDone}/${viewEmp.deliveriesTotal} ${t.pieces||'ta'} ${t.savedBtn ? '' : 'bajarildi'}` },
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

            {/* Delivery progress */}
            <div style={{ padding: '10px 12px', borderRadius: 10, background: D ? 'rgba(255,255,255,0.03)' : '#f8fafc', border: `1px solid ${border}` }}>
              <div style={{ fontSize: 10, color: muted, marginBottom: 6, fontWeight: 600 }}>Yetkazish jarayoni</div>
              <div style={{ height: 6, borderRadius: 3, background: D ? '#333' : '#e5e7eb', overflow: 'hidden', marginBottom: 4 }}>
                <div style={{ height: '100%', borderRadius: 3, background: indigo, width: `${deliveryPct}%`, transition: 'width 0.6s ease' }} />
              </div>
              <div style={{ fontSize: 10, color: muted }}>{deliveryPct}% bajarildi</div>
            </div>

            {/* Coordinates */}
            <div style={{ padding: '10px 12px', borderRadius: 10, background: D ? 'rgba(255,255,255,0.03)' : '#f8fafc', border: `1px solid ${border}` }}>
              <div style={{ fontSize: 10, color: muted, fontWeight: 600, marginBottom: 4 }}>Koordinatalar</div>
              <div style={{ fontSize: 11, color: txt, fontFamily: 'monospace' }}>{viewEmp.lat.toFixed(5)}, {viewEmp.lng.toFixed(5)}</div>
            </div>
          </div>
        </div>

        {/* ── DELIVERY LIST ──────────────────────────────────────────────────── */}
        <DayHistoryPanel empId={viewEmp.id} empName={viewEmp.name} mode="delivery" D={D} />

      </div>
    );
  }

  // ── LIST VIEW ────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '0 0 32px', width: '100%', minWidth: 0, overflowX: 'hidden' }}>

      {/* Edit modal */}
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
              <div style={{ display: 'grid', gridTemplateColumns: isSmall ? '1fr' : '1fr 1fr', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 11, color: muted, marginBottom: 4, fontWeight: 600 }}>{t.formRole || 'LAVOZIM'}</div>
                  <select style={{ ...InputStyle, appearance: 'none' }} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                    {ROLES.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: muted, marginBottom: 4, fontWeight: 600 }}>{t.formCity || 'SHAHAR'}</div>
                  <input style={InputStyle} value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: muted, marginBottom: 4, fontWeight: 600 }}>{t.formPhone || 'TELEFON'}</div>
                <input style={InputStyle} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setEditEmp(null)} style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: txt, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{t.cancelBtn || 'Bekor'}</button>
              <button onClick={saveEdit} style={{ flex: 2, padding: '11px 0', borderRadius: 10, border: 'none', background: saved ? green : indigo, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'background .2s' }}>
                {saved ? <><Check size={14} /> {t.savedBtn || 'Saqlandi!'}</> : (t.save || 'Saqlash')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteEmp && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setDeleteEmp(null)}>
          <div style={{ background: modalBg, borderRadius: 18, padding: 28, width: 360, maxWidth: '92vw', boxShadow: '0 24px 60px rgba(0,0,0,0.3)', border: `1px solid ${border}`, textAlign: 'center' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(239,68,68,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <AlertTriangle size={24} color={red} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: txt, marginBottom: 8 }}>{t.deleteEmpTitle || "Xodimni o'chirish"}</div>
            <div style={{ fontSize: 13, color: muted, marginBottom: 24 }}>
              <b style={{ color: txt }}>{deleteEmp.name}</b><br />{t.deleteEmpConfirm || "xodimini o'chirmoqchimisiz?"}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteEmp(null)} style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: txt, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{t.cancelBtn || 'Bekor'}</button>
              <button onClick={confirmDelete} style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: 'none', background: red, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{t.deleteBtn || "O'chirish"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <div style={{ width: isSmall ? 32 : 36, height: isSmall ? 32 : 36, borderRadius: 10, background: `${indigo}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Truck size={isSmall ? 15 : 17} color={indigo} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: isSmall ? 14 : 17, fontWeight: 700, color: txt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.dostavkaPageTitle || 'Dostavka xodimlari'}</div>
            <div style={{ fontSize: 11, color: muted }}>{t.totalEmpLabel || 'Jami'}: {localEmps.length} {t.empUnit || 'xodim'}</div>
          </div>
        </div>
        <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: isMobile ? '8px 12px' : '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', background: indigo, color: '#fff', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
          <Plus size={14} />{!isMobile && ` ${t.addEmpBtn || "Xodim qo'shish"}`}
        </button>
      </div>

      {/* Org chips */}
      {selOrgs.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
          <span style={{ fontSize: 11, color: muted, alignSelf: 'center' }}>{t.filterLabel || 'Filtr'}:</span>
          {selOrgs.map(org => (
            <span key={org.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 8, background: D ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)', border: `1px solid ${D ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.2)'}`, fontSize: 12, fontWeight: 600, color: D ? '#a5b4fc' : '#4f46e5' }}>
              <span>{org.icon}</span> {org.shortName}
            </span>
          ))}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: isSmall ? 8 : 12, marginBottom: 16 }}>
        {[
          { label: t.dostavkaTotalCard || 'Jami xodimlar', value: String(localEmps.length),                                   color: indigo },
          { label: t.empOnline        || 'Online',        value: String(localEmps.filter(e => e.online).length),              color: green  },
          { label: t.empOffline       || 'Offline',       value: String(localEmps.filter(e => !e.online).length),             color: red    },
          { label: t.colDelivery      || 'Yetkazish',     value: String(localEmps.reduce((s, e) => s + e.deliveriesDone, 0)), color: amber  },
        ].map(s => (
          <div key={s.label} className={card} style={{ borderRadius: 12, border: `1px solid ${border}`, padding: isSmall ? '10px 12px' : '14px 16px' }}>
            <div style={{ fontSize: isSmall ? 18 : 22, fontWeight: 700, color: txt }}>{s.value}</div>
            <div style={{ fontSize: isSmall ? 10 : 11, color: muted, marginTop: 2 }}>{s.label}</div>
            <div style={{ height: 3, borderRadius: 2, background: s.color, marginTop: isSmall ? 6 : 8, opacity: 0.6 }} />
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={14} color={muted} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder={t.dostavkaSearchPlaceholder || "Ism yoki shahar bo'yicha qidirish..."}
          style={{ width: '100%', boxSizing: 'border-box', background: inpBg, border: `1.5px solid ${border}`, borderRadius: 10, padding: '10px 12px 10px 36px', fontSize: 13, color: txt, outline: 'none' }}
        />
      </div>

      {/* Table header — desktop only */}
      {!isMobile && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 120px 160px 140px 80px 90px 130px', gap: 8, padding: '8px 12px', borderRadius: 8, background: D ? 'rgba(255,255,255,0.04)' : '#f3f4f6', marginBottom: 6 }}>
          {[t.colEmp||'Xodim', t.colRole||'Lavozim', t.navLiniya||'Liniya', t.colPhone||'Telefon', t.colStatus2||'Status', t.colDelivery||'Yetkazish', t.colActions||'Amallar'].map(h => (
            <span key={h} style={{ fontSize: 10, fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</span>
          ))}
        </div>
      )}

      {/* Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {paginated.map(emp => {
          if (isMobile) return (
            /* ── MOBILE CARD ── */
            <div key={emp.id} style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 9 }}>

              {/* Row 1: avatar + name — full width */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 11, background: `${indigo}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: indigo }}>{emp.avatar}</span>
                  </div>
                  <div style={{ position: 'absolute', bottom: -1, right: -1, width: 11, height: 11, borderRadius: '50%', background: emp.online ? green : '#9ca3af', border: `2px solid ${D ? '#0f0f0f' : '#ffffff'}` }} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: txt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 5, background: `${roleColors[emp.role] || indigo}18`, color: roleColors[emp.role] || indigo, whiteSpace: 'nowrap' }}>{emp.role}</span>
                    {emp.online
                      ? <><Wifi size={9} color={green} /><span style={{ fontSize: 10, color: green, fontWeight: 600 }}>Online</span></>
                      : <><WifiOff size={9} color={muted} /><span style={{ fontSize: 10, color: muted }}>Offline</span></>
                    }
                  </div>
                </div>
              </div>

              {/* Row 2: phone + liniya */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Phone size={11} color={muted} />
                  <span style={{ fontSize: 11, color: muted }}>{emp.phone}</span>
                </div>
                {(emp.lines || []).slice(0, 1).map(ln => (
                  <div key={ln.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <GitBranch size={10} color={amber} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: amber, background: `${amber}18`, borderRadius: 4, padding: '1px 5px', flexShrink: 0 }}>{ln.code}</span>
                    <span style={{ fontSize: 10, color: muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 100 }}>{ln.name}</span>
                  </div>
                ))}
              </div>

              {/* Row 3: delivery progress */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ height: 4, borderRadius: 2, background: D ? '#333' : '#e5e7eb', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: emp.deliveryPct >= 70 ? green : amber, borderRadius: 2, width: `${emp.deliveryPct}%` }} />
                </div>
                <div style={{ fontSize: 10, color: muted }}>{emp.deliveriesDone}/{emp.deliveriesTotal} yetkazildi · {emp.deliveryPct}%</div>
              </div>

              {/* Row 4: action buttons — full width row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: isSmall ? 4 : 6, paddingTop: 4, borderTop: `1px solid ${D ? 'rgba(255,255,255,0.06)' : '#f3f4f6'}` }}>
                <button onClick={() => setHistoryEmp(emp)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1, justifyContent: 'center', height: isSmall ? 30 : 32, borderRadius: 8, border: `1px solid ${D ? 'rgba(255,255,255,0.10)' : '#e5e7eb'}`, background: 'transparent', cursor: 'pointer' }}>
                  <CalendarDays size={11} color={indigo} />
                  <span style={{ fontSize: isSmall ? 10 : 11, color: indigo, fontWeight: 600 }}>Tarix</span>
                </button>
                <button onClick={() => { setViewEmp(emp); setMapKey(k => k + 1); setListFilter('all'); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1, justifyContent: 'center', height: isSmall ? 30 : 32, borderRadius: 8, border: `1px solid ${emp.online ? 'rgba(16,185,129,0.35)' : border}`, background: emp.online ? 'rgba(16,185,129,0.10)' : (D ? 'rgba(255,255,255,0.05)' : '#f3f4f6'), cursor: 'pointer' }}>
                  <Navigation size={11} color={emp.online ? green : muted} />
                  <span style={{ fontSize: isSmall ? 10 : 11, color: emp.online ? green : muted, fontWeight: 600 }}>Lokatsiya</span>
                </button>
                <div style={{ flex: isSmall ? 0 : 1 }} />
                <button onClick={() => openEdit(emp)}
                  style={{ width: isSmall ? 30 : 32, height: isSmall ? 30 : 32, borderRadius: 8, border: 'none', cursor: 'pointer', background: D ? 'rgba(255,255,255,0.07)' : '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Edit2 size={12} color={indigo} />
                </button>
                <button onClick={() => setDeleteEmp(emp)}
                  style={{ width: isSmall ? 30 : 32, height: isSmall ? 30 : 32, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'rgba(239,68,68,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Trash2 size={12} color={red} />
                </button>
              </div>

            </div>
          );
          return (
          /* ── DESKTOP ROW ── */
          <div key={emp.id}
            style={{ display: 'grid', gridTemplateColumns: '2fr 120px 160px 140px 80px 90px 130px', gap: 8, padding: '11px 14px', borderRadius: 10, border: `1px solid ${border}`, alignItems: 'center', transition: 'all .12s' }}
            className={D ? 'hover:bg-white/5' : 'hover:bg-gray-50'}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = border; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'transparent'; }}>

            {/* Name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: `${indigo}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: indigo }}>{emp.avatar}</span>
                </div>
                <div style={{ position: 'absolute', bottom: -2, right: -2, width: 10, height: 10, borderRadius: '50%', background: emp.online ? green : '#9ca3af', border: `2px solid ${D ? '#0f0f0f' : '#f8f9fb'}` }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: txt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.name}</div>
                <div style={{ fontSize: 10, color: muted }}>
                  {(() => { const org = COMPANIES.find(c => c.id === emp.orgId); return org ? `${org.icon} ${org.shortName}` : '—'; })()}
                </div>
              </div>
            </div>

            {/* Role */}
            <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: `${roleColors[emp.role] || indigo}18`, color: roleColors[emp.role] || indigo, whiteSpace: 'nowrap' }}>
              {emp.role}
            </span>

            {/* Liniya */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {(emp.lines || []).map(ln => (
                <div key={ln.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <GitBranch size={10} color={amber} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: amber, background: `${amber}18`, borderRadius: 4, padding: '1px 5px', flexShrink: 0 }}>{ln.code}</span>
                  <span style={{ fontSize: 10, color: muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ln.name}</span>
                </div>
              ))}
            </div>

            {/* Phone */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Phone size={11} color={muted} />
              <span style={{ fontSize: 11, color: muted }}>{emp.phone}</span>
            </div>

            {/* Online status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              {emp.online
                ? <><Wifi size={11} color={green} /><span style={{ fontSize: 11, color: green, fontWeight: 600 }}>Online</span></>
                : <><WifiOff size={11} color={muted} /><span style={{ fontSize: 11, color: muted }}>Offline</span></>
              }
            </div>

            {/* Delivery progress mini */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ height: 4, borderRadius: 2, background: D ? '#333' : '#e5e7eb', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: emp.deliveryPct >= 70 ? green : amber, borderRadius: 2, width: `${emp.deliveryPct}%` }} />
              </div>
              <span style={{ fontSize: 9, color: muted }}>{emp.deliveriesDone}/{emp.deliveriesTotal} · {emp.deliveryPct}%</span>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button onClick={() => setHistoryEmp(emp)}
                style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '5px 7px', borderRadius: 7, border: `1px solid ${D ? 'rgba(255,255,255,0.12)' : '#e5e7eb'}`, background: 'transparent', color: muted, fontSize: 11, fontWeight: 500, cursor: 'pointer', transition: 'all .15s', whiteSpace: 'nowrap' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = indigo; (e.currentTarget as HTMLElement).style.color = indigo; (e.currentTarget as HTMLElement).style.background = `${indigo}10`; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = D ? 'rgba(255,255,255,0.12)' : '#e5e7eb'; (e.currentTarget as HTMLElement).style.color = muted; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                title="Tarixni ko'rish">
                <CalendarDays size={11} />
                <span>Tarix</span>
              </button>
              <button onClick={() => { setViewEmp(emp); setMapKey(k => k + 1); setListFilter('all'); }}
                style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '5px 7px', borderRadius: 7, border: `1px solid ${emp.online ? 'rgba(16,185,129,0.35)' : border}`, background: emp.online ? 'rgba(16,185,129,0.10)' : (D ? 'rgba(255,255,255,0.05)' : '#f3f4f6'), color: emp.online ? green : muted, fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all .15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = emp.online ? 'rgba(16,185,129,0.2)' : (D ? 'rgba(255,255,255,0.1)' : '#e5e7eb'); }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = emp.online ? 'rgba(16,185,129,0.10)' : (D ? 'rgba(255,255,255,0.05)' : '#f3f4f6'); }}
                title="Joylashuvni ko'rish">
                <Navigation size={11} />
              </button>
              <button onClick={() => openEdit(emp)}
                style={{ width: 28, height: 28, borderRadius: 7, border: 'none', cursor: 'pointer', background: D ? 'rgba(255,255,255,0.07)' : '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = D ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.1)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = D ? 'rgba(255,255,255,0.07)' : '#f3f4f6'; }}>
                <Edit2 size={12} color={indigo} />
              </button>
              <button onClick={() => setDeleteEmp(emp)}
                style={{ width: 28, height: 28, borderRadius: 7, border: 'none', cursor: 'pointer', background: 'rgba(239,68,68,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.18)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)'; }}>
                <Trash2 size={12} color={red} />
              </button>
            </div>
          </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 20, flexWrap: 'wrap' }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${border}`, background: 'transparent', cursor: page === 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: page === 1 ? 0.35 : 1 }}>
            <ChevronLeft size={14} color={D ? '#f9fafb' : '#374151'} />
          </button>
          {isMobile ? (
            Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
              .reduce<(number | string)[]>((acc, n, idx, arr) => {
                if (idx > 0 && typeof arr[idx - 1] === 'number' && (n as number) - (arr[idx - 1] as number) > 1) acc.push('…');
                acc.push(n);
                return acc;
              }, [])
              .map((n, i) => typeof n === 'string' ? (
                <span key={`dot-${i}`} style={{ width: 28, textAlign: 'center', color: D ? '#6b7280' : '#9ca3af', fontSize: 13 }}>…</span>
              ) : (
                <button key={n} onClick={() => setPage(n as number)}
                  style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${n === page ? indigo : border}`, background: n === page ? indigo : 'transparent', color: n === page ? '#fff' : (D ? '#f9fafb' : '#374151'), fontSize: 13, fontWeight: n === page ? 700 : 400, cursor: 'pointer' }}>
                  {n}
                </button>
              ))
          ) : (
            Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
              <button key={n} onClick={() => setPage(n)}
                style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${n === page ? indigo : border}`, background: n === page ? indigo : 'transparent', color: n === page ? '#fff' : (D ? '#f9fafb' : '#374151'), fontSize: 13, fontWeight: n === page ? 700 : 400, cursor: 'pointer', transition: 'all .15s' }}>
                {n}
              </button>
            ))
          )}
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${border}`, background: 'transparent', cursor: page === totalPages ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: page === totalPages ? 0.35 : 1 }}>
            <ChevronRight size={14} color={D ? '#f9fafb' : '#374151'} />
          </button>
        </div>
      )}
    </div>
  );
}