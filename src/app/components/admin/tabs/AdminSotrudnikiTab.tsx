import { useState, useEffect } from 'react';
import {
  Users2, Search, Plus, Phone, MapPin, Edit2, Trash2, X,
  AlertTriangle, Check, ChevronLeft, ChevronRight,
  GitBranch, Route, CalendarDays, ShoppingCart, XCircle,
  Clock, Navigation, ArrowRight, CheckCircle2, Circle,
  LogIn, Flag, Hourglass, Map, Maximize2, Minimize2,
  PhoneCall, Wifi, WifiOff, BarChart3,
} from 'lucide-react';
import { LINES, type AgentRow } from '../../../data/adminData';
import { COMPANIES } from '../../AdminAuthContext';
import { TrackingMap } from '../TrackingMap';
import { DayHistoryPanel } from '../DayHistoryPanel';
import { InlineEmployeeMap } from '../../InlineEmployeeMap';
import type { EmployeeMarker } from '../../EmployeeMapModal';
import { MiniBarChart } from '../../MiniCharts';

interface Props {
  D: boolean;
  card: string;
  divider: string;
  sub: string;
  t: Record<string, string>;
  activeAgents: AgentRow[];
  selectedCompanyIds: Set<string>;
  showBalances: boolean;
  activeMapEmployees?: EmployeeMarker[];
  mapCenterInfo?: { center: [number, number]; label: string; zoom: number };
  setShowEmpMap?: (v: boolean) => void;
  activeWeekly?: { day: string; visits: number; orders: number }[];
}

const ROLES = ['Agent', 'Supervisor'];
const CITIES_LIST = ['Navoiy', 'Toshkent', 'Samarqand', 'Buxoro', "Farg'ona", 'Karmana', 'Uchquduq'];
const STREETS = [
  "Yengilik ko'chasi", "Mustaqillik shoh ko'chasi", "Navoiy ko'chasi",
  "Karmana ko'chasi", "Metallurglar ko'chasi", "Qo'shrabot ko'chasi",
  "Sultonov ko'chasi", "Do'stlik ko'chasi", "Gulsanam ko'chasi",
  "Farruxobod ko'chasi", "Xorazm ko'chasi", "Neftchilar ko'chasi",
];

const NAVOIY_DISTRICTS = [
  'Janubiy', 'Shimoliy', 'Markaziy', "G'arbiy", 'Sharqiy',
  '1-mavze', '2-mavze', '3-mavze', 'Karmana', 'Ravshan tumani',
];

// ── Real client/shop names ─────────────────────────────────────────────────
const CLIENT_NAMES = [
  'Ahmed Ota Markit', 'Gemur Ruslan', 'Muratov Jahongir',
  'Issiqlik elekter stansiyasi', 'Armixon Grand Savdo', 'Asad Asil Beklarim',
  'Gulsevar Baraka Nonlari', 'Timurbekd Shirina', 'Ahmudova Dildora',
  'Okrabot.Best.Trade MNK', 'Ikronov Urozbek', 'Axtan bobo',
  'XAZORO POYDEVORI', 'Akranov «Murodjon» RTT', 'PALMATOVA KUYIDUZ',
  'ODILBEK ZIYOSI', 'IBODULLO', 'MOHINUR MALIKAM',
  'LAZIZJON TURSUNOV', 'Gulsanam Ruslan', 'Baxtiyor Savdo Markazi',
  'Navoiy Oziq-Ovqat', 'Hamza Do\'koni', 'Sarvar Supermarket',
  'Dilnoza Nonvoyxona', 'Umarov Sherzod', 'Kenja Savdo',
  'Abdullayev Jamshid', 'Zulfiya Bozor', 'Nodira Mahsulotlari',
  'Ravshan Oziq-Ovqat', 'Komiljon TTM', 'Sultonov Farruх',
  'Mirzo Grand Market', 'Alisher Do\'koni', 'Holmatov Behruz',
  'Sabohat Nonvoyxona', 'Firdavs Supermarket', 'Toshmatov Jasur',
  'Barno Mahsulotlari', 'Iqbol Savdo TTM', 'Qodirov Ulugbek',
  'Nasiba Oziq-Ovqat', 'Saidakbar Market', 'Yuldoshev Nodir',
  'Gulnora Savdo Nuqtasi', 'Muhammadali TTM', 'Bekzod Supermarket',
  'Nilufar Bozori', 'Hayot Oziq-Ovqat', 'Otajonov Mansur',
  'Kamola Market', 'Sanjar Do\'koni', 'Rustam Savdo Markazi',
  'Xurshid Oziq-Ovqat', 'Mavluda Nonvoyxona', 'Davron TTM',
  'Sherali Grand Savdo', 'Aziza Mahsulotlari', 'Muzaffar Market',
];

const CITY_COORDS: Record<string, [number, number]> = {
  'Navoiy':    [40.0843, 65.3791],
  'Toshkent':  [41.2995, 69.2401],
  'Samarqand': [39.6547, 66.9758],
  'Buxoro':    [39.7747, 64.4286],
  "Farg'ona":  [40.3834, 71.7833],
  'Karmana':   [40.1434, 65.3664],
  'Uchquduq':  [41.5567, 63.5503],
};

function toEmployee(a: AgentRow, i: number) {
  const count = (a.id + i) % 3 === 0 ? 2 : 1;
  const line1 = LINES[(a.id * 3 + i) % LINES.length];
  const line2 = LINES[(a.id * 7 + i + 5) % LINES.length];
  const lines = count === 2 ? [line1, line2] : [line1];
  return {
    ...a,
    role: ROLES[i % ROLES.length],
    phone: `+998 9${(i % 9) + 1} ${String(30000000 + (i * 1234567) % 90000000).slice(0, 7)}`,
    city: CITIES_LIST[i % CITIES_LIST.length],
    hireDate: `${2019 + (i % 5)}-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
    liniyaCount: count,
    lines,
  };
}

// ── Tracking data generator ────────────────────────────────────────────────
type PointStatus = 'ordered' | 'visited' | 'missed' | 'remote_ordered';

interface TrackPoint {
  idx: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  time: string | null;
  status: PointStatus;
  duration: number | null;
}

interface DayTrack {
  date: string;
  label: string;
  total: number;
  visited: number;         // borilgan, zakaz olingan (ordered)
  visitedNoOrder: number;  // borilgan, zakaz olinmagan
  remoteOrdered: number;   // borilmagan, lekin zakaz olingan (qo'ng'iroq orqali)
  missed: number;          // borilmagan, zakaz ham olinmagan
  km: number;
  startCity: string;
  endCity: string;
  loginTime: string;
  firstPointTime: string;
  lastPointTime: string;
  onlineHours: string;
  empLat: number;
  empLng: number;
  empOnline: boolean;
  empLastSeen: string;
  points: TrackPoint[];
}

function generateDayTrack(empId: number, dateStr: string): DayTrack {
  const [y, m, d] = dateStr.split('-').map(Number);
  const seed = ((empId * 7 + d * 3 + m * 13 + y) % 97) || 5;
  const total = 14 + (seed % 8);
  const visitedTotal   = Math.floor(total * (0.55 + (seed % 5) * 0.07));
  const orderedCount   = Math.floor(visitedTotal * (0.45 + (seed % 6) * 0.08));
  const visitedNoOrder = visitedTotal - orderedCount;
  const missedPool     = total - visitedTotal;
  const remoteOrderedCount = Math.max(1, Math.floor(missedPool * 0.28));
  const missedCount    = missedPool - remoteOrderedCount;

  // Login & timing
  const loginHour = 7 + (seed % 2);
  const loginMin  = 20 + (seed % 40);
  const firstHour = loginHour + (loginMin + 25 + seed % 20 >= 60 ? 1 : 0);
  const firstMin  = (loginMin + 25 + seed % 20) % 60;
  const lastHour  = firstHour + Math.floor(visitedTotal * 0.45);
  const lastMin   = (firstMin + seed * 3) % 60;
  const onlineMin = (lastHour - loginHour) * 60 + (lastMin - loginMin);
  const onlineH   = Math.floor(Math.abs(onlineMin) / 60);
  const onlineM   = Math.abs(onlineMin) % 60;

  const fmt2 = (h: number, m: number) => `${h}:${String(m).padStart(2, '0')}`;
  const loginTime      = fmt2(loginHour, loginMin);
  const firstPointTime = fmt2(firstHour, firstMin);
  const lastPointTime  = fmt2(Math.min(lastHour, 18), lastMin);
  const onlineHours    = `${onlineH} soat ${onlineM} daq`;

  const [baseLat, baseLng] = [40.0843, 65.3791];

  const points: TrackPoint[] = Array.from({ length: total }, (_, i) => {
    const isVisited      = i < visitedTotal;
    const hasOrder       = isVisited && i < orderedCount;
    const isRemoteOrder  = !isVisited && (i - visitedTotal) < remoteOrderedCount;
    const hour = firstHour + Math.floor((i / Math.max(visitedTotal, 1)) * (lastHour - firstHour));
    const min  = (firstMin + i * 17 + seed * 3) % 60;

    const angle  = (seed * 0.2 + i * 0.42) % (2 * Math.PI);
    const radius = 0.008 + (i / total) * 0.045;
    const lat = baseLat + Math.sin(angle) * radius;
    const lng = baseLng + Math.cos(angle) * radius;

    const status: PointStatus = isVisited
      ? (hasOrder ? 'ordered' : 'visited')
      : (isRemoteOrder ? 'remote_ordered' : 'missed');

    return {
      idx: i + 1,
      name: CLIENT_NAMES[(seed * 3 + i * 7 + empId) % CLIENT_NAMES.length],
      address: `Navoiy, ${NAVOIY_DISTRICTS[(i + seed) % NAVOIY_DISTRICTS.length]}, ${STREETS[(i + seed * 2) % STREETS.length]}`,
      lat, lng,
      time:     (isVisited || isRemoteOrder) ? fmt2(hour, min) : null,
      status,
      duration: isVisited ? 5 + (i * seed) % 25 : null,
    };
  });

  // Employee current/last location — near last visited point
  const lastVisited = [...points].reverse().find(p => p.status === 'ordered' || p.status === 'visited');
  const empLat = lastVisited ? lastVisited.lat + (seed % 10 - 5) * 0.0008 : baseLat;
  const empLng = lastVisited ? lastVisited.lng + (seed % 10 - 5) * 0.0008 : baseLng;
  const empOnline  = seed % 4 !== 0; // 75% online
  const empLastSeen = empOnline ? 'Hozir online' : `${lastPointTime} da oxirgi marta online`;

  const months = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
  const days   = ['Yak', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'];
  const dt = new Date(y, m - 1, d);

  return {
    date: dateStr,
    label: `${days[dt.getDay()]}, ${d} ${months[m - 1]}`,
    total,
    visited: orderedCount,
    visitedNoOrder,
    remoteOrdered: remoteOrderedCount,
    missed: missedCount,
    km: 45 + (seed % 80),
    startCity: 'Navoiy',
    endCity: 'Navoiy',
    loginTime, firstPointTime, lastPointTime, onlineHours,
    empLat, empLng, empOnline, empLastSeen,
    points,
  };
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

const TODAY = '2026-03-08';
const PER_PAGE = 12;

// ── Main component ─────────────────────────────────────────────────────────
export function AdminSotrudnikiTab({ D, card, divider, sub, t, activeAgents, selectedCompanyIds, showBalances, activeMapEmployees = [], mapCenterInfo, setShowEmpMap, activeWeekly = [] }: Props) {
  const [localEmps, setLocalEmps] = useState(() => activeAgents.map(toEmployee));
  const [search, setSearch]       = useState('');
  const [page, setPage]           = useState(1);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [editEmp, setEditEmp]     = useState<ReturnType<typeof toEmployee> | null>(null);
  const [deleteEmp, setDeleteEmp] = useState<ReturnType<typeof toEmployee> | null>(null);
  const [trackingEmp, setTrackingEmp] = useState<ReturnType<typeof toEmployee> | null>(null);
  const [saved, setSaved]         = useState(false);
  const [form, setForm]           = useState({ name: '', role: '', phone: '', city: '' });
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [mapKey, setMapKey]       = useState(0);
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [pointFilter, setPointFilter] = useState<string | null>(null);
  const [historyEmp, setHistoryEmp] = useState<ReturnType<typeof toEmployee> | null>(null);
  const [isMobile, setIsMobile]   = useState(false);
  const [isSmall, setIsSmall]     = useState(false);
  const [weeklyPanelView, setWeeklyPanelView] = useState<'map' | 'chart'>('map');

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
    setLocalEmps(activeAgents.map(toEmployee));
    setPage(1);
  }, [activeAgents]);

  const filtered   = localEmps.filter(e => {
    const matchSearch =
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.role.toLowerCase().includes(search.toLowerCase()) ||
      e.city.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      statusFilter === 'active'   ? e.status === 'active'   :
      statusFilter === 'inactive' ? e.status !== 'active'   : true;
    return matchSearch && matchStatus;
  });
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalLiniya = localEmps.reduce((s, e) => s + e.liniyaCount, 0);

  // Colors
  const txt     = D ? '#f9fafb' : '#111827';
  const muted   = D ? '#6b7280' : '#9ca3af';
  const border  = D ? 'rgba(255,255,255,0.07)' : '#e5e7eb';
  const inpBg   = D ? '#1a1a1a' : '#f9fafb';
  const indigo  = '#6366f1';
  const green   = '#10b981';
  const amber   = '#f59e0b';
  const red     = '#ef4444';
  const blue    = '#3b82f6';
  const modalBg = D ? '#1c1c1e' : '#ffffff';
  const cardBg  = D ? '#161616' : '#ffffff';

  const roleColors: Record<string, string> = {
    Agent: indigo, Supervisor: green, Menedjer: amber, Direktor: red,
  };

  const openEdit = (e: ReturnType<typeof toEmployee>) => {
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
            <ChevronLeft size={15} color={D ? '#f9fafb' : '#111827'} />
          </button>
          <div style={{ width: isSmall ? 34 : 40, height: isSmall ? 34 : 40, borderRadius: 12, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: isSmall ? 12 : 14, fontWeight: 700, color: '#6366f1' }}>{historyEmp.avatar}</span>
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: isSmall ? 13 : (isMobile ? 14 : 17), fontWeight: 700, color: D ? '#f9fafb' : '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{historyEmp.name}</div>
            <div style={{ fontSize: 10, color: D ? '#6b7280' : '#9ca3af', display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden' }}>
              <span style={{ color: '#6366f1', flexShrink: 0 }}>{historyEmp.role}</span>
              <span style={{ flexShrink: 0 }}>·</span>
              <CalendarDays size={9} color={D ? '#6b7280' : '#9ca3af'} style={{ flexShrink: 0 }} />
              <span style={{ flexShrink: 0 }}>Tarixi</span>
            </div>
          </div>
        </div>

        <DayHistoryPanel empId={historyEmp.id} empName={historyEmp.name} mode="agent" D={D} />
      </div>
    );
  }

  // ── TRACKING VIEW ─────────────────────────────────────────────────────────
  if (trackingEmp) {
    const dayTrack = generateDayTrack(trackingEmp.id, selectedDate);
    const filteredPoints = pointFilter
      ? dayTrack.points.filter(p => p.status === pointFilter)
      : dayTrack.points;

    // Map content JSX — reused in both normal and fullscreen modes
    const mapContent = (fullscreen: boolean) => (
      <TrackingMap
        key={`${dayTrack.date}-${mapKey}-${pointFilter ?? 'all'}-${fullscreen}`}
        points={filteredPoints}
        startCity={dayTrack.startCity}
        endCity={dayTrack.endCity}
        D={D}
        height={fullscreen ? window.innerHeight - 80 : 320}
        empLocation={{ lat: dayTrack.empLat, lng: dayTrack.empLng, online: dayTrack.empOnline, lastSeen: dayTrack.empLastSeen }}
      />
    );

    return (
      <div style={{ padding: '0 0 40px' }}>

        {/* Fullscreen map overlay */}
        {mapFullscreen && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: D ? '#111' : '#fff',
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{
              height: 52, display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', padding: '0 20px',
              borderBottom: `1px solid ${border}`,
              background: cardBg, flexShrink: 0,
              boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
            }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: txt }}>
                {trackingEmp.name} — {dayTrack.label}
              </div>
              <button
                onClick={() => { setMapFullscreen(false); setMapKey(k => k + 1); }}
                style={{
                  width: 36, height: 36, borderRadius: 10,
                  border: `1px solid ${border}`, background: D ? 'rgba(255,255,255,0.08)' : '#f3f4f6',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Minimize2 size={16} color={txt} />
              </button>
            </div>
            <div style={{ flex: 1, position: 'relative' }}>
              <TrackingMap
                key={`${dayTrack.date}-${mapKey}-${pointFilter ?? 'all'}-fs`}
                points={filteredPoints}
                startCity={dayTrack.startCity}
                endCity={dayTrack.endCity}
                D={D}
                height={typeof window !== 'undefined' ? window.innerHeight - 52 : 600}
                empLocation={{ lat: dayTrack.empLat, lng: dayTrack.empLng, online: dayTrack.empOnline, lastSeen: dayTrack.empLastSeen }}
              />
            </div>
          </div>
        )}

        {/* Back header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isSmall ? 8 : 12, marginBottom: 16 }}>
          <button onClick={() => setTrackingEmp(null)} style={{
            width: isSmall ? 32 : 36, height: isSmall ? 32 : 36, borderRadius: 10, border: `1px solid ${border}`,
            background: 'transparent', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <ChevronLeft size={15} color={txt} />
          </button>
          <div style={{ width: isSmall ? 34 : 38, height: isSmall ? 34 : 38, borderRadius: 11, background: `${indigo}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: isSmall ? 12 : 13, fontWeight: 700, color: indigo }}>{trackingEmp.avatar}</span>
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: isSmall ? 13 : (isMobile ? 14 : 16), fontWeight: 700, color: txt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{trackingEmp.name}</div>
            <div style={{ fontSize: 10, color: muted, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'nowrap', overflow: 'hidden' }}>
              <span style={{ color: roleColors[trackingEmp.role], flexShrink: 0 }}>{trackingEmp.role}</span>
              <span style={{ flexShrink: 0 }}>·</span>
              {dayTrack.empOnline
                ? <><Wifi size={9} color={green} style={{ flexShrink: 0 }} /><span style={{ color: green, flexShrink: 0 }}>Online</span></>
                : <><WifiOff size={9} color={muted} style={{ flexShrink: 0 }} /><span style={{ color: muted, flexShrink: 0 }}>Offline</span></>
              }
            </div>
          </div>
          {!isMobile && (
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Route size={15} color={indigo} />
              <span style={{ fontSize: 13, fontWeight: 600, color: txt }}>Tracking</span>
            </div>
          )}
        </div>

        {/* ── Single date picker ── */}
        <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 14, padding: isSmall ? '10px 12px' : '12px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: isSmall ? 5 : 8, flexWrap: 'wrap' }}>
          <CalendarDays size={isSmall ? 13 : 15} color={indigo} />
          {!isSmall && <span style={{ fontSize: 13, color: muted, fontWeight: 500 }}>Sana:</span>}

          {/* Prev day */}
          <button
            onClick={() => { const d = addDays(selectedDate, -1); setSelectedDate(d); setMapKey(k => k + 1); setPointFilter(null); }}
            style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${border}`, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <ChevronLeft size={14} color={txt} />
          </button>

          <input
            type="date"
            value={selectedDate}
            max={TODAY}
            onChange={e => { setSelectedDate(e.target.value); setMapKey(k => k + 1); setPointFilter(null); }}
            style={{ ...InputStyle, width: isSmall ? 130 : 150, padding: isSmall ? '6px 8px' : '7px 10px', fontSize: isSmall ? 12 : 13 }}
          />

          {/* Next day */}
          <button
            onClick={() => { const d = addDays(selectedDate, 1); if (d <= TODAY) { setSelectedDate(d); setMapKey(k => k + 1); setPointFilter(null); } }}
            disabled={selectedDate >= TODAY}
            style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${border}`, background: 'transparent', cursor: selectedDate >= TODAY ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: selectedDate >= TODAY ? 0.35 : 1 }}
          >
            <ChevronRight size={14} color={txt} />
          </button>

          <button
            onClick={() => { setSelectedDate(TODAY); setMapKey(k => k + 1); setPointFilter(null); }}
            style={{ marginLeft: 'auto', padding: '6px 14px', borderRadius: 8, border: `1px solid ${border}`, background: 'transparent', color: muted, fontSize: 12, cursor: 'pointer' }}
          >
            Bugun
          </button>
        </div>

        {/* ── Summary stats (5 cards, no km) ── */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(5,1fr)', gap: isSmall ? 8 : 10, marginBottom: 16 }}>
          {[
            { icon: Circle,       label: 'Jami nuqtalar',             value: String(dayTrack.total),           color: '#94a3b8', filter: null },
            { icon: CheckCircle2, label: 'Borildi, zakaz olindi',     value: String(dayTrack.visited),         color: green,     filter: 'ordered' },
            { icon: PhoneCall,    label: 'Bormay, zakaz olindi',      value: String(dayTrack.remoteOrdered),   color: indigo,    filter: 'remote_ordered' },
            { icon: ShoppingCart, label: 'Borildi, zakaz olinmadi',   value: String(dayTrack.visitedNoOrder),  color: amber,     filter: 'visited' },
            { icon: XCircle,      label: 'Borilmadi, zakaz olinmadi', value: String(dayTrack.missed),          color: '#9ca3af', filter: 'missed' },
          ].map((s, idx) => {
            const isActive = pointFilter === s.filter;
            return (
              <div
                key={s.label}
                onClick={() => setPointFilter(isActive ? null : s.filter)}
                style={{
                  background: isActive ? `${s.color}18` : cardBg,
                  border: `1.5px solid ${isActive ? s.color : border}`,
                  borderRadius: 12, padding: isSmall ? '10px 12px' : '14px 16px',
                  gridColumn: isMobile && idx === 4 ? 'span 2' : undefined,
                  display: 'flex', flexDirection: isSmall ? 'row' : 'column',
                  alignItems: isSmall ? 'center' : 'flex-start', gap: isSmall ? 10 : 0,
                  cursor: 'pointer', transition: 'border-color .15s, background .15s',
                  position: 'relative',
                }}
              >
                <s.icon size={isSmall ? 16 : 15} color={s.color} style={{ flexShrink: 0, marginTop: isSmall ? 0 : undefined }} />
                <div>
                  <div style={{ fontSize: isSmall ? 20 : (isMobile ? 18 : 22), fontWeight: 700, color: isActive ? s.color : txt, marginTop: isSmall ? 0 : 6 }}>{s.value}</div>
                  <div style={{ fontSize: isSmall ? 9 : 10, color: isActive ? s.color : muted, marginTop: 2, lineHeight: 1.3 }}>{s.label}</div>
                </div>
                {isActive && (
                  <div style={{ position: 'absolute', top: 6, right: 8, width: 6, height: 6, borderRadius: '50%', background: s.color }} />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Day card ── */}
        <div style={{ background: cardBg, border: `1px solid ${indigo}55`, borderRadius: 14, overflow: 'hidden' }}>

          {/* Day header */}
          {isMobile ? (
            /* ── Mobile day header: stacked ── */
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Row 1: icon + date + route */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: `${indigo}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CalendarDays size={14} color={indigo} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: txt }}>{dayTrack.label}</div>
                  <div style={{ fontSize: 11, color: muted, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Navigation size={9} color={muted} />
                    <span>{dayTrack.startCity} → {dayTrack.endCity}</span>
                  </div>
                </div>
              </div>
              {/* Row 2: 4 stats in one row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
                {[
                  { v: dayTrack.visited,        c: green,     l: 'Zakaz olindi' },
                  { v: dayTrack.remoteOrdered,  c: indigo,    l: 'Bormay zakaz' },
                  { v: dayTrack.visitedNoOrder, c: amber,     l: "Zakaz yo'q" },
                  { v: dayTrack.missed,         c: '#9ca3af', l: 'Borilmadi' },
                ].map(s => (
                  <div key={s.l} style={{ textAlign: 'center', padding: '6px 4px', background: D ? 'rgba(255,255,255,0.03)' : '#f8f9fa', borderRadius: 8 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: s.c }}>{s.v}</div>
                    <div style={{ fontSize: 9, color: muted, marginTop: 1 }}>{s.l}</div>
                  </div>
                ))}
              </div>
              {/* Row 3: progress bar */}
              <div>
                <div style={{ height: 5, borderRadius: 3, background: D ? '#333' : '#e5e7eb', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 3, background: green, width: `${Math.round(((dayTrack.visited + dayTrack.visitedNoOrder) / dayTrack.total) * 100)}%` }} />
                </div>
                <div style={{ fontSize: 9, color: muted, marginTop: 3 }}>
                  {Math.round(((dayTrack.visited + dayTrack.visitedNoOrder) / dayTrack.total) * 100)}% bajarildi
                </div>
              </div>
            </div>
          ) : (
            /* ── Desktop day header: single row ── */
            <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${indigo}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CalendarDays size={15} color={indigo} />
              </div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: txt }}>{dayTrack.label}</div>
                <div style={{ fontSize: 11, color: muted, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Navigation size={9} color={muted} />
                  {dayTrack.startCity} → {dayTrack.endCity}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 14, marginRight: 4 }}>
                {[
                  { v: dayTrack.visited,        c: green,     l: 'Zakaz olindi' },
                  { v: dayTrack.remoteOrdered,  c: indigo,    l: 'Bormay zakaz' },
                  { v: dayTrack.visitedNoOrder, c: amber,     l: "Zakaz yo'q" },
                  { v: dayTrack.missed,         c: '#9ca3af', l: 'Borilmadi' },
                ].map(s => (
                  <div key={s.l} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: s.c }}>{s.v}</div>
                    <div style={{ fontSize: 9, color: muted }}>{s.l}</div>
                  </div>
                ))}
              </div>
              <div style={{ width: 72, flexShrink: 0 }}>
                <div style={{ height: 5, borderRadius: 3, background: D ? '#333' : '#e5e7eb', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 3, background: green, width: `${Math.round(((dayTrack.visited + dayTrack.visitedNoOrder) / dayTrack.total) * 100)}%` }} />
                </div>
                <div style={{ fontSize: 9, color: muted, marginTop: 2 }}>
                  {Math.round(((dayTrack.visited + dayTrack.visitedNoOrder) / dayTrack.total) * 100)}% bajarildi
                </div>
              </div>
            </div>
          )}

          {/* ── MAP + TIMING ── */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 300px', borderTop: `1px solid ${border}` }}>

            {/* MAP */}
            <div style={{ position: 'relative' }}>
              <div style={{ isolation: 'isolate' as const, height: isMobile ? 280 : 560 }}>
                <TrackingMap
                  key={`${dayTrack.date}-${mapKey}-${pointFilter ?? 'all'}-normal`}
                  points={filteredPoints}
                  startCity={dayTrack.startCity}
                  endCity={dayTrack.endCity}
                  D={D}
                  height={isMobile ? 280 : 560}
                  empLocation={{ lat: dayTrack.empLat, lng: dayTrack.empLng, online: dayTrack.empOnline, lastSeen: dayTrack.empLastSeen }}
                />
              </div>
              {/* Button is outside isolated context → always renders on top */}
              <button
                onClick={() => { setMapFullscreen(true); setMapKey(k => k + 1); }}
                title="To'liq ekran"
                style={{
                  position: 'absolute', top: 12, right: 12, zIndex: 2,
                  width: 38, height: 38, borderRadius: 10,
                  background: 'rgba(255,255,255,0.97)',
                  border: '1.5px solid rgba(0,0,0,0.14)',
                  boxShadow: '0 3px 12px rgba(0,0,0,0.22)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Maximize2 size={16} color="#374151" />
              </button>
            </div>

            {/* TIMING INFO PANEL */}
            <div style={{ borderLeft: isMobile ? 'none' : `1px solid ${border}`, borderTop: isMobile ? `1px solid ${border}` : 'none', padding: isMobile ? '16px' : '20px', display: 'flex', flexDirection: 'column', gap: 0, justifyContent: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
                Kun statistikasi
              </div>

              {[
                { icon: LogIn,      color: indigo,    label: "Ilovaga kirgan vaqt",    value: dayTrack.loginTime,      bg: `${indigo}12` },
                { icon: Flag,       color: green,     label: "Birinchi nuqtaga borgan", value: dayTrack.firstPointTime, bg: `${green}12` },
                { icon: MapPin,     color: amber,     label: "Oxirgi nuqtaga borgan",   value: dayTrack.lastPointTime,  bg: `${amber}12` },
                { icon: Hourglass,  color: '#8b5cf6', label: "Online bo'lgan vaqt",     value: dayTrack.onlineHours,    bg: 'rgba(139,92,246,0.10)' },
                { icon: Navigation, color: '#06b6d4', label: "Bosib o'tilgan yo'l",     value: `${dayTrack.km} km`,     bg: 'rgba(6,182,212,0.10)' },
              ].map((item, idx) => (
                <div key={idx} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 0',
                  borderBottom: idx < 4 ? `1px solid ${D ? 'rgba(255,255,255,0.05)' : '#f3f4f6'}` : 'none',
                }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <item.icon size={13} color={item.color} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: muted, fontWeight: 500 }}>{item.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: txt, marginTop: 1 }}>{item.value}</div>
                  </div>
                </div>
              ))}

              {/* Employee online status */}
              <div style={{ marginTop: 14, padding: '10px 12px', borderRadius: 10, background: D ? 'rgba(255,255,255,0.03)' : '#f8fafc', border: `1px solid ${border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: dayTrack.empOnline ? green : '#9ca3af',
                    boxShadow: dayTrack.empOnline ? `0 0 0 3px ${green}30` : 'none',
                    flexShrink: 0,
                  }} />
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: dayTrack.empOnline ? green : muted }}>
                      {dayTrack.empOnline ? 'Hozir online' : 'Offline'}
                    </div>
                    <div style={{ fontSize: 10, color: muted }}>{dayTrack.empLastSeen}</div>
                  </div>
                </div>
              </div>

              {/* Route summary */}
              <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 10, background: D ? 'rgba(255,255,255,0.03)' : '#f8fafc', border: `1px solid ${border}` }}>
                <div style={{ fontSize: 10, color: muted, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Marshrut</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: green, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: txt }}>{dayTrack.startCity}</span>
                  <div style={{ flex: 1, height: 1.5, background: D ? '#333' : '#e5e7eb', borderRadius: 1 }} />
                  <span style={{ fontSize: 10, color: muted }}>{dayTrack.visited + dayTrack.visitedNoOrder} nuqta</span>
                  <div style={{ flex: 1, height: 1.5, background: D ? '#333' : '#e5e7eb', borderRadius: 1 }} />
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: red, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: txt }}>{dayTrack.endCity}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── POINTS LIST ── */}
          <div style={{ padding: isMobile ? '12px' : '12px 18px', borderTop: `1px solid ${border}` }}>
            {(() => {
              return (
            <>
            {isMobile ? (
              /* Mobile: card list */
              <>
              {pointFilter && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, padding: '6px 10px', borderRadius: 8, background: D ? 'rgba(255,255,255,0.04)' : '#f8f9fa', border: `1px solid ${border}` }}>
                  <span style={{ fontSize: 11, color: muted, flex: 1 }}>
                    {filteredPoints.length} ta nuqta ko'rsatilmoqda
                  </span>
                  <button onClick={() => setPointFilter(null)} style={{ fontSize: 10, color: muted, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 3 }}>
                    <XCircle size={11} color={muted} /> Tozalash
                  </button>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {filteredPoints.map(p => (
                  <div key={p.idx} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                    borderRadius: 10, border: `1px solid ${D ? 'rgba(255,255,255,0.05)' : '#f0f0f0'}`,
                    background: p.status === 'missed' ? (D ? 'rgba(239,68,68,0.06)' : 'rgba(239,68,68,0.03)') : (D ? 'rgba(255,255,255,0.02)' : '#fafafa'),
                  }}>
                    <div style={{ fontSize: 10, color: muted, width: 20, textAlign: 'center', flexShrink: 0 }}>#{p.idx}</div>
                    <div style={{ flexShrink: 0 }}>
                      {p.status === 'ordered' ? <ShoppingCart size={14} color={green} />
                        : p.status === 'remote_ordered' ? <PhoneCall size={14} color={blue} />
                        : p.status === 'visited' ? <CheckCircle2 size={14} color={amber} />
                        : <XCircle size={14} color={D ? '#4b5563' : '#d1d5db'} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: p.status === 'missed' ? muted : txt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                      <div style={{ fontSize: 10, color: muted }}>{p.time ?? '—'}</div>
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 6, whiteSpace: 'nowrap', flexShrink: 0,
                      background: p.status === 'ordered' ? `${green}18` : p.status === 'remote_ordered' ? `${indigo}18` : p.status === 'visited' ? `${amber}18` : D ? 'rgba(255,255,255,0.05)' : '#f3f4f6',
                      color: p.status === 'ordered' ? green : p.status === 'remote_ordered' ? indigo : p.status === 'visited' ? amber : '#9ca3af',
                    }}>
                      {p.status === 'ordered' ? 'Zakaz olindi' : p.status === 'remote_ordered' ? 'Bormay zakaz' : p.status === 'visited' ? "Zakaz yo'q" : 'Borilmadi'}
                    </span>
                  </div>
                ))}
              </div>
              </>
            ) : (
              /* Desktop: table */
              <>
                {pointFilter && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, padding: '6px 10px', borderRadius: 8, background: D ? 'rgba(255,255,255,0.04)' : '#f8f9fa', border: `1px solid ${border}` }}>
                    <span style={{ fontSize: 11, color: muted, flex: 1 }}>
                      {filteredPoints.length} ta nuqta ko'rsatilmoqda
                    </span>
                    <button onClick={() => setPointFilter(null)} style={{ fontSize: 10, color: muted, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 3 }}>
                      <XCircle size={11} color={muted} /> Tozalash
                    </button>
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '28px 28px 1fr auto 80px 90px', gap: 10, padding: '6px 8px', borderRadius: 8, background: D ? 'rgba(255,255,255,0.03)' : '#f9fafb', marginBottom: 4 }}>
                  {['#', '', 'Nuqta', 'Status', 'Vaqt', 'Davomiylik'].map(h => (
                    <span key={h} style={{ fontSize: 9, fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</span>
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {filteredPoints.map(p => (
                    <div key={p.idx} style={{
                      display: 'grid', gridTemplateColumns: '28px 28px 1fr auto 80px 90px',
                      gap: 10, padding: '8px 8px', borderRadius: 8, alignItems: 'center',
                      background: p.status === 'missed' ? (D ? 'rgba(239,68,68,0.04)' : 'rgba(239,68,68,0.02)') : p.status === 'remote_ordered' ? (D ? 'rgba(59,130,246,0.04)' : 'rgba(59,130,246,0.03)') : 'transparent',
                    }}>
                      <div style={{ fontSize: 11, color: muted, textAlign: 'right' }}>#{p.idx}</div>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        {p.status === 'ordered' ? <ShoppingCart size={13} color={green} />
                          : p.status === 'remote_ordered' ? <PhoneCall size={13} color={blue} />
                          : p.status === 'visited' ? <CheckCircle2 size={13} color={amber} />
                          : <XCircle size={13} color={D ? '#4b5563' : '#d1d5db'} />}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: p.status === 'missed' ? 400 : 600, color: p.status === 'missed' ? muted : txt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                        <div style={{ fontSize: 10, color: muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.address}</div>
                      </div>
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 6, whiteSpace: 'nowrap',
                        background: p.status === 'ordered' ? `${green}18` : p.status === 'remote_ordered' ? `${indigo}18` : p.status === 'visited' ? `${amber}18` : D ? 'rgba(255,255,255,0.05)' : '#f3f4f6',
                        color: p.status === 'ordered' ? green : p.status === 'remote_ordered' ? indigo : p.status === 'visited' ? amber : '#9ca3af',
                      }}>
                        {p.status === 'ordered' ? '✓ Borildi, zakaz olindi' : p.status === 'remote_ordered' ? '📞 Bormay, zakaz olindi' : p.status === 'visited' ? "✓ Borildi, zakaz olinmadi" : '✗ Borilmadi, zakaz olinmadi'}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={10} color={muted} />
                        <span style={{ fontSize: 11, color: p.time ? txt : muted }}>{p.time ?? '—'}</span>
                      </div>
                      <div style={{ fontSize: 11, color: muted, textAlign: 'right' }}>{p.duration ? `${p.duration} daq` : '—'}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
            </>
            );
            })()}
          </div>
        </div>

        {/* ── Order History ── */}
        <DayHistoryPanel empId={trackingEmp.id} empName={trackingEmp.name} mode="agent" D={D} />

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
            <Users2 size={isSmall ? 15 : 17} color={indigo} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: isSmall ? 14 : 17, fontWeight: 700, color: txt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.sotrudnikiPageTitle || "Xodimlar ro'yxati"}</div>
            <div style={{ fontSize: 11, color: muted }}>{t.totalEmpLabel || 'Jami'}: {localEmps.length} {t.empUnit || 'xodim'}</div>
          </div>
        </div>
        <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: isMobile ? '8px 12px' : '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', background: indigo, color: '#fff', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
          <Plus size={14} />{!isMobile && ` ${t.addEmpBtn || "Xodim qo'shish"}`}
        </button>
      </div>

      {/* Org filter chips */}
      {selOrgs.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
          <span style={{ fontSize: 11, color: muted, alignSelf: 'center' }}>{t.filterLabel || 'Filtr'}:</span>
          {selOrgs.map(org => (
            <span key={org.id} style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '4px 10px', borderRadius: 8,
              background: D ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)',
              border: `1px solid ${D ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.2)'}`,
              fontSize: 12, fontWeight: 600, color: D ? '#a5b4fc' : '#4f46e5',
            }}>
              <span>{org.icon}</span> {org.shortName}
            </span>
          ))}
          <span style={{ fontSize: 11, color: muted, alignSelf: 'center', marginLeft: 2 }}>
            · {localEmps.length} {t.empUnit || 'xodim'}
          </span>
        </div>
      )}

      {/* Stats cards + Map panel side-by-side */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'stretch', marginBottom: 20 }}>

        {/* LEFT: 2×2 stat cards grid */}
        <div style={{ flex: 1, minWidth: 0, display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: isSmall ? 8 : 10 }}>
          {([
            { label: t.totalAgentsCard || 'Jami xodim', value: String(localEmps.length),                                    color: indigo, filter: 'all'      },
            { label: t.activeCard      || 'Faol',        value: String(localEmps.filter(e => e.status === 'active').length), color: green,  filter: 'active'   },
            { label: t.inactiveStatus  || 'Nofaol',      value: String(localEmps.filter(e => e.status !== 'active').length), color: red,    filter: 'inactive' },
            { label: t.navLiniya       || 'Liniya',       value: String(totalLiniya),                                         color: amber,  filter: 'liniya'   },
          ] as { label: string; value: string; color: string; filter: string }[]).map(s => {
            const sel = s.filter !== 'liniya' && s.filter === statusFilter;
            return (
              <div
                key={s.label}
                onClick={() => {
                  const next = s.filter === 'liniya' ? 'all' : s.filter as 'all' | 'active' | 'inactive';
                  setStatusFilter(next);
                  setPage(1);
                }}
                className={card}
                style={{
                  borderRadius: 12,
                  border: `2px solid ${sel ? s.color : border}`,
                  padding: isSmall ? '10px 12px' : '14px 16px',
                  cursor: 'pointer',
                  transition: 'border-color 0.18s, box-shadow 0.18s, transform 0.18s',
                  boxShadow: sel ? `0 0 0 3px ${s.color}20` : 'none',
                  transform: sel ? 'translateY(-1px)' : 'none',
                }}
              >
                <div style={{ fontSize: isSmall ? 18 : 22, fontWeight: 700, color: sel ? s.color : txt }}>{s.value}</div>
                <div style={{ fontSize: isSmall ? 10 : 11, color: sel ? s.color : muted, marginTop: 2, fontWeight: sel ? 600 : 400 }}>{s.label}</div>
                <div style={{ height: 3, borderRadius: 2, background: s.color, marginTop: isSmall ? 6 : 8, opacity: sel ? 1 : 0.45 }} />
              </div>
            );
          })}
        </div>

        {/* RIGHT: map panel — desktop only */}
        {!isMobile && mapCenterInfo && (
          <div
            className={card}
            style={{
              width: 'clamp(340px, 42%, 560px)',
              flexShrink: 0,
              borderRadius: 14,
              border: `1px solid ${border}`,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Map header */}
            <div style={{
              padding: '10px 13px 8px',
              borderBottom: `1px solid ${border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexShrink: 0,
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: txt }}>
                  {t.weeklyVisitsTitle || 'Xodimlar joylashuvi'}
                </div>
                <div style={{ fontSize: 10, color: indigo, marginTop: 1, fontWeight: 500 }}>
                  {weeklyPanelView === 'map' ? mapCenterInfo.label : (t.thisWeek || 'Joriy hafta')}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {weeklyPanelView === 'map' && (
                  <button
                    onClick={() => setWeeklyPanelView('chart')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '5px 11px', borderRadius: 20,
                      border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                      background: D ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.09)',
                      color: D ? '#a5b4fc' : '#4f46e5',
                    }}
                  >
                    <BarChart3 size={11} />
                    {t.visitsLabel || 'Vizitlar'}
                  </button>
                )}
                {weeklyPanelView === 'chart' && (
                  <button
                    onClick={() => setWeeklyPanelView('map')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '5px 11px', borderRadius: 20,
                      border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                      background: D ? 'rgba(255,255,255,0.07)' : '#f3f4f6',
                      color: D ? '#d1d5db' : '#6b7280',
                    }}
                  >
                    <MapPin size={11} />
                    {t.empMapBtn || 'Xarita'}
                  </button>
                )}
              </div>
            </div>
            {/* Map or Chart */}
            <div style={{ flex: 1, minHeight: 0 }}>
              {weeklyPanelView === 'map' && (
                <InlineEmployeeMap
                  employees={activeMapEmployees}
                  centerCoord={mapCenterInfo.center}
                  initialZoom={mapCenterInfo.zoom}
                  dark={D}
                  height={220}
                  t={t}
                  onExpand={setShowEmpMap ? () => setShowEmpMap(true) : undefined}
                />
              )}
              {weeklyPanelView === 'chart' && (
                <div style={{ width: '100%', height: '100%', minHeight: 180, padding: '8px 4px 4px' }}>
                  <MiniBarChart
                    data={activeWeekly}
                    labelKey="day"
                    series={[
                      { key: 'visits', name: t.visitsLabel || 'Vizitlar', color: '#6366f1' },
                      { key: 'orders', name: t.ordersLabel || 'Buyurtmalar', color: '#10b981' },
                    ]}
                    dark={D}
                    height={190}
                    showLabels
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={14} color={muted} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder={t.empSearchPlaceholder2 || "Ism, lavozim yoki shahar bo'yicha qidirish..."}
          style={{ width: '100%', boxSizing: 'border-box', background: inpBg, border: `1.5px solid ${border}`, borderRadius: 10, padding: '10px 12px 10px 36px', fontSize: 13, color: txt, outline: 'none' }}
        />
      </div>

      {/* Table header — desktop only */}
      {!isMobile && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 100px 160px 130px 110px 100px 140px', gap: 8, padding: '8px 12px', borderRadius: 8, background: D ? 'rgba(255,255,255,0.04)' : '#f3f4f6', marginBottom: 6 }}>
          {[t.colEmp||'Xodim', t.colRole||'Lavozim', t.navLiniya||'Liniya', t.colPhone||'Telefon', t.colCity||'Shahar', t.colToday||'Bugungi', t.colActions||'Amallar'].map(h => (
            <span key={h} style={{ fontSize: 10, fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</span>
          ))}
        </div>
      )}

      {/* Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {paginated.map(emp => {
          const todayTrack = generateDayTrack(emp.id, TODAY);
          if (isMobile) return (
            /* ── MOBILE CARD ── */
            <div key={emp.id} style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 9 }}>

              {/* Row 1: avatar + name — full width, tugmalar yo'q */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: 11, background: `${indigo}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: indigo }}>{emp.avatar}</span>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: txt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 5, background: `${roleColors[emp.role] || indigo}18`, color: roleColors[emp.role] || indigo, whiteSpace: 'nowrap' }}>{emp.role}</span>
                    <MapPin size={9} color={muted} style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 10, color: muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.city}</span>
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

              {/* Row 3: progress bar */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ height: 4, borderRadius: 2, background: D ? '#333' : '#e5e7eb', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: green, borderRadius: 2, width: `${Math.round(((todayTrack.visited + todayTrack.visitedNoOrder) / todayTrack.total) * 100)}%` }} />
                </div>
                <div style={{ fontSize: 10, color: muted }}>{todayTrack.visited + todayTrack.visitedNoOrder}/{todayTrack.total} · {todayTrack.visited} zakaz · bugungi</div>
              </div>

              {/* Row 4: action buttons — pastki qator, to'liq kenglik */}
              <div style={{ display: 'flex', alignItems: 'center', gap: isSmall ? 4 : 6, paddingTop: 4, borderTop: `1px solid ${D ? 'rgba(255,255,255,0.06)' : '#f3f4f6'}` }}>
                <button onClick={() => setHistoryEmp(emp)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1, justifyContent: 'center', height: isSmall ? 30 : 32, borderRadius: 8, border: `1px solid ${D ? 'rgba(255,255,255,0.10)' : '#e5e7eb'}`, background: 'transparent', cursor: 'pointer' }}>
                  <CalendarDays size={11} color={indigo} />
                  <span style={{ fontSize: isSmall ? 10 : 11, color: indigo, fontWeight: 600 }}>Tarix</span>
                </button>
                <button onClick={() => { setTrackingEmp(emp); setSelectedDate(TODAY); setMapKey(k => k + 1); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1, justifyContent: 'center', height: isSmall ? 30 : 32, borderRadius: 8, border: `1px solid ${D ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.2)'}`, background: D ? 'rgba(99,102,241,0.10)' : 'rgba(99,102,241,0.06)', cursor: 'pointer' }}>
                  <Route size={11} color={indigo} />
                  <span style={{ fontSize: isSmall ? 10 : 11, color: indigo, fontWeight: 600 }}>Track</span>
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
              style={{ display: 'grid', gridTemplateColumns: '2fr 100px 160px 130px 110px 100px 140px', gap: 8, padding: '11px 14px', borderRadius: 10, border: `1px solid ${border}`, alignItems: 'center', transition: 'all .12s' }}
              className={D ? 'hover:bg-white/5' : 'hover:bg-gray-50'}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = indigo + '60'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = border; }}>

              {/* Name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: `${indigo}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: indigo }}>{emp.avatar}</span>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: txt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.name}</div>
                  <div style={{ fontSize: 10, color: muted }}>
                    {(() => { const org = COMPANIES.find(c => c.id === emp.orgId); return org ? `${org.icon} ${org.shortName}` : '—'; })()}
                  </div>
                </div>
              </div>
              {/* Role */}
              <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: `${roleColors[emp.role] || indigo}18`, color: roleColors[emp.role] || indigo, whiteSpace: 'nowrap' }}>{emp.role}</span>
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
              {/* City */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <MapPin size={11} color={muted} />
                <span style={{ fontSize: 12, color: txt }}>{emp.city}</span>
              </div>
              {/* Today progress */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '5px 0' }}>
                <div style={{ height: 4, borderRadius: 2, background: D ? '#333' : '#e5e7eb', overflow: 'hidden', width: '100%' }}>
                  <div style={{ height: '100%', background: green, borderRadius: 2, width: `${Math.round(((todayTrack.visited + todayTrack.visitedNoOrder) / todayTrack.total) * 100)}%` }} />
                </div>
                <div style={{ fontSize: 9, color: muted, whiteSpace: 'nowrap' }}>{todayTrack.visited + todayTrack.visitedNoOrder}/{todayTrack.total} · {todayTrack.visited} zakaz</div>
              </div>
              {/* Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button onClick={() => setHistoryEmp(emp)}
                  style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '5px 7px', borderRadius: 7, border: `1px solid ${D ? 'rgba(255,255,255,0.12)' : '#e5e7eb'}`, background: 'transparent', color: muted, fontSize: 11, fontWeight: 500, cursor: 'pointer', transition: 'all .15s', whiteSpace: 'nowrap' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = indigo; (e.currentTarget as HTMLElement).style.color = indigo; (e.currentTarget as HTMLElement).style.background = `${indigo}10`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = D ? 'rgba(255,255,255,0.12)' : '#e5e7eb'; (e.currentTarget as HTMLElement).style.color = muted; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  title="Tarixni ko'rish">
                  <CalendarDays size={11} /><span>Tarix</span>
                </button>
                <button onClick={() => { setTrackingEmp(emp); setSelectedDate(TODAY); setMapKey(k => k + 1); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '5px 7px', borderRadius: 7, border: `1px solid ${D ? 'rgba(99,102,241,0.35)' : 'rgba(99,102,241,0.25)'}`, background: D ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.07)', color: indigo, fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all .15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = D ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.15)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = D ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.07)'; }}
                  title="Trackingni ko'rish">
                  <Route size={11} />
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