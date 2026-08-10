import { useState, useRef, useEffect, useCallback, useMemo, type Dispatch, type SetStateAction, type MouseEvent as ReactMouseEvent } from 'react';
import * as XLSX from 'xlsx';
import { Check, ChevronDown, ChevronLeft, ChevronRight, Download, Edit2, Filter, ImageIcon, MapPin, Maximize2, Minimize2, Plus, Search, X, BarChart3, ArrowRightLeft, Trash2, RotateCcw, AlertTriangle, Upload, ShoppingCart } from 'lucide-react';
import { fmtFull, type ClientRow } from '../../../data/adminData';
import { api } from '../../../api/client';
import {
  apiClientToRow,
  rowToUpdatePayload,
  formToCreatePayload,
  appCredentialsPayload,
  distributorsToAgents,
  agentNameToId,
  displayClientCode,
  formatClientContact,
  textMatchesSearch,
} from '../../../utils/clientApi';
import AddClient from '../../AddClient';
import { ClientStatsPanel } from '../ClientStatsPanel';
import { ClientMapModal, ClientGpsWarningModal, clientHasGps } from '../ClientMapModal';
import { TransferClientsModal } from '../TransferClientsModal';
import { ClientExcelImportModal } from '../ClientExcelImportModal';
import { formatDisplayDate } from '../../../utils/dateFormat';
import { resolveProductImageUrl } from '../../../utils/productImageUrl';

function hasApiToken(): boolean {
  return !!localStorage.getItem('api_access_token');
}

const TODAY = '2026-03-08';
const INACTIVE_CUTOFF = '2026-03-01';
const PER_PAGE = 20;
const NO_AGENT_KEY = '__none__';

type MarkColor = 'green' | 'yellow' | 'red';

function resolveClientMark(c: { markColor?: string | null }): MarkColor {
  const m = c.markColor?.trim().toLowerCase();
  return m === 'yellow' || m === 'red' ? m : 'green';
}

function fmtSalesNum(n: number, digits = 2): string {
  if (!Number.isFinite(n) || n === 0) return digits > 0 ? '0' : '0';
  return n.toLocaleString('ru-RU', {
    minimumFractionDigits: digits > 0 ? 0 : 0,
    maximumFractionDigits: digits,
  });
}

function uniqueField(clients: ClientRow[], pick: (c: ClientRow) => string) {
  return [...new Set(clients.map(pick).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

interface Props {
  D: boolean;
  card: string;
  divider: string;
  text: string;
  sub: string;
  t: Record<string, string>;
  showBalances: boolean;
  selectedCompanyIds: Set<string>;
  onClientsChange?: (clients: ClientRow[]) => void;
}

export function AdminClientsTab({ D, card, divider, text, sub, t, showBalances, selectedCompanyIds, onClientsChange }: Props) {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [agents, setAgents] = useState<{ id: string; name: string; lineCode: string }[]>([]);
  const [lines, setLines] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [backendReady, setBackendReady] = useState(hasApiToken());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [clientPage, setClientPage] = useState(1);
  const [showClientFilter, setShowClientFilter] = useState(false);
  const [clientCatFilter, setClientCatFilter] = useState<Set<string>>(new Set());
  const [clientMarkFilter, setClientMarkFilter] = useState<Set<MarkColor>>(new Set());
  const [clientAgentFilter, setClientAgentFilter] = useState<Set<string>>(new Set());
  const [clientLineFilter, setClientLineFilter] = useState<Set<string>>(new Set());
  const [clientTerritoryFilter, setClientTerritoryFilter] = useState<Set<string>>(new Set());
  const [clientClsFilter, setClientClsFilter] = useState<Set<string>>(new Set());
  const [clientPriceCatFilter, setClientPriceCatFilter] = useState<Set<string>>(new Set());
  const [clientGpsFilter, setClientGpsFilter] = useState<'all' | 'with_gps' | 'no_gps'>('all');
  const [clientStatusFilter, setClientStatusFilter] = useState<'all' | 'debtors' | 'inactive' | 'surplus'>('all');
  /** Top mijozlar: nomi A→Z / Z→A */
  const [sortTop, setSortTop] = useState<'none' | 'high' | 'low'>('none');
  /** Qarzdorlik: ko‘p qarz / kam qarz */
  const [sortDebt, setSortDebt] = useState<'none' | 'high' | 'low'>('none');
  const [quickOpen, setQuickOpen] = useState<'line' | 'agent' | 'mark' | 'top' | 'debt' | null>(null);
  const [showSalesCols, setShowSalesCols] = useState(false);
  const [territoryColWidth, setTerritoryColWidth] = useState(240);
  const territoryResizeRef = useRef<{ startX: number; startW: number } | null>(null);
  const [activeClient, setActiveClient] = useState<ClientRow | null>(null);
  const [clientMapOpen, setClientMapOpen] = useState(false);
  const [clientGpsWarnOpen, setClientGpsWarnOpen] = useState(false);
  const [clientPhotoOpen, setClientPhotoOpen] = useState(false);
  const [photoFullscreen, setPhotoFullscreen] = useState(false);
  const [lineCatalog, setLineCatalog] = useState<Array<{ code: string; name: string }>>([]);
  const [categoryCatalog, setCategoryCatalog] = useState<string[]>([]);
  const [showAddClient, setShowAddClient] = useState(false);
  const [showExcelImport, setShowExcelImport] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientRow | null>(null);
  const [statsClient, setStatsClient] = useState<ClientRow | null>(null);
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferPickIds, setTransferPickIds] = useState<string[]>([]);
  const [listMode, setListMode] = useState<'active' | 'trash'>('active');
  const [actionBusy, setActionBusy] = useState(false);
  const [trashConfirmClient, setTrashConfirmClient] = useState<ClientRow | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const clientFilterBtnRef = useRef<HTMLButtonElement>(null);
  const clientTableRef = useRef<HTMLDivElement>(null);
  const scrollClientTable = (dir: 'left' | 'right') => {
    if (clientTableRef.current) clientTableRef.current.scrollBy({ left: dir === 'right' ? 220 : -220, behavior: 'smooth' });
  };

  useEffect(() => {
    if (!isFullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [isFullscreen]);

  useEffect(() => {
    if (
      showAddClient
      || editingClient
      || clientMapOpen
      || clientPhotoOpen
      || trashConfirmClient
      || showTransfer
      || showExcelImport
      || statsClient
    ) {
      setIsFullscreen(false);
    }
  }, [
    showAddClient,
    editingClient,
    clientMapOpen,
    clientPhotoOpen,
    trashConfirmClient,
    showTransfer,
    showExcelImport,
    statsClient,
  ]);

  const companyId = selectedCompanyIds.size === 1 ? [...selectedCompanyIds][0] : undefined;

  const refreshClients = useCallback(async () => {
    if (!hasApiToken()) {
      setClients([]);
      setAgents([]);
      setLines([]);
      setLineCatalog([]);
      setCategoryCatalog([]);
      setBackendReady(false);
      setLoadError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setSaveError(null);
    setLoadError(null);
    try {
      const [rawClients, distributors, lineList, categoryList] = await Promise.all([
        listMode === 'trash' ? api.getTrashClients(companyId) : api.getClients(companyId),
        api.getDistributors(companyId),
        api.getLines(companyId).catch(() => []),
        api.getClientCategories(companyId).catch(() => []),
      ]);
      const agentList = distributorsToAgents(distributors);
      // Liniyalar — faqat /lines API (demo/distributor kodlari emas)
      const catalog = lineList
        .filter((l) => l.code?.trim())
        .map((l) => ({ code: l.code.trim(), name: (l.name || '').trim() }));
      setAgents(agentList);
      setLines(catalog.map((l) => l.code).sort((a, b) => a.localeCompare(b)));
      setLineCatalog(catalog);
      setCategoryCatalog(
        [...new Set(
          categoryList
            .filter((c) => c.isActive !== false)
            .map((c) => c.name?.trim())
            .filter(Boolean) as string[],
        )].sort((a, b) => a.localeCompare(b, 'uz')),
      );
      setClients(rawClients.map((c) => apiClientToRow(c, { lines: catalog })));
      setBackendReady(true);
      setActiveClient(null);
      setClientPage(1);
    } catch (e) {
      setClients([]);
      setAgents([]);
      setLines([]);
      setLineCatalog([]);
      setCategoryCatalog([]);
      setBackendReady(false);
      const msg = e instanceof Error ? e.message : String(e);
      if (/\b401\b/i.test(msg) || /unauthorized/i.test(msg)) {
        setLoadError(null);
        return;
      }
      const isNetwork = /fetch|network|failed|refused|ulanmagan/i.test(msg);
      setLoadError(
        isNetwork
          ? (t.userErrBackendDown || "Backend ishlamayapti. Terminalda: cd backend && npm run start:dev")
          : msg,
      );
    } finally {
      setLoading(false);
    }
  }, [companyId, listMode, t.userErrBackendDown]);

  useEffect(() => { refreshClients(); }, [refreshClients]);

  useEffect(() => {
    const handler = () => { refreshClients(); };
    window.addEventListener('lider:client-approved', handler);
    return () => window.removeEventListener('lider:client-approved', handler);
  }, [refreshClients]);

  useEffect(() => {
    onClientsChange?.(clients);
  }, [clients, onClientsChange]);

  const handleSaveClient = async (data: Partial<ClientRow> & {
    id: string;
    appUsername?: string;
    appPassword?: string;
    appLoginChanged?: boolean;
    hasAppLogin?: boolean;
    isActive?: boolean;
  }) => {
    setSaveError(null);
    try {
      const distributorId = data.distributorId
        ?? (data.agent ? agentNameToId(data.agent, agents) : undefined);
      const { appUsername, appPassword, appLoginChanged, hasAppLogin, isActive, ...rest } = data;
      const updated = await api.updateClient(
        data.id,
        {
          ...rowToUpdatePayload({ ...rest, distributorId, id: data.id, isActive }),
          ...appCredentialsPayload(appUsername, appPassword, {
            hasExisting: hasAppLogin,
            loginChanged: appLoginChanged,
          }),
        },
      );
      if ((updated as { status?: string }).status === 'pending') {
        setSaveError(
          'So\'rov yuborildi — admin tasdigidan keyin o\'zgarishlar qo\'llanadi',
        );
        return data.id;
      }
      const row = apiClientToRow(updated, { lines: lineCatalog });
      setClients(prev => prev.map(c => c.id === row.id ? row : c));
      setActiveClient(prev => prev?.id === row.id ? row : prev);
      return row.id;
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Saqlashda xatolik');
      throw e;
    }
  };

  const handleCreateClient = async (data: Partial<ClientRow> & {
    appUsername?: string;
    appPassword?: string;
    isActive?: boolean;
  }) => {
    setSaveError(null);
    try {
      const distributorId = data.distributorId
        ?? (data.agent ? agentNameToId(data.agent, agents) : undefined);
      const { appUsername, appPassword, isActive, ...rest } = data;
      const created = await api.createClient({
        ...formToCreatePayload({ ...rest, distributorId, isActive }, companyId),
        ...appCredentialsPayload(appUsername, appPassword),
      });
      if ((created as { status?: string }).status === 'pending') {
        setSaveError(
          'So\'rov yuborildi — admin tasdigidan keyin mijozlar ro\'yxatiga qo\'shiladi',
        );
        return created.id;
      }
      const row = apiClientToRow(created, { lines: lineCatalog });
      setClients(prev => [...prev, row]);
      return row.id;
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Saqlashda xatolik');
      throw e;
    }
  };

  const openTrashConfirm = () => {
    if (!activeClient || actionBusy || listMode === 'trash') return;
    setTrashConfirmClient(activeClient);
  };

  const handleMoveToTrash = async () => {
    if (!trashConfirmClient || actionBusy) return;
    setActionBusy(true);
    setSaveError(null);
    try {
      await api.deleteClient(trashConfirmClient.id);
      setClients(prev => prev.filter(c => c.id !== trashConfirmClient.id));
      setActiveClient(prev => (prev?.id === trashConfirmClient.id ? null : prev));
      setTrashConfirmClient(null);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : (t.clientTrashErr ?? "O'chirishda xatolik"));
    } finally {
      setActionBusy(false);
    }
  };

  const handleRestoreFromTrash = async () => {
    if (!activeClient || actionBusy || listMode !== 'trash') return;
    setActionBusy(true);
    setSaveError(null);
    try {
      await api.restoreClient(activeClient.id);
      setClients(prev => prev.filter(c => c.id !== activeClient.id));
      setActiveClient(null);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : (t.clientRestoreErr ?? 'Qaytarishda xatolik'));
    } finally {
      setActionBusy(false);
    }
  };

  const agentOptions = useMemo(() => {
    const names = new Set(agents.map(a => a.name));
    clients.forEach(c => { if (c.agent) names.add(c.agent); });
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [agents, clients]);

  const lineOptions = useMemo(() => {
    // Asosiy manba: /lines katalogi; mijozlarda bo‘lgan qo‘shimcha kodlar ham
    const codes = new Set(lineCatalog.map((l) => l.code).filter(Boolean));
    if (codes.size === 0) {
      lines.forEach((c) => { if (c) codes.add(c); });
    }
    clients.forEach((c) => {
      const code = c.lineCode || c.line.split(' - ')[0]?.trim() || '';
      if (code) codes.add(code);
    });
    return [...codes].sort((a, b) => a.localeCompare(b));
  }, [lineCatalog, lines, clients]);

  const categoryOptions = useMemo(() => {
    const names = new Set(categoryCatalog);
    clients.forEach((c) => {
      const cat = c.category?.trim();
      if (cat) names.add(cat);
      const cls = c.cls?.trim();
      if (cls) names.add(cls);
    });
    return [...names].sort((a, b) => a.localeCompare(b, 'uz'));
  }, [categoryCatalog, clients]);

  const clientTtClass = (c: ClientRow) => (c.cls || c.category || '').trim();

  const territoryOptions = useMemo(() => uniqueField(clients, c => c.territory), [clients]);
  const clsOptions = useMemo(() => uniqueField(clients, c => c.cls), [clients]);
  const priceCatOptions = useMemo(() => uniqueField(clients, c => c.priceCat || 'Standard'), [clients]);
  const hasUnassignedAgents = useMemo(() => clients.some(c => !c.agent), [clients]);

  const filtered = useMemo(() => {
    const list = clients.filter(c => {
      const q = search.trim();
      const displayCode = displayClientCode(c);
      const phoneQ = q.replace(/\s/g, '');
      const matchSearch = !q ||
        textMatchesSearch(c.name, q) ||
        textMatchesSearch(c.fullName || '', q) ||
        textMatchesSearch(c.agent, q) ||
        textMatchesSearch(c.territory, q) ||
        textMatchesSearch(c.line, q) ||
        c.code.includes(q) ||
        displayCode.includes(q) ||
        c.phone.replace(/\s/g, '').includes(phoneQ) ||
        String(c.id).includes(q);
      if (!matchSearch) return false;
      if (clientCatFilter.size > 0) {
        const tt = clientTtClass(c);
        if (!clientCatFilter.has(tt) && !clientCatFilter.has(c.category) && !(c.cls && clientCatFilter.has(c.cls))) {
          return false;
        }
      }
      if (clientMarkFilter.size > 0 && !clientMarkFilter.has(resolveClientMark(c))) return false;
      if (clientAgentFilter.size > 0) {
        const noAgentSelected = clientAgentFilter.has(NO_AGENT_KEY);
        const agentSelected = c.agent && clientAgentFilter.has(c.agent);
        if (!agentSelected && !(noAgentSelected && !c.agent)) return false;
      }
      if (clientLineFilter.size > 0) {
        const code = c.lineCode || c.line.split(' - ')[0]?.trim() || c.line;
        if (!clientLineFilter.has(code)) return false;
      }
      if (clientTerritoryFilter.size > 0 && !clientTerritoryFilter.has(c.territory)) return false;
      if (clientClsFilter.size > 0 && !clientClsFilter.has(c.cls)) return false;
      if (clientPriceCatFilter.size > 0 && !clientPriceCatFilter.has(c.priceCat)) return false;
      if (clientGpsFilter === 'with_gps' && !c.gps) return false;
      if (clientGpsFilter === 'no_gps' && c.gps) return false;
      if (clientStatusFilter === 'debtors'  && c.balance >= 0) return false;
      if (clientStatusFilter === 'surplus'  && c.balance <= 0) return false;
      if (clientStatusFilter === 'inactive' && c.lastVisit >= INACTIVE_CUTOFF) return false;
      return true;
    });

    if (sortDebt === 'none' && sortTop === 'none') return list;

    return [...list].sort((a, b) => {
      if (sortDebt === 'high') {
        const d = a.balance - b.balance;
        if (d !== 0) return d;
      } else if (sortDebt === 'low') {
        const d = b.balance - a.balance;
        if (d !== 0) return d;
      }
      if (sortTop === 'high' || sortTop === 'low') {
        const ao = a.ordersCount ?? 0;
        const bo = b.ordersCount ?? 0;
        const byOrders = sortTop === 'high' ? bo - ao : ao - bo;
        if (byOrders !== 0) return byOrders;
        const as = a.totalSales ?? 0;
        const bs = b.totalSales ?? 0;
        const bySales = sortTop === 'high' ? bs - as : as - bs;
        if (bySales !== 0) return bySales;
      }
      return 0;
    });
  }, [
    clients, search, clientCatFilter, clientMarkFilter, clientAgentFilter, clientLineFilter,
    clientTerritoryFilter, clientClsFilter, clientPriceCatFilter, clientGpsFilter,
    clientStatusFilter, sortTop, sortDebt,
  ]);

  const quickLineValue = clientLineFilter.size === 1 ? [...clientLineFilter][0] : '';
  const quickAgentValue =
    clientAgentFilter.size === 1 && !clientAgentFilter.has(NO_AGENT_KEY)
      ? [...clientAgentFilter][0]
      : clientAgentFilter.size === 1 && clientAgentFilter.has(NO_AGENT_KEY)
        ? NO_AGENT_KEY
        : '';

  const lineCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of clients) {
      const code = c.lineCode || c.line.split(' - ')[0]?.trim() || c.line;
      if (!code) continue;
      counts[code] = (counts[code] ?? 0) + 1;
    }
    return counts;
  }, [clients]);

  const lineSelectOptions = useMemo(() => {
    return lineOptions
      .map((code) => {
        const meta = lineCatalog.find((l) => l.code === code);
        return { value: code, label: meta?.name ? `${code} - ${meta.name}` : code };
      })
      .sort((a, b) => (lineCounts[b.value] ?? 0) - (lineCounts[a.value] ?? 0));
  }, [lineOptions, lineCatalog, lineCounts]);

  const markCounts = useMemo(() => {
    const counts: Record<MarkColor, number> = { green: 0, yellow: 0, red: 0 };
    for (const c of clients) counts[resolveClientMark(c)] += 1;
    return counts;
  }, [clients]);

  const quickLineLabel = quickLineValue
    ? (lineSelectOptions.find((o) => o.value === quickLineValue)?.label ?? quickLineValue)
    : (t.colLine ?? 'Liniya');
  const quickAgentLabel = !quickAgentValue
    ? (t.colAgent ?? 'Agent')
    : quickAgentValue === NO_AGENT_KEY
      ? (t.noAgentLabel || 'Agentsiz')
      : quickAgentValue;
  const quickTopLabel =
    sortTop === 'high' ? (t.quickSortTopHigh ?? "Ko'p ishlagan ↓")
      : sortTop === 'low' ? (t.quickSortTopLow ?? 'Kam ishlagan ↑')
        : (t.quickSortTop ?? 'Top mijozlar');
  const quickDebtLabel =
    sortDebt === 'high' ? (t.quickSortDebtHigh ?? "Ko'p qarz")
      : sortDebt === 'low' ? (t.quickSortDebtLow ?? 'Kam qarz')
        : (t.quickSortDebt ?? 'Qarzdorlik');

  const markOptions = useMemo(() => ([
    { key: 'green' as const, label: t.markGreen ?? 'Yashil', color: '#22c55e' },
    { key: 'yellow' as const, label: t.markYellow ?? 'Sariq', color: '#eab308' },
    { key: 'red' as const, label: t.markRed ?? 'Qizil', color: '#ef4444' },
  ]), [t.markGreen, t.markYellow, t.markRed]);

  const quickMarkLabel = (() => {
    if (clientMarkFilter.size === 0) return t.markFilterLabel ?? 'Belgi';
    if (clientMarkFilter.size === 1) {
      const key = [...clientMarkFilter][0];
      const opt = markOptions.find((o) => o.key === key);
      return opt ? `${opt.label} (${markCounts[key]})` : (t.markFilterLabel ?? 'Belgi');
    }
    return `${t.markFilterLabel ?? 'Belgi'} (${clientMarkFilter.size})`;
  })();

  const quickPill = (active: boolean) =>
    `flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-semibold border transition-colors max-w-[200px]
      ${active
        ? 'bg-indigo-500 border-indigo-500 text-white shadow-sm shadow-indigo-500/25'
        : D
          ? 'bg-[#1a1a1a] border-gray-700 text-gray-200 hover:border-indigo-500/50 hover:bg-white/[0.04]'
          : 'bg-white border-gray-200 text-gray-700 hover:border-indigo-300 hover:bg-indigo-50/60'}`;

  const quickMenu = `absolute left-0 top-full mt-1.5 z-[95] min-w-full w-max max-w-[min(280px,calc(100vw-2rem))] max-h-64 overflow-y-auto rounded-2xl border shadow-2xl py-1.5
    ${D ? 'bg-[#1a1a1a] border-gray-700 shadow-black/50' : 'bg-white border-gray-100 shadow-gray-300/50'}`;

  const quickItem = (active: boolean) =>
    `w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors
      ${active
        ? D ? 'bg-indigo-500/20 text-indigo-300 font-semibold' : 'bg-indigo-50 text-indigo-700 font-semibold'
        : D ? 'text-gray-300 hover:bg-white/5' : 'text-gray-700 hover:bg-gray-50'}`;

  const countBadge = (count: number, color = '#6366f1') => (
    <span
      className="tabular-nums text-[11px] font-bold px-1.5 py-0.5 rounded-lg flex-shrink-0"
      style={{ background: `${color}22`, color }}
    >
      {count}
    </span>
  );

  const handleExport = () => {
    const rows = filtered.map(c => ({
      [t.colCode]:       displayClientCode(c),
      [t.colClientName]: c.name,
      [t.colFullName]:   c.fullName,
      [t.colLine]:       c.line,
      [t.colCategory]:   clientTtClass(c) || c.category,
      [t.colPriceCat]:   c.priceCat || 'Standard',
      [t.colTerritory]:  c.territory,
      [t.colINN]:        c.inn,
      [t.colLegalAddr]:  c.legalAddr,
      [t.colPhone]:      c.phone,
      [t.colContact]:    formatClientContact(c),
      [t.colClass]:      c.isActive === false ? (t.inactiveStatus ?? 'Nofaol') : (t.activeStatus ?? 'Faol'),
      [t.colGPS]:        c.gps,
      [t.colGpsUpdated]: c.locationUpdatedAt
        ? `${formatDisplayDate(c.locationUpdatedAt)}${c.locationUpdatedBy ? ` · ${c.locationUpdatedBy}` : ''}`
        : '',
      [t.colAgent]:      c.agent,
      [t.colBalance]:    c.balance,
      [t.colLastVisit]:  formatDisplayDate(c.lastVisit),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, t.navClients || 'Mijozlar');
    XLSX.writeFile(wb, `mijozlar_${TODAY}.xlsx`);
  };

  const toggleSet = (
    setter: Dispatch<SetStateAction<Set<string>>>,
    value: string,
  ) => {
    setter(prev => {
      const next = new Set(prev);
      next.has(value) ? next.delete(value) : next.add(value);
      return next;
    });
    setClientPage(1);
  };

  const toggleCat = (cat: string) => toggleSet(setClientCatFilter, cat);

  const toggleMark = (mark: MarkColor) => {
    setClientMarkFilter((prev) => {
      const next = new Set(prev);
      next.has(mark) ? next.delete(mark) : next.add(mark);
      return next;
    });
    setClientPage(1);
  };

  const clearAllFilters = () => {
    setClientCatFilter(new Set());
    setClientMarkFilter(new Set());
    setClientAgentFilter(new Set());
    setClientLineFilter(new Set());
    setClientTerritoryFilter(new Set());
    setClientClsFilter(new Set());
    setClientPriceCatFilter(new Set());
    setClientGpsFilter('all');
    setClientStatusFilter('all');
    setSortTop('none');
    setSortDebt('none');
    setClientPage(1);
  };

  const activeFilterCount =
    clientCatFilter.size +
    clientMarkFilter.size +
    clientAgentFilter.size +
    clientLineFilter.size +
    clientTerritoryFilter.size +
    clientClsFilter.size +
    clientPriceCatFilter.size +
    (clientGpsFilter !== 'all' ? 1 : 0) +
    (clientStatusFilter !== 'all' ? 1 : 0) +
    (sortTop !== 'none' ? 1 : 0) +
    (sortDebt !== 'none' ? 1 : 0);

  const hasActiveFilter = activeFilterCount > 0;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage   = Math.min(clientPage, totalPages);
  const paginated  = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);
  const goPage = (p: number) => setClientPage(Math.max(1, Math.min(p, totalPages)));

  const btnBase   = `w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium transition-colors`;
  const btnActive = D ? 'bg-white text-black' : 'bg-gray-900 text-white';
  const btnIdle   = D ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500';

  const pageNums: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pageNums.push(i);
  } else {
    pageNums.push(1);
    if (safePage > 3) pageNums.push('...');
    for (let i = Math.max(2, safePage - 1); i <= Math.min(totalPages - 1, safePage + 1); i++) pageNums.push(i);
    if (safePage < totalPages - 2) pageNums.push('...');
    pageNums.push(totalPages);
  }

  const Pagination = () => totalPages <= 1 ? null : (
    <div className={`flex items-center justify-between px-2 py-2 flex-shrink-0 border-t ${D ? 'border-gray-800' : 'border-gray-100'}`}>
      <span className={`text-xs ${sub}`}>
        {(safePage - 1) * PER_PAGE + 1}–{Math.min(safePage * PER_PAGE, filtered.length)} / {filtered.length}
      </span>
      <div className="flex items-center gap-1">
        <button onClick={() => goPage(safePage - 1)} disabled={safePage === 1}
          className={`${btnBase} ${safePage === 1 ? 'opacity-30 cursor-not-allowed' : btnIdle}`}>‹</button>
        {pageNums.map((n, i) =>
          n === '...'
            ? <span key={`e${i}`} className={`w-6 text-center text-xs ${sub}`}>…</span>
            : <button key={n} onClick={() => goPage(n as number)}
                className={`${btnBase} ${n === safePage ? btnActive : btnIdle}`}>{n}</button>
        )}
        <button onClick={() => goPage(safePage + 1)} disabled={safePage === totalPages}
          className={`${btnBase} ${safePage === totalPages ? 'opacity-30 cursor-not-allowed' : btnIdle}`}>›</button>
      </div>
    </div>
  );

  const thCls = `px-2 py-2 text-left whitespace-nowrap select-none border-r ${D ? 'border-gray-700' : 'border-gray-200'} text-[11px] font-semibold ${sub} bg-inherit`;
  const tdCls = `px-2 py-[5px] text-[11px] whitespace-nowrap border-r ${D ? 'border-gray-800' : 'border-gray-100'}`;

  const startTerritoryResize = (e: ReactMouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    territoryResizeRef.current = { startX: e.clientX, startW: territoryColWidth };
    const onMove = (ev: MouseEvent) => {
      const s = territoryResizeRef.current;
      if (!s) return;
      const next = Math.min(520, Math.max(100, s.startW + (ev.clientX - s.startX)));
      setTerritoryColWidth(next);
    };
    const onUp = () => {
      territoryResizeRef.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  // ── Status filter options with translations ──
  const statusOptions = [
    { key: 'all',      label: t.allLabel             || 'Barchasi' },
    { key: 'debtors',  label: t.debtorsLabel          || 'Qarzdorlar' },
    { key: 'surplus',  label: t.surplusLabel          || 'Avanslilar' },
    { key: 'inactive', label: t.inactiveClientsLabel  || 'Ishlamaydigan' },
  ];

  const summaryCards = [
    { l: t.allClientsLabel,          v: clients.length,                                        c: '',                 status: 'all'      },
    { l: t.debtorsLabel,             v: clients.filter(c => c.balance < 0).length,             c: 'text-rose-400',    status: 'debtors'  },
    { l: t.surplusLabel,             v: clients.filter(c => c.balance > 0).length,             c: 'text-emerald-400', status: 'surplus'  },
    { l: t.inactiveClientsLabel,     v: clients.filter(c => c.lastVisit < INACTIVE_CUTOFF).length, c: 'text-amber-400', status: 'inactive' },
  ];

  const listEmptyMessage = loading
    ? (t.loading || 'Yuklanmoqda...')
    : loadError
      ? loadError
      : !hasApiToken()
        ? (t.userErrAdminLoginRequired || "Backend bilan bog'lanish uchun admin login qiling")
        : (t.noResults || "Ma'lumot topilmadi");

  return (
    <div className="space-y-3">
      {(saveError || loadError) && (
        <div className={`px-3 py-2 rounded-xl text-sm border ${D ? 'bg-rose-900/30 border-rose-800 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
          {saveError || loadError}
        </div>
      )}
      {/* Header */}
      <div className="flex items-start justify-between gap-2 flex-shrink-0">
        <div>
          <h2 className="text-xl font-bold">
            {listMode === 'trash'
              ? (t.clientTrashTitle ?? 'Korzinka')
              : t.allClientsTitle}
          </h2>
          <p className={`text-sm ${sub} mt-0.5`}>
            {loading ? (t.loading || 'Yuklanmoqda...') : `${filtered.length} / ${clients.length}`}
          </p>
          <div className="flex items-center gap-1.5 mt-2">
            <button
              type="button"
              onClick={() => setListMode('active')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                listMode === 'active'
                  ? 'bg-indigo-600 text-white'
                  : D ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t.allClientsTitle}
            </button>
            <button
              type="button"
              onClick={() => setListMode('trash')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                listMode === 'trash'
                  ? 'bg-rose-600 text-white'
                  : D ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Trash2 size={11} /> {t.clientTrashTitle ?? 'Korzinka'}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {/* Filter button */}
          <div className="relative">
            <button
              ref={clientFilterBtnRef}
              onClick={() => setShowClientFilter(v => !v)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors
                ${hasActiveFilter
                  ? 'bg-indigo-500 text-white'
                  : D ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}
            >
              <Filter size={12} /> {t.filterBtn}
              {hasActiveFilter && (
                <span className="ml-0.5 bg-white/30 rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>
            {showClientFilter && (
              <>
                <div className="fixed inset-0 z-[90]" onClick={() => setShowClientFilter(false)} />
                <div className={`absolute right-0 top-full mt-2 z-[91] w-80 max-h-[min(80vh,520px)] overflow-y-auto rounded-2xl border shadow-2xl p-4 space-y-4
                  ${D ? 'bg-[#1a1a1a] border-gray-700' : 'bg-white border-gray-100'}`}>
                  {/* Agent */}
                  <div>
                    <p className={`text-[10px] font-semibold uppercase tracking-widest ${sub} mb-2`}>{t.agentFilterLabel || t.colAgent}</p>
                    <div className="space-y-1 max-h-36 overflow-y-auto">
                      {hasUnassignedAgents && (
                        <button onClick={() => toggleSet(setClientAgentFilter, NO_AGENT_KEY)}
                          className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl transition-colors text-xs
                            ${clientAgentFilter.has(NO_AGENT_KEY) ? D ? 'bg-white/10' : 'bg-indigo-50' : D ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                          <span className={clientAgentFilter.has(NO_AGENT_KEY) ? D ? 'text-white font-medium' : 'text-indigo-700 font-medium' : ''}>{t.noAgentLabel || 'Agentsiz'}</span>
                          {clientAgentFilter.has(NO_AGENT_KEY) && <Check size={11} className="ml-auto text-indigo-400" />}
                        </button>
                      )}
                      {agentOptions.map(name => (
                        <button key={name} onClick={() => toggleSet(setClientAgentFilter, name)}
                          className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl transition-colors text-xs
                            ${clientAgentFilter.has(name) ? D ? 'bg-white/10' : 'bg-indigo-50' : D ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                          <span className={`truncate ${clientAgentFilter.has(name) ? D ? 'text-white font-medium' : 'text-indigo-700 font-medium' : ''}`}>{name}</span>
                          {clientAgentFilter.has(name) && <Check size={11} className="ml-auto text-indigo-400 flex-shrink-0" />}
                        </button>
                      ))}
                      {agentOptions.length === 0 && !hasUnassignedAgents && (
                        <p className={`text-xs px-2 ${sub}`}>{t.noResults}</p>
                      )}
                    </div>
                  </div>

                  {/* Liniya (API) */}
                  {lineSelectOptions.length > 0 && (
                    <div>
                      <p className={`text-[10px] font-semibold uppercase tracking-widest ${sub} mb-2`}>{t.lineFilterLabel || t.colLine}</p>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {lineSelectOptions.map(({ value, label }) => (
                          <button key={value} onClick={() => toggleSet(setClientLineFilter, value)}
                            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl transition-colors text-xs
                              ${clientLineFilter.has(value) ? D ? 'bg-white/10' : 'bg-indigo-50' : D ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                            <span className={`truncate flex-1 text-left ${clientLineFilter.has(value) ? D ? 'text-white font-medium' : 'text-indigo-700 font-medium' : ''}`}>{label}</span>
                            {countBadge(lineCounts[value] ?? 0)}
                            {clientLineFilter.has(value) && <Check size={11} className="text-indigo-400 flex-shrink-0" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Belgi (manager: yashil / sariq / qizil) */}
                  <div>
                    <p className={`text-[10px] font-semibold uppercase tracking-widest ${sub} mb-2`}>
                      {t.markFilterLabel ?? 'Belgi'}
                    </p>
                    <div className="space-y-1.5">
                      {([
                        { key: 'green' as const, label: t.markGreen ?? 'Yashil', hint: t.markGreenHint, color: '#22c55e' },
                        { key: 'yellow' as const, label: t.markYellow ?? 'Sariq', hint: t.markYellowHint, color: '#eab308' },
                        { key: 'red' as const, label: t.markRed ?? 'Qizil', hint: t.markRedHint, color: '#ef4444' },
                      ]).map(({ key, label, hint, color }) => {
                        const active = clientMarkFilter.has(key);
                        const count = markCounts[key];
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => toggleMark(key)}
                            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl transition-colors text-xs
                              ${active ? D ? 'bg-white/10' : 'bg-indigo-50' : D ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}
                          >
                            <span
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{
                                background: color,
                                boxShadow: `0 0 0 2px ${D ? '#1a1a1a' : '#fff'}, 0 0 0 3.5px ${color}66`,
                              }}
                            />
                            <span className={`min-w-0 flex-1 text-left ${active ? D ? 'text-white font-medium' : 'text-indigo-700 font-medium' : ''}`}>
                              <span className="block truncate">{label}</span>
                              {hint && (
                                <span className={`block text-[10px] truncate ${sub}`}>{hint}</span>
                              )}
                            </span>
                            <span
                              className="tabular-nums text-[11px] font-bold px-1.5 py-0.5 rounded-lg flex-shrink-0"
                              style={{
                                background: `${color}22`,
                                color,
                              }}
                            >
                              {count}
                            </span>
                            {active && <Check size={11} className="text-indigo-400 flex-shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Kategoriya (API: От, Тт, Хорека, …) */}
                  {categoryOptions.length > 0 && (
                    <div>
                      <p className={`text-[10px] font-semibold uppercase tracking-widest ${sub} mb-2`}>{t.catFilterLabel}</p>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {categoryOptions.map((name, idx) => {
                          const active = clientCatFilter.has(name);
                          const palette = ['#6366f1', '#8b5cf6', '#a78bfa', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#64748b'];
                          const color = palette[idx % palette.length];
                          return (
                            <button key={name} onClick={() => toggleCat(name)}
                              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl transition-colors text-xs
                                ${active ? D ? 'bg-white/10' : 'bg-indigo-50' : D ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                              <span className={`truncate ${active ? D ? 'text-white font-medium' : 'text-indigo-700 font-medium' : ''}`}>{name}</span>
                              {active && <Check size={11} className="ml-auto text-indigo-400 flex-shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Hudud */}
                  {territoryOptions.length > 0 && (
                    <div>
                      <p className={`text-[10px] font-semibold uppercase tracking-widest ${sub} mb-2`}>{t.territoryFilterLabel || t.colTerritory}</p>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {territoryOptions.map(ter => (
                          <button key={ter} onClick={() => toggleSet(setClientTerritoryFilter, ter)}
                            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl transition-colors text-xs
                              ${clientTerritoryFilter.has(ter) ? D ? 'bg-white/10' : 'bg-indigo-50' : D ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                            <span className={`truncate ${clientTerritoryFilter.has(ter) ? D ? 'text-white font-medium' : 'text-indigo-700 font-medium' : ''}`}>{ter}</span>
                            {clientTerritoryFilter.has(ter) && <Check size={11} className="ml-auto text-indigo-400 flex-shrink-0" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sinf */}
                  {clsOptions.length > 0 && (
                    <div>
                      <p className={`text-[10px] font-semibold uppercase tracking-widest ${sub} mb-2`}>{t.classFilterLabel || t.colClass}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {clsOptions.map(cls => (
                          <button key={cls} onClick={() => toggleSet(setClientClsFilter, cls)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors
                              ${clientClsFilter.has(cls)
                                ? 'bg-indigo-500 text-white'
                                : D ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
                            {cls}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Narx zonasi */}
                  {priceCatOptions.length > 0 && (
                    <div>
                      <p className={`text-[10px] font-semibold uppercase tracking-widest ${sub} mb-2`}>{t.priceCatFilterLabel || t.colPriceCat}</p>
                      <div className="space-y-1 max-h-28 overflow-y-auto">
                        {priceCatOptions.map(pc => (
                          <button key={pc} onClick={() => toggleSet(setClientPriceCatFilter, pc)}
                            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl transition-colors text-xs
                              ${clientPriceCatFilter.has(pc) ? D ? 'bg-white/10' : 'bg-indigo-50' : D ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                            <span className={`truncate ${clientPriceCatFilter.has(pc) ? D ? 'text-white font-medium' : 'text-indigo-700 font-medium' : ''}`}>{pc}</span>
                            {clientPriceCatFilter.has(pc) && <Check size={11} className="ml-auto text-indigo-400 flex-shrink-0" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* GPS */}
                  <div>
                    <p className={`text-[10px] font-semibold uppercase tracking-widest ${sub} mb-2`}>{t.gpsFilterLabel || t.colGPS}</p>
                    <div className="space-y-1">
                      {[
                        { key: 'all', label: t.allLabel || 'Barchasi' },
                        { key: 'with_gps', label: t.withGpsLabel || 'GPS bor' },
                        { key: 'no_gps', label: t.noGpsLabel || "GPS yo'q" },
                      ].map(({ key, label }) => (
                        <button key={key}
                          onClick={() => { setClientGpsFilter(key as typeof clientGpsFilter); setClientPage(1); }}
                          className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl transition-colors text-xs
                            ${clientGpsFilter === key
                              ? D ? 'bg-white/10 text-white font-medium' : 'bg-indigo-50 text-indigo-700 font-medium'
                              : D ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                          <span>{label}</span>
                          {clientGpsFilter === key && <Check size={11} className="ml-auto text-indigo-400" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Balans holati */}
                  <div>
                    <p className={`text-[10px] font-semibold uppercase tracking-widest ${sub} mb-2`}>{t.statusLabel}</p>
                    <div className="space-y-1">
                      {statusOptions.map(({ key, label }) => (
                        <button key={key}
                          onClick={() => { setClientStatusFilter(key as typeof clientStatusFilter); setClientPage(1); }}
                          className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl transition-colors text-xs
                            ${clientStatusFilter === key
                              ? D ? 'bg-white/10 text-white font-medium' : 'bg-indigo-50 text-indigo-700 font-medium'
                              : D ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                          <span>{label}</span>
                          {clientStatusFilter === key && <Check size={11} className="ml-auto text-indigo-400" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {hasActiveFilter && (
                    <button onClick={clearAllFilters}
                      className={`w-full text-xs py-1.5 rounded-xl border transition-colors sticky bottom-0
                        ${D ? 'border-gray-700 bg-[#1a1a1a] hover:bg-gray-800 text-gray-400' : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-500'}`}>
                      {t.clearFilter}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => {
              setTransferPickIds(activeClient ? [activeClient.id] : []);
              setShowTransfer(true);
            }}
            disabled={listMode === 'trash'}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors
              ${listMode === 'trash'
                ? 'opacity-40 cursor-not-allowed ' + (D ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-400')
                : D ? 'bg-teal-900/50 hover:bg-teal-800/50 text-teal-300' : 'bg-teal-50 hover:bg-teal-100 text-teal-700'}`}
          >
            <ArrowRightLeft size={12} /> {t.transferBtn ?? "O'tkazish"}
          </button>

          <button
            onClick={() => { if (activeClient && listMode === 'active') setEditingClient(activeClient); }}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors
              ${activeClient && listMode === 'active'
                ? D ? 'bg-amber-900/60 hover:bg-amber-800/60 text-amber-300' : 'bg-amber-50 hover:bg-amber-100 text-amber-700'
                : 'opacity-40 cursor-not-allowed ' + (D ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-400')}`}>
            <Edit2 size={12} /> {t.editClientBtn ?? 'Tahrirlash'}
          </button>

          {listMode === 'trash' ? (
            <button
              onClick={handleRestoreFromTrash}
              disabled={!activeClient || actionBusy}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors
                ${activeClient && !actionBusy
                  ? D ? 'bg-emerald-900/60 hover:bg-emerald-800/60 text-emerald-300' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                  : 'opacity-40 cursor-not-allowed ' + (D ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-400')}`}
            >
              <RotateCcw size={12} /> {t.clientRestoreBtn ?? 'Qaytarish'}
            </button>
          ) : (
            <button
              onClick={openTrashConfirm}
              disabled={!activeClient || actionBusy}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors
                ${activeClient && !actionBusy
                  ? D ? 'bg-rose-900/60 hover:bg-rose-800/60 text-rose-300' : 'bg-rose-50 hover:bg-rose-100 text-rose-700'
                  : 'opacity-40 cursor-not-allowed ' + (D ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-400')}`}
            >
              <Trash2 size={12} /> {t.clientDeleteBtn ?? "O'chirish"}
            </button>
          )}

          <button
            onClick={() => {
              if (!activeClient) return;
              if (clientHasGps(activeClient)) setClientMapOpen(true);
              else setClientGpsWarnOpen(true);
            }}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors
              ${activeClient
                ? D ? 'bg-sky-900/60 hover:bg-sky-800/60 text-sky-300' : 'bg-sky-50 hover:bg-sky-100 text-sky-700'
                : 'opacity-40 cursor-not-allowed ' + (D ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-400')}`}>
            <MapPin size={12} /> {t.mapLabel}
          </button>

          <button
            onClick={() => { if (activeClient) { setPhotoFullscreen(false); setClientPhotoOpen(true); } }}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors
              ${activeClient
                ? D ? 'bg-violet-900/60 hover:bg-violet-800/60 text-violet-300' : 'bg-violet-50 hover:bg-violet-100 text-violet-700'
                : 'opacity-40 cursor-not-allowed ' + (D ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-400')}`}>
            <ImageIcon size={12} /> {t.photoLabel}
          </button>

          <button
            onClick={() => { if (activeClient) setStatsClient(activeClient); }}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors
              ${activeClient
                ? D ? 'bg-indigo-900/60 hover:bg-indigo-800/60 text-indigo-300' : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'
                : 'opacity-40 cursor-not-allowed ' + (D ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-400')}`}>
            <BarChart3 size={12} /> {t.statBtn ?? 'Statistika'}
          </button>

          <button
            type="button"
            onClick={() => setShowSalesCols((v) => !v)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors
              ${showSalesCols
                ? 'bg-indigo-500 border-indigo-500 text-white shadow-sm shadow-indigo-500/25'
                : D
                  ? 'bg-[#1a1a1a] border-gray-700 text-gray-200 hover:border-indigo-500/50'
                  : 'bg-white border-gray-200 text-gray-700 hover:border-indigo-300 hover:bg-indigo-50/60'}`}
            title={t.salesToggle ?? 'Savdo'}
          >
            <ShoppingCart size={12} /> {t.salesToggle ?? 'Savdo'}
          </button>

          <button onClick={handleExport}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors
              ${D ? 'bg-emerald-900/60 hover:bg-emerald-800/60 text-emerald-400' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'}`}>
            <Download size={12} /> {t.exportBtn}
          </button>

          <button
            onClick={() => setShowExcelImport(true)}
            disabled={listMode === 'trash'}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors
              ${listMode === 'trash'
                ? 'opacity-40 cursor-not-allowed ' + (D ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-400')
                : D ? 'bg-teal-900/60 hover:bg-teal-800/60 text-teal-300' : 'bg-teal-50 hover:bg-teal-100 text-teal-700'}`}>
            <Upload size={12} /> {t.importBtn ?? 'Import'}
          </button>

          <button
            onClick={() => setShowAddClient(true)}
            disabled={listMode === 'trash'}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors
              ${listMode === 'trash'
                ? 'opacity-40 cursor-not-allowed ' + (D ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-400')
                : D ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}>
            <Plus size={13} /> {t.addClientBtn ?? "Mijoz qo'shish"}
          </button>
        </div>
      </div>

      {/* Add / Edit Client Modal */}
      {showAddClient && (
        <AddClient
          agents={agents}
          lines={(lineCatalog.length
            ? lineCatalog.map((l) => (l.name ? `${l.code} - ${l.name}` : l.code))
            : lines
          ).sort((a, b) => a.localeCompare(b))}
          companyId={companyId}
          onSave={handleCreateClient}
          onClose={() => setShowAddClient(false)}
        />
      )}
      {editingClient && (
        <AddClient
          client={editingClient}
          agents={agents}
          lines={(lineCatalog.length
            ? lineCatalog.map((l) => (l.name ? `${l.code} - ${l.name}` : l.code))
            : lines
          ).sort((a, b) => a.localeCompare(b))}
          companyId={companyId}
          onSave={handleSaveClient}
          onClose={() => setEditingClient(null)}
        />
      )}
      {showExcelImport && (
        <ClientExcelImportModal
          D={D}
          companyId={companyId}
          t={t}
          onClose={() => setShowExcelImport(false)}
          onDone={() => { void refreshClients(); }}
        />
      )}

      {/* Client Stats Panel */}
      {statsClient && (
        <ClientStatsPanel
          client={statsClient}
          D={D}
          sub={sub}
          text={text}
          onClose={() => setStatsClient(null)}
          t={t}
        />
      )}

      {/* Search + quick filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-shrink-0">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${card} w-full sm:w-56 md:w-64 lg:w-72 flex-shrink-0`}>
          <Search size={14} className={sub} />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setClientPage(1); }}
            placeholder={t.searchPlaceholder}
            className="flex-1 bg-transparent outline-none text-sm min-w-0"
          />
          {search && (
            <button type="button" onClick={() => { setSearch(''); setClientPage(1); }}>
              <X size={13} className={sub} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          {quickOpen && (
            <div className="fixed inset-0 z-[94]" onClick={() => setQuickOpen(null)} />
          )}

          {/* Liniya */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setQuickOpen(quickOpen === 'line' ? null : 'line')}
              className={quickPill(!!quickLineValue)}
              title={t.lineFilterLabel || t.colLine}
            >
              <span className="truncate">{quickLineLabel}</span>
              <ChevronDown size={13} className={`flex-shrink-0 opacity-70 transition-transform ${quickOpen === 'line' ? 'rotate-180' : ''}`} />
            </button>
            {quickOpen === 'line' && (
              <div className={quickMenu}>
                <button
                  type="button"
                  className={quickItem(!quickLineValue)}
                  onClick={() => { setClientLineFilter(new Set()); setQuickOpen(null); setClientPage(1); }}
                >
                  <span className="flex-1 truncate">{t.quickFilterLineAll ?? `${t.colLine}: ${t.allLabel ?? 'Barchasi'}`}</span>
                  {!quickLineValue && <Check size={12} className="text-indigo-400 flex-shrink-0" />}
                </button>
                {lineSelectOptions.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    className={quickItem(quickLineValue === o.value)}
                    onClick={() => { setClientLineFilter(new Set([o.value])); setQuickOpen(null); setClientPage(1); }}
                  >
                    <span className="flex-1 truncate">{o.label}</span>
                    {countBadge(lineCounts[o.value] ?? 0)}
                    {quickLineValue === o.value && <Check size={12} className="text-indigo-400 flex-shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Agent */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setQuickOpen(quickOpen === 'agent' ? null : 'agent')}
              className={quickPill(!!quickAgentValue)}
              title={t.agentFilterLabel || t.colAgent}
            >
              <span className="truncate">{quickAgentLabel}</span>
              <ChevronDown size={13} className={`flex-shrink-0 opacity-70 transition-transform ${quickOpen === 'agent' ? 'rotate-180' : ''}`} />
            </button>
            {quickOpen === 'agent' && (
              <div className={quickMenu}>
                <button
                  type="button"
                  className={quickItem(!quickAgentValue)}
                  onClick={() => { setClientAgentFilter(new Set()); setQuickOpen(null); setClientPage(1); }}
                >
                  <span className="flex-1 truncate">{t.quickFilterAgentAll ?? `${t.colAgent}: ${t.allLabel ?? 'Barchasi'}`}</span>
                  {!quickAgentValue && <Check size={12} className="text-indigo-400 flex-shrink-0" />}
                </button>
                {hasUnassignedAgents && (
                  <button
                    type="button"
                    className={quickItem(quickAgentValue === NO_AGENT_KEY)}
                    onClick={() => { setClientAgentFilter(new Set([NO_AGENT_KEY])); setQuickOpen(null); setClientPage(1); }}
                  >
                    <span className="flex-1 truncate">{t.noAgentLabel || 'Agentsiz'}</span>
                    {quickAgentValue === NO_AGENT_KEY && <Check size={12} className="text-indigo-400 flex-shrink-0" />}
                  </button>
                )}
                {agentOptions.map((name) => (
                  <button
                    key={name}
                    type="button"
                    className={quickItem(quickAgentValue === name)}
                    onClick={() => { setClientAgentFilter(new Set([name])); setQuickOpen(null); setClientPage(1); }}
                  >
                    <span className="flex-1 truncate">{name}</span>
                    {quickAgentValue === name && <Check size={12} className="text-indigo-400 flex-shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Belgi */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setQuickOpen(quickOpen === 'mark' ? null : 'mark')}
              className={quickPill(clientMarkFilter.size > 0)}
              title={t.markFilterLabel ?? 'Belgi'}
            >
              {clientMarkFilter.size === 1 && (
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: markOptions.find((o) => clientMarkFilter.has(o.key))?.color }}
                />
              )}
              <span className="truncate">{quickMarkLabel}</span>
              <ChevronDown size={13} className={`flex-shrink-0 opacity-70 transition-transform ${quickOpen === 'mark' ? 'rotate-180' : ''}`} />
            </button>
            {quickOpen === 'mark' && (
              <div className={quickMenu}>
                <button
                  type="button"
                  className={quickItem(clientMarkFilter.size === 0)}
                  onClick={() => { setClientMarkFilter(new Set()); setClientPage(1); }}
                >
                  <span className="flex-1 truncate">{t.allLabel ?? 'Barchasi'}</span>
                  {clientMarkFilter.size === 0 && <Check size={12} className="text-indigo-400 flex-shrink-0" />}
                </button>
                {markOptions.map(({ key, label, color }) => {
                  const active = clientMarkFilter.has(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      className={quickItem(active)}
                      onClick={() => toggleMark(key)}
                    >
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                      <span className="flex-1 truncate text-left">{label}</span>
                      <span
                        className="tabular-nums text-[11px] font-bold px-1.5 py-0.5 rounded-lg flex-shrink-0"
                        style={{ background: `${color}22`, color }}
                      >
                        {markCounts[key]}
                      </span>
                      {active && <Check size={12} className="text-indigo-400 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Top */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setQuickOpen(quickOpen === 'top' ? null : 'top')}
              className={quickPill(sortTop !== 'none')}
              title={t.quickSortTop ?? 'Top mijozlar'}
            >
              <span className="truncate">{quickTopLabel}</span>
              <ChevronDown size={13} className={`flex-shrink-0 opacity-70 transition-transform ${quickOpen === 'top' ? 'rotate-180' : ''}`} />
            </button>
            {quickOpen === 'top' && (
              <div className={quickMenu}>
                {([
                  { v: 'none' as const, l: t.quickSortTop ?? 'Top mijozlar' },
                  { v: 'high' as const, l: t.quickSortTopHigh ?? "Ko'p ishlagan ↓" },
                  { v: 'low' as const, l: t.quickSortTopLow ?? 'Kam ishlagan ↑' },
                ]).map((o) => (
                  <button
                    key={o.v}
                    type="button"
                    className={quickItem(sortTop === o.v)}
                    onClick={() => { setSortTop(o.v); setQuickOpen(null); setClientPage(1); }}
                  >
                    <span className="flex-1 truncate">{o.l}</span>
                    {sortTop === o.v && <Check size={12} className="text-indigo-400 flex-shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Qarz */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setQuickOpen(quickOpen === 'debt' ? null : 'debt')}
              className={quickPill(sortDebt !== 'none')}
              title={t.quickSortDebt ?? 'Qarzdorlik'}
            >
              <span className="truncate">{quickDebtLabel}</span>
              <ChevronDown size={13} className={`flex-shrink-0 opacity-70 transition-transform ${quickOpen === 'debt' ? 'rotate-180' : ''}`} />
            </button>
            {quickOpen === 'debt' && (
              <div className={quickMenu}>
                {([
                  { v: 'none' as const, l: t.quickSortDebt ?? 'Qarzdorlik' },
                  { v: 'high' as const, l: t.quickSortDebtHigh ?? "Ko'p qarz ↑" },
                  { v: 'low' as const, l: t.quickSortDebtLow ?? 'Kam qarz ↓' },
                ]).map((o) => (
                  <button
                    key={o.v}
                    type="button"
                    className={quickItem(sortDebt === o.v)}
                    onClick={() => { setSortDebt(o.v); setQuickOpen(null); setClientPage(1); }}
                  >
                    <span className="flex-1 truncate">{o.l}</span>
                    {sortDebt === o.v && <Check size={12} className="text-indigo-400 flex-shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 flex-shrink-0">
        {summaryCards.map((s, i) => (
          <div key={i}
            onClick={() => { setClientStatusFilter(s.status as any); if (s.status === 'all') setClientCatFilter(new Set()); setClientPage(1); }}
            className={`rounded-2xl border px-3 py-2.5 flex items-center gap-2 transition-colors cursor-pointer
              ${clientStatusFilter === s.status
                ? D ? 'border-indigo-500/50 bg-indigo-900/20' : 'border-indigo-300 bg-indigo-50'
                : card}
              ${D ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}>
            <p className={`text-xl font-bold ${s.c}`}>{s.v}</p>
            <p className={`text-xs ${sub} leading-tight`}>{s.l}</p>
          </div>
        ))}
      </div>

      {/* MOBILE: card list */}
      <div className="md:hidden flex flex-col flex-1" style={{ minHeight: 0 }}>
        <div className="space-y-2 overflow-y-auto flex-1 pb-2" style={{ minHeight: 0 }}>
          {paginated.map(c => {
            const isSelected = c.rowType === 'selected';
            const isStar     = c.rowType === 'star';
            return (
              <div key={c.id}
                onClick={() => setActiveClient(c)}
                className={`rounded-2xl border px-4 py-3 cursor-pointer transition-colors
                  ${activeClient?.id === c.id
                    ? D ? 'border-indigo-500/50 bg-indigo-900/30' : 'border-indigo-400 bg-indigo-50'
                    : isSelected
                      ? D ? 'border-blue-500/50 bg-blue-900/30' : 'border-blue-400 bg-blue-50'
                      : `${card} ${D ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}`}>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {isStar && <span className="text-amber-400 text-xs flex-shrink-0">★</span>}
                    <span className="font-semibold text-sm truncate">{c.name}</span>
                  </div>
                  <span className={`text-xs font-semibold tabular-nums flex-shrink-0 ${c.balance < 0 ? 'text-rose-400' : c.balance > 0 ? 'text-emerald-400' : sub}`}>
                    {showBalances ? `${c.balance < 0 ? '−' : c.balance > 0 ? '+' : ''}${fmtFull(Math.abs(c.balance))}` : '••••'}
                  </span>
                </div>
                <div className={`grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs ${sub}`}>
                  {c.phone     && <span className="truncate">📞 {c.phone}</span>}
                  {c.agent     && <span className="truncate">👤 {c.agent}</span>}
                  {c.territory && <span className="truncate">📍 {c.territory}</span>}
                  {c.inn       && <span className="truncate font-mono">{t.colINN}: {c.inn}</span>}
                  <span className="font-mono">{t.colClass}: {c.isActive === false ? (t.inactiveStatus ?? 'Nofaol') : (t.activeStatus ?? 'Faol')}</span>
                  <span className="font-mono">{t.colCode}: {displayClientCode(c)}</span>
                </div>
                {c.legalAddr && (
                  <p className={`text-xs ${sub} mt-1 truncate`}>{c.legalAddr}</p>
                )}
              </div>
            );
          })}
          {paginated.length === 0 && (
            <div className={`text-center py-12 ${sub} text-sm`}>{listEmptyMessage}</div>
          )}
        </div>
        <Pagination />
      </div>

      {/* DESKTOP: full data grid (+ fullscreen overlay) */}
      <div
        className={
          isFullscreen
            ? 'clients-fs-overlay flex flex-col'
            : `hidden md:flex flex-col rounded-2xl border ${card}`
        }
        style={isFullscreen ? { background: D ? '#0d0d0d' : '#f4f5f7' } : undefined}
      >
        {isFullscreen && (
          <style>{`
            .clients-fs-overlay {
              position: fixed; inset: 0; z-index: 9999;
              display: flex; flex-direction: column;
              animation: clientsFsIn 0.18s ease;
            }
            @keyframes clientsFsIn {
              from { opacity: 0; transform: scale(0.98); }
              to   { opacity: 1; transform: scale(1); }
            }
          `}</style>
        )}
        {/* scroll nav + fullscreen */}
        <div className={`flex items-center justify-between gap-2 px-3 py-2 border-b flex-shrink-0 ${
          D ? 'border-gray-800' : 'border-gray-100'
        } ${isFullscreen ? (D ? 'bg-[#1c1c1e]' : 'bg-white') : ''}`}>
          {isFullscreen ? (
            <span className={`text-sm font-semibold ${text}`}>
              {listMode === 'trash'
                ? (t.clientTrashTitle ?? 'Korzinka')
                : (t.navClients ?? 'Mijozlar')}
              <span className={`font-normal ml-1.5 ${sub}`}>— {filtered.length}</span>
            </span>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => scrollClientTable('left')}
              className={`flex items-center justify-center w-7 h-7 rounded-lg border ${D ? 'border-gray-700 bg-white/[0.05] hover:bg-white/[0.1] text-gray-300' : 'border-gray-200 bg-gray-100 hover:bg-gray-200 text-gray-600'} transition-colors`}
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              onClick={() => scrollClientTable('right')}
              className={`flex items-center justify-center w-7 h-7 rounded-lg border ${D ? 'border-gray-700 bg-white/[0.05] hover:bg-white/[0.1] text-gray-300' : 'border-gray-200 bg-gray-100 hover:bg-gray-200 text-gray-600'} transition-colors`}
            >
              <ChevronRight size={14} />
            </button>
            <button
              type="button"
              onClick={() => setIsFullscreen((f) => !f)}
              title={isFullscreen
                ? (t.drawerMinimize ?? t.empMinimize ?? 'Kichraytirish')
                : (t.trackFullscreen ?? t.vFullscreen ?? "To'liq ekran")}
              className={`flex items-center justify-center w-7 h-7 rounded-lg border transition-colors ${
                isFullscreen
                  ? 'border-indigo-500 bg-indigo-500 text-white'
                  : D
                    ? 'border-gray-700 bg-white/[0.05] hover:bg-white/[0.1] text-gray-300'
                    : 'border-gray-200 bg-gray-100 hover:bg-gray-200 text-gray-600'
              }`}
            >
              {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
            {isFullscreen && (
              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className={`flex items-center justify-center w-7 h-7 rounded-lg border ml-0.5 ${D ? 'border-gray-700 bg-white/[0.05] hover:bg-white/[0.1] text-gray-300' : 'border-gray-200 bg-gray-100 hover:bg-gray-200 text-gray-600'} transition-colors`}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
        <div
          ref={clientTableRef}
          className={`show-sb flex-1 ${isFullscreen ? (D ? 'bg-[#1c1c1e]' : 'bg-white') : ''}`}
          style={{
            maxHeight: isFullscreen ? 'none' : 'calc(100vh - 230px)',
            overflowX: 'scroll',
            overflowY: 'auto',
          }}
        >
          <table style={{ minWidth: showSalesCols ? 2800 : 2100, borderCollapse: 'collapse', width: '100%' }}>
            <thead className={`sticky top-0 z-10 ${D ? 'bg-gray-900' : 'bg-gray-50'}`}>
              <tr className={`border-b ${D ? 'border-gray-700' : 'border-gray-200'}`}>
                <th className={`${thCls} sticky left-0 z-20 ${D ? 'bg-gray-900' : 'bg-gray-50'}`}>{t.colCode}</th>
                <th className={thCls}>{t.colClientName}</th>
                <th className={thCls}>{t.colFullName}</th>
                <th className={`${thCls} cursor-pointer`}>{t.colLine} <span className="ml-0.5 opacity-60">↕</span></th>
                <th className={thCls}>{t.colCategory}</th>
                <th className={thCls}>{t.colPriceCat}</th>
                <th
                  className={`${thCls} relative`}
                  style={{ width: territoryColWidth, minWidth: territoryColWidth, maxWidth: territoryColWidth }}
                >
                  {t.colTerritory}
                  <span
                    role="separator"
                    aria-orientation="vertical"
                    title={t.resizeColHint ?? 'Enini o‘zgartirish'}
                    onMouseDown={startTerritoryResize}
                    className={`absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize z-10
                      ${D ? 'hover:bg-indigo-400/50' : 'hover:bg-indigo-400/40'}`}
                  />
                </th>
                <th className={thCls}>{t.colINN}</th>
                <th className={thCls}>{t.colLegalAddr}</th>
                <th className={thCls}>{t.colPhone}</th>
                <th className={thCls}>{t.colContact}</th>
                <th className={thCls}>{t.colClass}</th>
                <th className={thCls}>{t.colGPS}</th>
                <th className={thCls}>{t.colGpsUpdated}</th>
                <th className={thCls}>{t.colLastVisit}</th>
                <th className={thCls}>{t.colCreatedBy ?? "Qo'shgan"}</th>
                {listMode === 'trash' && (
                  <th className={thCls}>{t.colDeletedBy ?? "O'chirgan"}</th>
                )}
                {showSalesCols && (
                  <>
                    <th className={thCls}>{t.colOrdersCount ?? 'Zayavkalar'}</th>
                    <th className={thCls}>{t.colLastOrder ?? 'Oxirgi zayavka'}</th>
                    <th className={thCls}>{t.colGoodsQty ?? 'Tovar miqdori'}</th>
                    <th className={thCls}>{t.colGoodsWeight ?? 'Tovar vazni'}</th>
                    <th className={thCls}>{t.colSalesSum ?? 'Summa'}</th>
                  </>
                )}
                <th className={`${thCls} border-r-0`}>{t.colNote}</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((c, i) => {
                const isSelected = c.rowType === 'selected';
                const rowBg = isSelected
                  ? D ? 'bg-blue-900/40' : 'bg-blue-100'
                  : i % 2 === 0
                    ? D ? 'bg-transparent' : 'bg-white'
                    : D ? 'bg-white/[0.02]' : 'bg-gray-50/70';
                const rowText = isSelected ? (D ? 'text-blue-200' : 'text-blue-900') : text;
                const statusLabel = c.isActive === false
                  ? (t.inactiveStatus ?? 'Nofaol')
                  : (t.activeStatus ?? 'Faol');
                return (
                  <tr key={c.id}
                    onClick={() => {
                      if (isFullscreen) setIsFullscreen(false);
                      setActiveClient(c);
                    }}
                    className={`transition-colors border-b ${D ? 'border-gray-800' : 'border-gray-100'} cursor-pointer
                      ${activeClient?.id === c.id
                        ? D ? 'bg-indigo-900/40 ring-1 ring-inset ring-indigo-500/40' : 'bg-indigo-50 ring-1 ring-inset ring-indigo-300'
                        : rowBg + ' ' + (D ? 'hover:bg-white/5' : 'hover:bg-blue-50/60')}`}>
                    <td className={`${tdCls} sticky left-0 z-10 font-mono ${rowBg} ${rowText}`}>{displayClientCode(c)}</td>
                    <td className={`${tdCls} font-semibold ${rowText} max-w-[160px] truncate`}>{c.name}</td>
                    <td className={`${tdCls} ${rowText} max-w-[160px] truncate`}>{c.fullName}</td>
                    <td className={`${tdCls} ${rowText} whitespace-nowrap`}>{c.line}</td>
                    <td className={`${tdCls} ${rowText}`}>
                      <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold whitespace-nowrap
                        ${clientTtClass(c) === 'VIP' || c.category === 'VIP' ? 'bg-purple-500/20 text-purple-400' :
                          clientTtClass(c) === 'Premium' || c.category === 'Premium' ? 'bg-violet-500/20 text-violet-400' :
                          'bg-indigo-500/15 text-indigo-400'}`}>
                        {clientTtClass(c) || '—'}
                      </span>
                    </td>
                    <td className={`${tdCls} ${rowText}`}>{c.priceCat || 'Standard'}</td>
                    <td
                      className={`${tdCls} ${rowText}`}
                      style={{ width: territoryColWidth, minWidth: territoryColWidth, maxWidth: territoryColWidth }}
                    >
                      <span className="block truncate" title={c.territory || undefined}>{c.territory}</span>
                    </td>
                    <td className={`${tdCls} font-mono ${rowText}`}>{c.inn || ''}</td>
                    <td className={`${tdCls} ${rowText} max-w-[150px] truncate`}>{c.legalAddr}</td>
                    <td className={`${tdCls} ${rowText}`}>{c.phone}</td>
                    <td className={`${tdCls} ${rowText} min-w-[140px] max-w-[220px]`}>{formatClientContact(c)}</td>
                    <td className={`${tdCls} ${rowText}`}>
                      <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold whitespace-nowrap
                        ${c.isActive === false
                          ? 'bg-amber-500/15 text-amber-400'
                          : 'bg-emerald-500/15 text-emerald-400'}`}>
                        {statusLabel}
                      </span>
                    </td>
                    <td className={`${tdCls} font-mono ${rowText}`}>{c.gps}</td>
                    <td className={`${tdCls} ${rowText} text-[10px] max-w-[160px]`}>
                      {c.locationUpdatedAt ? (
                        <div className="leading-tight">
                          <div className="whitespace-nowrap">{formatDisplayDate(c.locationUpdatedAt)}</div>
                          {c.locationUpdatedBy && (
                            <div className={`truncate ${D ? 'text-gray-400' : 'text-gray-500'}`}>{c.locationUpdatedBy}</div>
                          )}
                        </div>
                      ) : (
                        <span className={D ? 'text-gray-600' : 'text-gray-400'}>—</span>
                      )}
                    </td>
                    <td className={`${tdCls} ${rowText} text-[10px] whitespace-nowrap`}>{formatDisplayDate(c.lastVisit)}</td>
                    <td className={`${tdCls} ${rowText} text-[10px] max-w-[140px]`}>
                      {c.createdAt ? (
                        <div className="leading-tight">
                          <div className="whitespace-nowrap">{formatDisplayDate(c.createdAt)}</div>
                          <div className={`truncate ${D ? 'text-gray-400' : 'text-gray-500'}`}>{c.createdBy || '—'}</div>
                        </div>
                      ) : (
                        <span className={D ? 'text-gray-600' : 'text-gray-400'}>{c.createdBy || '—'}</span>
                      )}
                    </td>
                    {listMode === 'trash' && (
                      <td className={`${tdCls} ${rowText} text-[10px] max-w-[140px]`}>
                        {c.deletedAt ? (
                          <div className="leading-tight">
                            <div className="whitespace-nowrap">{formatDisplayDate(c.deletedAt)}</div>
                            <div className={`truncate ${D ? 'text-gray-400' : 'text-gray-500'}`}>{c.deletedBy || '—'}</div>
                          </div>
                        ) : (
                          <span className={D ? 'text-gray-600' : 'text-gray-400'}>—</span>
                        )}
                      </td>
                    )}
                    {showSalesCols && (
                      <>
                        <td className={`${tdCls} tabular-nums ${rowText}`}>{c.ordersCount ?? 0}</td>
                        <td className={`${tdCls} text-[10px] whitespace-nowrap ${rowText}`}>
                          {c.lastOrderAt ? formatDisplayDate(c.lastOrderAt) : '—'}
                        </td>
                        <td className={`${tdCls} tabular-nums ${rowText}`}>{fmtSalesNum(c.goodsQty ?? 0, 3)}</td>
                        <td className={`${tdCls} tabular-nums ${rowText}`}>{fmtSalesNum(c.goodsWeight ?? 0, 3)}</td>
                        <td className={`${tdCls} tabular-nums font-semibold ${rowText}`}>{fmtSalesNum(c.totalSales ?? 0, 2)}</td>
                      </>
                    )}
                    <td className={`${tdCls} border-r-0 ${rowText}`}></td>
                  </tr>
                );
              })}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={17 + (showSalesCols ? 5 : 0) + (listMode === 'trash' ? 1 : 0)} className={`text-center py-10 text-sm ${sub}`}>{listEmptyMessage}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination />
      </div>

      {showTransfer && (
        <TransferClientsModal
          D={D}
          sub={sub}
          t={t}
          clients={filtered}
          sourceCompanyId={companyId}
          preselectedIds={transferPickIds}
          onClose={() => setShowTransfer(false)}
          onDone={() => { void refreshClients(); }}
        />
      )}

      {/* Trash confirm modal */}
      {trashConfirmClient && (
        <div
          className="fixed inset-0 z-[220] flex items-center justify-center p-4"
          style={{ backdropFilter: 'blur(6px)', backgroundColor: 'rgba(0,0,0,0.55)' }}
          onClick={() => { if (!actionBusy) setTrashConfirmClient(null); }}
        >
          <div
            className={`relative w-full max-w-sm rounded-2xl border shadow-2xl p-6 text-center ${
              D ? 'bg-[#1a1a1a] border-gray-700' : 'bg-white border-gray-200'
            }`}
            onClick={e => e.stopPropagation()}
          >
            <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${
              D ? 'bg-rose-500/15' : 'bg-rose-50'
            }`}>
              <AlertTriangle size={22} className="text-rose-500" />
            </div>
            <h3 className={`text-base font-bold mb-2 ${text}`}>
              {t.clientTrashTitleModal ?? "Korzinkaga o'tkazish"}
            </h3>
            <p className={`text-sm leading-relaxed mb-1 ${sub}`}>
              <span className={`font-semibold ${text}`}>{trashConfirmClient.name}</span>
            </p>
            <p className={`text-xs leading-relaxed mb-6 ${sub}`}>
              {t.clientTrashConfirm ??
                "Mijoz korzinkaga o'tadi. Agent va manager APKlarida ko'rinmaydi, ma'lumotlar saqlanadi."}
            </p>
            <div className="flex gap-2.5">
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => setTrashConfirmClient(null)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                  D
                    ? 'border-gray-700 text-gray-400 hover:bg-gray-800'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {t.cancel ?? 'Bekor qilish'}
              </button>
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => { void handleMoveToTrash(); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-rose-500 hover:bg-rose-600 transition-colors shadow-lg shadow-rose-500/25 disabled:opacity-60"
              >
                {actionBusy
                  ? (t.loading || '...')
                  : (t.clientDeleteBtn ?? "O'chirish")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLIENT MAP / GPS WARNING */}
      {clientMapOpen && activeClient && (
        <ClientMapModal
          client={activeClient}
          D={D}
          t={t}
          onClose={() => setClientMapOpen(false)}
        />
      )}
      {clientGpsWarnOpen && activeClient && (
        <ClientGpsWarningModal
          client={activeClient}
          D={D}
          t={t}
          onClose={() => setClientGpsWarnOpen(false)}
        />
      )}

      {/* CLIENT PHOTO MODAL */}
      {clientPhotoOpen && activeClient && (() => {
        const photoSrc = resolveProductImageUrl(activeClient.photoUrl);
        const balColor = activeClient.balance < 0 ? 'text-rose-400' : activeClient.balance > 0 ? 'text-emerald-400' : (D ? 'text-gray-400' : 'text-gray-500');
        const sign = activeClient.balance < 0 ? '-' : activeClient.balance > 0 ? '+' : '';
        return (
          <>
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
              style={{ backdropFilter: 'blur(6px)', backgroundColor: 'rgba(0,0,0,0.70)' }}
              onClick={() => { setClientPhotoOpen(false); setPhotoFullscreen(false); }}>
              <div className={`relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl border ${D ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}
                onClick={e => e.stopPropagation()}>
                <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
                  {photoSrc && (
                    <button
                      type="button"
                      onClick={() => setPhotoFullscreen(true)}
                      title="Katta ekran"
                      className="w-8 h-8 flex items-center justify-center rounded-xl bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition-colors"
                    >
                      <Maximize2 size={14} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => { setClientPhotoOpen(false); setPhotoFullscreen(false); }}
                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="relative" style={{ height: 280 }}>
                  {photoSrc ? (
                    <img
                      src={photoSrc}
                      alt={activeClient.name}
                      onClick={() => setPhotoFullscreen(true)}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', cursor: 'zoom-in' }}
                    />
                  ) : (
                    <div className={`w-full h-full flex flex-col items-center justify-center gap-2 ${D ? 'bg-gray-800' : 'bg-gray-100'}`}>
                      <ImageIcon size={36} className={D ? 'text-gray-600' : 'text-gray-300'} />
                      <p className={`text-xs ${D ? 'text-gray-500' : 'text-gray-400'}`}>
                        {t.photoMissing ?? 'Rasm yuklanmagan'}
                      </p>
                    </div>
                  )}
                  <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0) 55%)' }} />
                  <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 pointer-events-none">
                    <p className="text-white font-semibold text-base leading-tight truncate">{activeClient.name}</p>
                    {activeClient.fullName !== activeClient.name && (
                      <p className="text-white/70 text-xs truncate mt-0.5">{activeClient.fullName}</p>
                    )}
                  </div>
                </div>
                <div className="px-4 py-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold
                        ${clientTtClass(activeClient) === 'VIP' || activeClient.category === 'VIP' ? 'bg-purple-500/20 text-purple-400' :
                          clientTtClass(activeClient) === 'Premium' || activeClient.category === 'Premium' ? 'bg-violet-500/20 text-violet-400' :
                          'bg-indigo-500/15 text-indigo-400'}`}>
                        {clientTtClass(activeClient) || '—'}
                      </span>
                      <span className={`text-[11px] font-mono ${D ? 'text-gray-500' : 'text-gray-400'}`}>{t.colCode}: {displayClientCode(activeClient)}</span>
                    </div>
                    <span className={`text-sm font-bold tabular-nums ${balColor}`}>
                      {sign}{Math.abs(activeClient.balance).toLocaleString()}
                    </span>
                  </div>
                  {activeClient.phone && (
                    <div className={`flex items-center gap-2 text-xs ${D ? 'text-gray-400' : 'text-gray-600'}`}>
                      <span className="opacity-60">{t.colPhone}:</span><span className="font-medium">{activeClient.phone}</span>
                    </div>
                  )}
                  {activeClient.territory && (
                    <div className={`flex items-center gap-2 text-xs ${D ? 'text-gray-400' : 'text-gray-600'}`}>
                      <MapPin size={10} className="opacity-50 flex-shrink-0" />
                      <span className="truncate">{activeClient.territory}</span>
                    </div>
                  )}
                  {activeClient.agent && (
                    <div className={`flex items-center gap-2 text-xs ${D ? 'text-gray-400' : 'text-gray-600'}`}>
                      <span className="opacity-60">{t.colAgent}:</span><span className="font-medium">{activeClient.agent}</span>
                    </div>
                  )}
                  <div className={`flex items-center gap-2 text-xs pt-1 ${D ? 'text-gray-500' : 'text-gray-400'}`}>
                    <span>{t.colLastVisit}:</span>
                    <span className={activeClient.lastVisit < INACTIVE_CUTOFF ? 'text-amber-400 font-medium' : ''}>{formatDisplayDate(activeClient.lastVisit)}</span>
                  </div>
                  {(activeClient.createdAt || activeClient.createdBy) && (
                    <div className={`text-xs pt-0.5 ${D ? 'text-gray-500' : 'text-gray-400'}`}>
                      <span className="opacity-70">{t.colCreatedBy ?? "Qo'shgan"}: </span>
                      <span className="font-medium">
                        {[formatDisplayDate(activeClient.createdAt), activeClient.createdBy].filter(Boolean).join(' · ') || '—'}
                      </span>
                    </div>
                  )}
                  {listMode === 'trash' && (activeClient.deletedAt || activeClient.deletedBy) && (
                    <div className={`text-xs pt-0.5 ${D ? 'text-rose-400/80' : 'text-rose-600'}`}>
                      <span className="opacity-70">{t.colDeletedBy ?? "O'chirgan"}: </span>
                      <span className="font-medium">
                        {[formatDisplayDate(activeClient.deletedAt), activeClient.deletedBy].filter(Boolean).join(' · ') || '—'}
                      </span>
                    </div>
                  )}
                  {activeClient.gps && (
                    <div className={`text-xs pt-1 space-y-0.5 ${D ? 'text-gray-500' : 'text-gray-400'}`}>
                      <div>
                        <span className="opacity-70">{t.gpsUpdatedAt ?? 'Qachon'}: </span>
                        <span className="font-medium text-inherit">
                          {activeClient.locationUpdatedAt
                            ? formatDisplayDate(activeClient.locationUpdatedAt)
                            : (t.gpsUpdatedNever ?? '—')}
                        </span>
                      </div>
                      {activeClient.locationUpdatedBy && (
                        <div>
                          <span className="opacity-70">{t.gpsUpdatedBy ?? 'Kim'}: </span>
                          <span className="font-medium">{activeClient.locationUpdatedBy}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {photoFullscreen && photoSrc && (
              <div
                className="fixed inset-0 z-[220] flex items-center justify-center p-3 sm:p-6"
                style={{ backgroundColor: 'rgba(0,0,0,0.92)' }}
                onClick={() => setPhotoFullscreen(false)}
              >
                <button
                  type="button"
                  onClick={() => setPhotoFullscreen(false)}
                  className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20"
                >
                  <X size={18} />
                </button>
                <img
                  src={photoSrc}
                  alt={activeClient.name}
                  onClick={e => e.stopPropagation()}
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 12 }}
                />
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}