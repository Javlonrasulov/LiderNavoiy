import React, { useState, useEffect, useRef } from 'react';
import {
  AlertCircle, Activity, ChevronLeft,
  DollarSign, TrendingUp, X, ChevronDown,
} from 'lucide-react';
import { EmployeeMapModal } from '../components/EmployeeMapModal';
import { useTheme } from '../components/ThemeContext';
import { useNavigate } from 'react-router';
import { useAdminAuth, companyShowsTarozi } from '../components/AdminAuthContext';
import { useCompanies } from '../components/CompaniesContext';
import { useLang } from '../components/LangContext';

import { isGpsLiveOnline, isInServiceArea } from '../utils/gpsOnline';
import {
  AP, NAV_ITEMS_BASE, COMPANY_DATA, COMPANY_AGENTS,
  COMPANY_CATPIE, COMPANY_WEEKLY, ORG_CHART, ORG_CITIES,
  UZ_CENTER, catPie, weeklyData,
  fmt,
  allClients,
  type Tab, type AgentRow, type ChartRow, type ClientRow, type LangAdmin,
} from '../data/adminData';

import { AdminSidebar } from '../components/admin/AdminSidebar';
import { AdminNavbar } from '../components/admin/AdminNavbar';
import { AdminDashboardTab } from '../components/admin/tabs/AdminDashboardTab';
import { AdminClientsTab } from '../components/admin/tabs/AdminClientsTab';
import { AdminReportsTab } from '../components/admin/tabs/AdminReportsTab';
import { AdminPostavchikTab } from '../components/admin/tabs/AdminPostavchikTab';
import { AdminProductsTab } from '../components/AdminProductsTab';
import { AdminOmborTab }    from '../components/admin/tabs/AdminOmborTab';
import { AdminLiniyaTab } from '../components/admin/tabs/AdminLiniyaTab';
import { AdminXodimlarTab } from '../components/admin/tabs/AdminXodimlarTab';
import { AdminZatratiTab } from '../components/admin/tabs/AdminZatratiTab';
import { AdminTaroziTab } from '../components/admin/tabs/AdminTaroziTab';
import { AdminUnpreparedOrdersTab } from '../components/admin/tabs/AdminUnpreparedOrdersTab';
import { AdminProdajiTab } from '../components/admin/tabs/AdminProdajiTab';
import { AdminMessagesTab } from '../components/admin/tabs/AdminMessagesTab';
import { AdminSystemUsersTab } from '../components/admin/tabs/AdminSystemUsersTab';
import { MessageNotificationHost } from '../components/admin/MessageNotificationHost';
import { useMessagesUnreadCount } from '../hooks/useMessagesUnread';
import { api, connectTracking, type AdminDashboardData, type Distributor } from '../api/client';
import { clientIdHash } from '../utils/clientApi';
import { hasPageAccess } from '../utils/pagePermissions';
import type { EmployeeMarker } from '../components/EmployeeMapModal';

function initialsOf(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || 'A';
}

function detectEmpRole(position?: string | null): 'agent' | 'delivery' {
  const p = (position ?? '').toLowerCase();
  if (p.includes('delivery') || p.includes('yetkaz') || p.includes('kuryer') || p.includes('dostav') || p.includes('haydov')) {
    return 'delivery';
  }
  return 'agent';
}

function formatEmpLastSeen(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const mins = Math.floor((Date.now() - d.getTime()) / 60_000);
  if (mins < 1) return 'hozir';
  if (mins < 60) return `${mins} daqiqa oldin`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} soat oldin`;
  return d.toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function distributorToMarker(d: Distributor): EmployeeMarker | null {
  const lat = d.lastLatitude != null ? Number(d.lastLatitude) : NaN;
  const lng = d.lastLongitude != null ? Number(d.lastLongitude) : NaN;
  if (!isInServiceArea(lat, lng)) return null;
  const name = d.user?.fullName ?? d.user?.username ?? d.companyName ?? 'Agent';
  // Sticky DB isOnline ishlatilmaydi — faqat yangi GPS (180s)
  const fresh = isGpsLiveOnline(d.lastLocationAt);
  return {
    id: clientIdHash(d.id),
    name,
    avatar: initialsOf(name),
    role: detectEmpRole(d.position),
    online: fresh,
    lastSeen: formatEmpLastSeen(d.lastLocationAt),
    lat,
    lng,
    orgId: d.companyId ?? '',
    distributorId: d.id,
  };
}

export default function AdminPanel() {
  const { isDark, setIsDark } = useTheme();
  const navigate = useNavigate();
  const { isLoggedIn, selectedCompany, logout, clearCompany, adminUser } = useAdminAuth();
  const { companies } = useCompanies();
  const { lang: adminLang, setLang: setAdminLang } = useLang();

  const [tab, setTab] = useState<Tab>('dashboard');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'agent' | 'category' | 'terminal' | 'product' | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<AgentRow | null>(null);
  const [showBalances, setShowBalances] = useState(true);
  const [showEmpMap, setShowEmpMap] = useState(false);
  const [weeklyView, setWeeklyView] = useState<'map' | 'chart'>('map');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [salesPeriod, setSalesPeriod] = useState<'kun' | 'hafta' | 'oy'>('oy');
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const messagesUnread = useMessagesUnreadCount(isLoggedIn && !!selectedCompany);
  const [clientsForBell, setClientsForBell] = useState<ClientRow[]>([]);
  const [dashData, setDashData] = useState<AdminDashboardData | null>(null);
  const [mapDistributors, setMapDistributors] = useState<Distributor[]>([]);
  const [liveLocations, setLiveLocations] = useState<Record<string, {
    lat: number;
    lng: number;
    online: boolean;
    lastSeen: string;
    name?: string;
    at: number;
  }>>({});

  const companyBtnRef = useRef<HTMLButtonElement>(null);
  const langBtnRef = useRef<HTMLButtonElement>(null);
  const navbarWrapRef = useRef<HTMLDivElement>(null);
  const [navH, setNavH] = useState(65);

  // Dynamically measure actual navbar height so --nav-h stays accurate
  useEffect(() => {
    const el = navbarWrapRef.current;
    if (!el) return;
    const update = () => setNavH(el.offsetHeight);
    update();
    const obs = new ResizeObserver(update);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const [selectedCompanyIds, setSelectedCompanyIds] = useState<Set<string>>(() =>
    new Set([selectedCompany?.id ?? 'boran'])
  );
  const [viewOrg, setViewOrg] = useState<'all' | string>(selectedCompany?.id ?? 'all');
  const prevSelSizeRef = useRef(1);

  useEffect(() => {
    const prevSize = prevSelSizeRef.current;
    const newSize  = selectedCompanyIds.size;
    prevSelSizeRef.current = newSize;
    if (newSize === 1) {
      setViewOrg(Array.from(selectedCompanyIds)[0]);
    } else if (newSize > prevSize) {
      setViewOrg('all');
    } else {
      setViewOrg(prev => (prev !== 'all' && !selectedCompanyIds.has(prev)) ? 'all' : prev);
    }
  }, [selectedCompanyIds]);

  const t = AP[adminLang as LangAdmin];
  const userRole = adminUser?.role ?? 'admin';
  const userPerms = adminUser?.permissions ?? null;
  const canAccess = (tabId: string) => hasPageAccess(userRole, userPerms, tabId);

  const NAV_ITEMS = NAV_ITEMS_BASE
    .filter(n => !n.hideInSidebar && canAccess(n.id as string))
    .map(n => ({
      ...n,
      label: t[n.key] ?? n.key,
      children: n.children?.map(c => ({ ...c, label: t[c.key] ?? c.key })),
    }));

  useEffect(() => {
    if (!canAccess(tab)) {
      const first = NAV_ITEMS_BASE.find(n => !n.hideInSidebar && canAccess(n.id as string));
      if (first) setTab(first.id as Tab);
    }
  }, [tab, userRole, userPerms]);

  // dona → unpreparedOrders; kg / kg+dona → tarozi
  useEffect(() => {
    const selectedOrgs = companies.filter(c => selectedCompanyIds.has(c.id));
    const showTarozi = selectedOrgs.length > 0
      ? selectedOrgs.some(c => companyShowsTarozi(c.productType))
      : companyShowsTarozi(selectedCompany?.productType);
    if (tab === 'tarozi' && !showTarozi) setTab('unpreparedOrders');
    if (tab === 'unpreparedOrders' && showTarozi) setTab('tarozi');
  }, [companies, selectedCompanyIds, selectedCompany?.productType, tab]);

  useEffect(() => {
    if (!isLoggedIn) { navigate('/admin/login'); return; }
    if (!localStorage.getItem('api_access_token')) {
      logout();
      navigate('/admin/login');
      return;
    }
    if (!selectedCompany) { navigate('/admin/select'); return; }
  }, [isLoggedIn, selectedCompany]);

  useEffect(() => { setWeeklyView('map'); }, [viewOrg]);

  useEffect(() => {
    if (!isLoggedIn || !localStorage.getItem('api_access_token')) {
      setDashData(null);
      setMapDistributors([]);
      return;
    }
    const ids = viewOrg === 'all' ? Array.from(selectedCompanyIds) : [viewOrg];
    let cancelled = false;

    const load = () => {
      api.getAdminDashboard(ids)
        .then(data => { if (!cancelled) setDashData(data); })
        .catch(() => { /* KPI fail bo'lsa ham xarita ishlasin */ });

      // Xarita uchun alohida — barcha GPS'li agent/dostavchilar
      const distPromises = ids.length > 0
        ? ids.map(id => api.getDistributors(id).catch(() => [] as Distributor[]))
        : [api.getDistributors().catch(() => [] as Distributor[])];

      Promise.all(distPromises).then(lists => {
        if (cancelled) return;
        const byId = new Map<string, Distributor>();
        for (const list of lists) {
          for (const d of list) byId.set(d.id, d);
        }
        setMapDistributors([...byId.values()]);
      });
    };

    load();
    const interval = window.setInterval(load, 10_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isLoggedIn, selectedCompanyIds, viewOrg]);

  // Jonli GPS WebSocket — agent ilovadan yuborgan joylashuv
  useEffect(() => {
    if (!isLoggedIn || !localStorage.getItem('api_access_token')) return;
    let socket: { disconnect: () => void } | null = null;
    let cancelled = false;

    connectTracking({
      onLocation: (data) => {
        if (!data.distributorId || data.latitude == null || data.longitude == null) return;
        setLiveLocations(prev => ({
          ...prev,
          [data.distributorId]: {
            lat: data.latitude,
            lng: data.longitude,
            online: true,
            lastSeen: 'hozir',
            at: Date.now(),
          },
        }));
      },
      // Online faqat location:live dan — socket ulanishi yetarli emas
      onOffline: (d) => {
        if (!d.distributorId) return;
        setLiveLocations(prev => {
          const cur = prev[d.distributorId!];
          if (!cur) return prev;
          return {
            ...prev,
            [d.distributorId!]: { ...cur, online: false, lastSeen: 'hozirgina', at: Date.now() },
          };
        });
      },
    }).then(s => {
      if (cancelled) {
        s?.disconnect();
        return;
      }
      socket = s;
    });

    // Eski WS nuqtalarini offline qilish (180s)
    const expire = window.setInterval(() => {
      const cutoff = Date.now() - 180_000;
      setLiveLocations(prev => {
        let changed = false;
        const next = { ...prev };
        for (const [id, live] of Object.entries(next)) {
          if (live.online && live.at < cutoff) {
            next[id] = { ...live, online: false, lastSeen: '1+ daqiqa oldin' };
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 15_000);
    return () => {
      cancelled = true;
      socket?.disconnect();
      clearInterval(expire);
    };
  }, [isLoggedIn]);

  if (!isLoggedIn || !selectedCompany) return null;

  // ─── Aggregated stats ───
  const selCmpData = companies.filter(c => selectedCompanyIds.has(c.id)).map(c => COMPANY_DATA[c.id]);
  const totalSales    = selCmpData.reduce((s, d) => s + (d?.sales    || 0), 0);
  const totalPayments = selCmpData.reduce((s, d) => s + (d?.payments || 0), 0);
  const totalDebt     = selCmpData.reduce((s, d) => s + (d?.debt     || 0), 0);
  const totalPlan     = selCmpData.reduce((s, d) => s + (d?.plan     || 0), 0);
  const planPct       = totalPlan > 0 ? Math.round((totalSales / totalPlan) * 100) : 0;

  const isAllView = viewOrg === 'all';
  const orgIds = Array.from(selectedCompanyIds);

  const activeKpi = dashData
    ? {
        sales: dashData.kpi.sales,
        payments: dashData.kpi.payments,
        debt: dashData.kpi.debt,
        plan: dashData.kpi.plan,
        planPct: dashData.kpi.planPct,
        salesTrend: dashData.kpi.salesTrend,
        paymentsTrend: dashData.kpi.paymentsTrend,
        debtTrend: dashData.kpi.debtTrend,
        planTrend: dashData.kpi.planTrend,
      }
    : isAllView
    ? { sales: totalSales, payments: totalPayments, debt: totalDebt, plan: totalPlan, planPct }
    : (() => {
        const d = COMPANY_DATA[viewOrg];
        const pp = d ? Math.round((d.sales / d.plan) * 100) : 0;
        return { sales: d?.sales||0, payments: d?.payments||0, debt: d?.debt||0, plan: d?.plan||0, planPct: pp };
      })();

  const activeAgents: AgentRow[] = dashData
    ? dashData.topAgents.map(a => ({
        id: clientIdHash(a.distributorId),
        name: a.name,
        avatar: a.avatar,
        clients: 0,
        visits: 0,
        sales: a.sales,
        payments: 0,
        debt: 0,
        plan: a.plan,
        status: a.status,
        orgId: a.orgId,
        distributorId: a.distributorId,
      }))
    : isAllView
    ? orgIds.flatMap(id => COMPANY_AGENTS[id] || [])
    : COMPANY_AGENTS[viewOrg] || [];

  const activeCatPie = dashData
    ? dashData.clientCategories
    : isAllView
    ? (() => {
        const totalC = orgIds.reduce((s, id) => s + (COMPANY_DATA[id]?.clients || 0), 0);
        return catPie.map((_, i) => ({
          ...catPie[i],
          value: Math.round(orgIds.reduce((s, id) => s + (COMPANY_CATPIE[id]?.[i]?.value || 0) * (COMPANY_DATA[id]?.clients || 0), 0) / (totalC || 1)),
        }));
      })()
    : COMPANY_CATPIE[viewOrg] || catPie;

  const activeWeekly = isAllView
    ? weeklyData.map((_, i) => ({
        day: weeklyData[i].day,
        visits: orgIds.reduce((s, id) => s + (COMPANY_WEEKLY[id]?.[i]?.visits || 0), 0),
        orders: orgIds.reduce((s, id) => s + (COMPANY_WEEKLY[id]?.[i]?.orders || 0), 0),
      }))
    : COMPANY_WEEKLY[viewOrg] || weeklyData;

  const buildOrgChart = (period: 'month' | 'week' | 'day', ids: string[]): ChartRow[] => {
    const ref = ORG_CHART[ids[0]]?.[period] ?? [];
    return ref.map((row, i) => ({
      month: row.month,
      sales:    ids.reduce((acc, id) => acc + (ORG_CHART[id]?.[period]?.[i]?.sales    ?? 0), 0),
      payments: ids.reduce((acc, id) => acc + (ORG_CHART[id]?.[period]?.[i]?.payments ?? 0), 0),
    }));
  };

  const activeIds = isAllView ? orgIds : [viewOrg];
  const aggSalesChart     = dashData?.salesChart?.month ?? buildOrgChart('month', activeIds);
  const aggSalesChartWeek = dashData?.salesChart?.week  ?? buildOrgChart('week',  activeIds);
  const aggSalesChartDay  = dashData?.salesChart?.day   ?? buildOrgChart('day',   activeIds);

  const activeMapEmployees: EmployeeMarker[] = (() => {
    const byDist = new Map<string, EmployeeMarker>();

    // 1) Distributors API — asosiy manba (online + offline)
    for (const d of mapDistributors) {
      const m = distributorToMarker(d);
      if (m?.distributorId) byDist.set(m.distributorId, m);
    }

    // 2) Dashboard employeeLocations — qo'shimcha / yangiroq
    if (dashData?.employeeLocations) {
      for (const e of dashData.employeeLocations) {
        if (!isInServiceArea(e.lat, e.lng)) continue;
        byDist.set(e.distributorId, {
          id: clientIdHash(e.distributorId),
          name: e.name,
          avatar: e.avatar,
          role: e.role,
          online: e.online,
          lastSeen: e.lastSeen,
          lat: e.lat,
          lng: e.lng,
          orgId: e.orgId,
          distributorId: e.distributorId,
        });
      }
    }

    // 3) WebSocket jonli yangilanish
    const now = Date.now();
    for (const [distributorId, live] of Object.entries(liveLocations)) {
      const existing = byDist.get(distributorId);
      const hasCoords = isInServiceArea(live.lat, live.lng);
      const liveOnline = live.online && (now - live.at) < 180_000;

      if (existing) {
        byDist.set(distributorId, {
          ...existing,
          ...(hasCoords ? { lat: live.lat, lng: live.lng } : {}),
          online: liveOnline,
          lastSeen: liveOnline ? (live.lastSeen || existing.lastSeen) : existing.lastSeen,
        });
        continue;
      }

      if (hasCoords) {
        byDist.set(distributorId, {
          id: clientIdHash(distributorId),
          name: live.name || 'Agent',
          avatar: initialsOf(live.name || 'A'),
          role: 'agent',
          online: liveOnline,
          lastSeen: live.lastSeen || 'hozir',
          lat: live.lat,
          lng: live.lng,
          distributorId,
        });
      }
    }

    return [...byDist.values()].filter(e => isInServiceArea(e.lat, e.lng));
  })();

  const mapCenterInfo = (() => {
    const fallback =
      (!isAllView && ORG_CITIES[viewOrg])
        ? ORG_CITIES[viewOrg]
        : { center: UZ_CENTER as [number, number], label: "O'zbekiston", zoom: 6 };

    const inArea = activeMapEmployees.filter(e => isInServiceArea(e.lat, e.lng));
    if (inArea.length === 0) return fallback;

    const lat = inArea.reduce((s, e) => s + e.lat, 0) / inArea.length;
    const lng = inArea.reduce((s, e) => s + e.lng, 0) / inArea.length;
    if (!isInServiceArea(lat, lng)) return fallback;

    const org = !isAllView ? companies.find(c => c.id === viewOrg) : null;
    return {
      center: [lat, lng] as [number, number],
      label: org ? org.shortName : `${inArea.length} xodim`,
      zoom: inArea.length === 1 ? 14 : 12,
    };
  })();

  // Theme classes
  const D = isDark;
  const bg = D ? 'bg-[#0a0a0a]' : 'bg-gray-50';
  const sidebar = D ? 'bg-[#111111] border-gray-800' : 'bg-white border-gray-200';
  const card = D ? 'bg-[#161616] border-gray-800' : 'bg-white border-gray-200';
  const cardHover = D ? 'hover:bg-[#1c1c1c]' : 'hover:bg-gray-50';
  const text = D ? 'text-white' : 'text-gray-900';
  const sub = D ? 'text-gray-400' : 'text-gray-500';
  const divider = D ? 'border-gray-800' : 'border-gray-100';
  const input = D ? 'bg-[#1e1e1e] border-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400';

  const openModal = (type: typeof modalType) => { setModalType(type); setShowModal(true); };

  // ── AGENT DETAIL VIEW ──
  if (selectedAgent) {
    const a = selectedAgent;
    const pct = Math.round((a.sales / a.plan) * 100);
    return (
      <div className={`min-h-screen ${bg} ${text}`}>
        <div className={`sticky top-0 z-10 border-b ${D ? 'bg-[#0a0a0a]/95 border-gray-800' : 'bg-gray-50/95 border-gray-200'} backdrop-blur-md`}>
          <div className="px-6 py-4 flex items-center gap-4">
            <button onClick={() => setSelectedAgent(null)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${D ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'} transition-colors`}>
              <ChevronLeft size={18} />
            </button>
            <div>
              <h1 className="font-bold text-lg">{a.name}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <p className={`text-sm ${sub}`}>{t.agentProfile}</p>
                {a.orgId && (() => { const org = companies.find(c => c.id === a.orgId); return org ? (
                  <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-lg ${D ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                    {org.icon} {org.shortName}
                  </span>
                ) : null; })()}
              </div>
            </div>
            <span className={`ml-auto px-3 py-1 rounded-full text-xs font-medium ${a.status === 'active' ? 'bg-green-500/15 text-green-400' : 'bg-gray-500/15 text-gray-400'}`}>
              {a.status === 'active' ? t.activeLabel : t.inactiveLabel}
            </span>
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { l: t.sales, v: fmt(a.sales), c: 'text-indigo-400', icon: TrendingUp },
              { l: t.payments, v: fmt(a.payments), c: 'text-emerald-400', icon: DollarSign },
              { l: t.debt, v: fmt(a.debt), c: 'text-rose-400', icon: AlertCircle },
              { l: t.plan, v: `${pct}%`, c: pct >= 80 ? 'text-green-400' : 'text-orange-400', icon: Activity },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className={`rounded-2xl border ${card} p-5`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${D ? 'bg-gray-800' : 'bg-gray-50'}`}>
                    <Icon size={17} className={s.c} />
                  </div>
                  <p className={`text-2xl font-bold ${s.c}`}>{s.v}</p>
                  <p className={`text-sm ${sub} mt-1`}>{s.l}</p>
                </div>
              );
            })}
          </div>
          <div className={`rounded-2xl border ${card} p-5`}>
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold">{t.plan}</p>
              <span className={`text-sm font-bold ${pct >= 80 ? 'text-green-400' : pct >= 50 ? 'text-orange-400' : 'text-red-400'}`}>{pct}%</span>
            </div>
            <div className={`h-2.5 rounded-full ${D ? 'bg-gray-800' : 'bg-gray-100'}`}>
              <div className={`h-2.5 rounded-full ${pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-orange-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
            <div className="flex justify-between mt-2 text-xs">
              <span className={sub}>{fmt(a.sales)}</span>
              <span className={sub}>{fmt(a.plan)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex min-h-screen overflow-x-hidden ${bg} ${text}`}
      style={{
        '--sb-w': sidebarCollapsed ? '64px' : '240px',
        '--nav-h': `${navH}px`,
      } as React.CSSProperties}
    >
      <style>{`${D ? `
        .show-sb::-webkit-scrollbar-track{background:#1f2937 !important}
        .show-sb::-webkit-scrollbar-thumb{background:#4b5563 !important}
        .show-sb::-webkit-scrollbar-thumb:hover{background:#6b7280 !important}
        .show-sb{scrollbar-color:#4b5563 #1f2937 !important}
      ` : ''}`}</style>

      {/* Sidebar */}
      <AdminSidebar
        D={D} sidebar={sidebar} divider={divider} sub={sub} text={text}
        tab={tab} setTab={setTab}
        sidebarCollapsed={sidebarCollapsed} setSidebarCollapsed={setSidebarCollapsed}
        sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}
        showBalances={showBalances} setShowBalances={setShowBalances}
        t={t} selectedCompany={selectedCompany}
        clearCompany={clearCompany} navigate={navigate} logout={logout}
        setIsDark={setIsDark} messagesUnread={messagesUnread} navItems={NAV_ITEMS}
      />

      {/* Main content */}
      <div className={`flex-1 min-w-0 flex flex-col min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'md:ml-16' : 'md:ml-60'}`}>

        {/* Navbar */}
        <div ref={navbarWrapRef}>
        <AdminNavbar
          D={D} sub={sub} text={text}
          tab={tab} navItems={NAV_ITEMS} t={t}
          selectedCompanyIds={selectedCompanyIds}
          setSelectedCompanyIds={setSelectedCompanyIds}
          selectedCompany={selectedCompany}
          showBalances={showBalances} setShowBalances={setShowBalances}
          adminLang={adminLang as LangAdmin} setAdminLang={setAdminLang as (l: LangAdmin) => void}
          setSidebarOpen={setSidebarOpen}
          headerCollapsed={headerCollapsed} setHeaderCollapsed={setHeaderCollapsed}
          isDark={D} setIsDark={setIsDark}
          showCompanyDropdown={showCompanyDropdown} setShowCompanyDropdown={setShowCompanyDropdown}
          showLangMenu={showLangMenu} setShowLangMenu={setShowLangMenu}
          companyBtnRef={companyBtnRef} langBtnRef={langBtnRef}
          setTab={setTab}
          existingClients={clientsForBell}
        />
        </div>

        {/* Org view tabs */}
        {selectedCompanyIds.size > 1 && (
          <div className={`sticky ${headerCollapsed ? 'top-8' : 'top-[65px]'} transition-all duration-300 z-[5] border-b ${D ? 'bg-[#0a0a0a] border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
            <div className="px-2 md:px-5 lg:px-8 py-1.5 md:py-2.5 flex flex-wrap items-center gap-1 md:gap-2">
              <button
                onClick={() => setViewOrg('all')}
                className={`flex items-center gap-0.5 md:gap-1.5 px-1.5 md:px-3 py-0.5 md:py-1.5 rounded-md md:rounded-xl text-[9px] md:text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                  viewOrg === 'all'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30'
                    : D ? `${sub} bg-gray-800 hover:bg-gray-700` : `text-gray-600 bg-gray-100 hover:bg-gray-200`
                }`}
              >
                <span className="hidden sm:inline">🌐</span> Umumiy ({selectedCompanyIds.size})
              </button>
              {companies.filter(c => selectedCompanyIds.has(c.id)).map(c => {
                const isActive = viewOrg === c.id;
                return (
                  <div key={c.id}
                    className={`flex items-center rounded-md md:rounded-xl text-[9px] md:text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 overflow-hidden ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30'
                        : D ? `${sub} bg-gray-800` : `text-gray-600 bg-gray-100`
                    }`}
                  >
                    <button onClick={() => setViewOrg(c.id)} className="flex items-center gap-0.5 md:gap-1.5 px-1.5 md:px-3 py-0.5 md:py-1.5">
                      <span className="text-[10px] md:text-sm">{c.icon}</span> {c.shortName}
                    </button>
                    <button
                      onClick={() => setSelectedCompanyIds(prev => {
                        if (prev.size <= 1) return prev;
                        const next = new Set(prev);
                        next.delete(c.id);
                        return next;
                      })}
                      className="pr-1 md:pr-2 pl-0.5 py-0.5 md:py-1.5 transition-opacity hover:opacity-70 flex-shrink-0"
                    >
                      <X size={9} className="md:hidden" strokeWidth={2.5} />
                      <X size={11} className="hidden md:block" strokeWidth={2.5} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* PAGE CONTENT */}
        <main className={`flex-1 transition-all duration-300 ${(tab === 'tarozi' || tab === 'ombor') ? '' : `px-5 md:px-8 ${selectedCompanyIds.size > 1 ? 'pt-11 pb-6 md:py-6' : 'py-6'}`}`}>

          {tab === 'dashboard' && (
            <AdminDashboardTab
              D={D} card={card} divider={divider} cardHover={cardHover} sub={sub} t={t}
              showBalances={showBalances} activeKpi={activeKpi}
              salesPeriod={salesPeriod} setSalesPeriod={setSalesPeriod}
              aggSalesChart={aggSalesChart} aggSalesChartWeek={aggSalesChartWeek} aggSalesChartDay={aggSalesChartDay}
              activeCatPie={activeCatPie} weeklyView={weeklyView} setWeeklyView={setWeeklyView}
              activeWeekly={activeWeekly} activeMapEmployees={activeMapEmployees} mapCenterInfo={mapCenterInfo}
              activeAgents={activeAgents} selectedCompanyIds={selectedCompanyIds}
              setShowEmpMap={setShowEmpMap} setTab={setTab} setSelectedAgent={setSelectedAgent}
            />
          )}

          {tab === 'liniya' && (
            <AdminLiniyaTab D={D} card={card} divider={divider} sub={sub} t={t} />
          )}

          {tab === 'xodimlar' && (
            <AdminXodimlarTab
              D={D} card={card} divider={divider} cardHover={cardHover} sub={sub} t={t}
              activeAgents={activeAgents} selectedCompanyIds={selectedCompanyIds}
              showBalances={showBalances} openModal={openModal} setSelectedAgent={setSelectedAgent}
              activeMapEmployees={activeMapEmployees}
              mapCenterInfo={mapCenterInfo}
              setShowEmpMap={setShowEmpMap}
              activeWeekly={activeWeekly}
            />
          )}

          {tab === 'clients' && (
            <AdminClientsTab
              D={D} card={card} divider={divider} text={text} sub={sub} t={t}
              showBalances={showBalances}
              selectedCompanyIds={selectedCompanyIds}
              onClientsChange={setClientsForBell}
            />
          )}

          {tab === 'products' && (
            <AdminProductsTab
              D={D} card={card} divider={divider} cardHover={cardHover}
              text={text} sub={sub} input={input} t={t}
              viewOrg={viewOrg} activeIds={activeIds}
            />
          )}

          {tab === 'reports' && (
            <AdminReportsTab
              D={D} card={card} divider={divider} sub={sub} t={t}
              showBalances={showBalances}
              totalSales={totalSales} totalPayments={totalPayments}
              totalDebt={totalDebt} planPct={planPct}
            />
          )}

          {tab === 'postavchik' && (
            <AdminPostavchikTab
              D={D} card={card} divider={divider} cardHover={cardHover}
              sub={sub} text={text} input={input} t={t}
            />
          )}

          {tab === 'zatrati' && (
            <AdminZatratiTab D={D} card={card} divider={divider} sub={sub} t={t} showBalances={showBalances}
              selectedCompanyIds={selectedCompanyIds} viewOrg={viewOrg} />
          )}

          {tab === 'tarozi' && (
            <AdminTaroziTab D={D} card={card} divider={divider} sub={sub} t={t} selectedCompanyIds={selectedCompanyIds} />
          )}

          {tab === 'unpreparedOrders' && (
            <AdminUnpreparedOrdersTab D={D} card={card} sub={sub} t={t} />
          )}

          {tab === 'prodaji' && (
            <AdminProdajiTab D={D} sub={sub} t={t} selectedCompanyIds={selectedCompanyIds} />
          )}

          {tab === 'ombor' && (
            <AdminOmborTab
              D={D} card={card} divider={divider} cardHover={cardHover}
              text={text} sub={sub} input={input} t={t}
              viewOrg={viewOrg} activeIds={activeIds}
            />
          )}

          {tab === 'messages' && <AdminMessagesTab />}

          {tab === 'systemUsers' && (
            <AdminSystemUsersTab D={D} card={card} sub={sub} t={t} />
          )}

        </main>
      </div>

      {/* ADD/EDIT MODAL */}
      {showModal && modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className={`relative w-full max-w-md rounded-3xl ${D ? 'bg-[#161616]' : 'bg-white'} p-6 shadow-2xl`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-xl font-bold ${text}`}>
                {modalType === 'agent' ? t.newAgent :
                 modalType === 'category' ? t.newCategory :
                 modalType === 'terminal' ? t.newTerminal : t.newProduct}
              </h3>
              <button onClick={() => setShowModal(false)}
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${D ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'} transition-colors`}>
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3">
              {modalType === 'agent' && <>
                <input placeholder={t.nameSurname} className={`w-full px-4 py-3.5 rounded-2xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 ${input}`} />
                <input placeholder={t.phone} className={`w-full px-4 py-3.5 rounded-2xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 ${input}`} />
                <input placeholder={t.monthlyPlan} className={`w-full px-4 py-3.5 rounded-2xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 ${input}`} />
                <input placeholder={t.loginLabel} className={`w-full px-4 py-3.5 rounded-2xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 ${input}`} />
                <input type="password" placeholder={t.passwordLabel} className={`w-full px-4 py-3.5 rounded-2xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 ${input}`} />
              </>}
              {modalType === 'category' && <>
                <input placeholder={t.catName} className={`w-full px-4 py-3.5 rounded-2xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 ${input}`} />
                <input placeholder={t.catEmoji} className={`w-full px-4 py-3.5 rounded-2xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 ${input}`} />
              </>}
              {modalType === 'terminal' && <>
                <input placeholder={t.termName} className={`w-full px-4 py-3.5 rounded-2xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 ${input}`} />
                <input placeholder={t.bankName} className={`w-full px-4 py-3.5 rounded-2xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 ${input}`} />
                <select className={`w-full px-4 py-3.5 rounded-2xl border text-sm outline-none ${input}`}>
                  <option>{t.activeStatus}</option>
                  <option>{t.inactiveStatus}</option>
                </select>
              </>}
              {modalType === 'product' && <>
                <input placeholder={t.prodName} className={`w-full px-4 py-3.5 rounded-2xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 ${input}`} />
                <input placeholder={t.priceLabel} className={`w-full px-4 py-3.5 rounded-2xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 ${input}`} />
                <input placeholder={t.initialStock} className={`w-full px-4 py-3.5 rounded-2xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 ${input}`} />
              </>}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)}
                className={`flex-1 py-3.5 rounded-2xl text-sm font-semibold ${D ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'} transition-colors`}>
                {t.cancel}
              </button>
              <button onClick={() => setShowModal(false)}
                className={`flex-1 py-3.5 rounded-2xl text-sm font-semibold ${D ? 'bg-white text-black hover:bg-gray-100' : 'bg-gray-900 text-white hover:bg-gray-800'} transition-colors`}>
                {t.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Employee map modal */}
      <EmployeeMapModal
        open={showEmpMap}
        onClose={() => setShowEmpMap(false)}
        dark={D}
        employees={activeMapEmployees}
        centerCoord={mapCenterInfo.center}
        initialZoom={mapCenterInfo.zoom}
        cityLabel={mapCenterInfo.label}
        t={t}
      />

      {isLoggedIn && selectedCompany && (
        <MessageNotificationHost onGoToMessages={() => setTab('messages')} />
      )}
    </div>
  );
}