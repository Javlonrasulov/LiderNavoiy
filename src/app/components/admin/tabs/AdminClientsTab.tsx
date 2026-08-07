import { useState, useRef, useEffect, useCallback, useMemo, type Dispatch, type SetStateAction } from 'react';
import * as XLSX from 'xlsx';
import { Check, ChevronLeft, ChevronRight, Download, Edit2, Filter, ImageIcon, MapPin, Plus, Search, X, BarChart3, ArrowRightLeft } from 'lucide-react';
import { fmtFull, type ClientRow } from '../../../data/adminData';
import { api } from '../../../api/client';
import {
  apiClientToRow,
  rowToUpdatePayload,
  formToCreatePayload,
  appCredentialsPayload,
  distributorsToAgents,
  distributorsToLines,
  agentNameToId,
  clientIdHash,
} from '../../../utils/clientApi';
import AddClient from '../../AddClient';
import { ClientStatsPanel } from '../ClientStatsPanel';
import { ClientMapModal, ClientGpsWarningModal, clientHasGps } from '../ClientMapModal';
import { TransferClientsModal } from '../TransferClientsModal';
import { demo } from '../../../data/demoLimit';
import { formatDisplayDate } from '../../../utils/dateFormat';

function hasApiToken(): boolean {
  return !!localStorage.getItem('api_access_token');
}

const TODAY = '2026-03-08';
const INACTIVE_CUTOFF = '2026-03-01';
const PER_PAGE = 20;
const NO_AGENT_KEY = '__none__';

function uniqueField(clients: ClientRow[], pick: (c: ClientRow) => string) {
  return [...new Set(clients.map(pick).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

const PHOTOS = demo([
  'https://images.unsplash.com/photo-1717233464702-090e655f7a4f?w=900&q=80',
  'https://images.unsplash.com/photo-1606824722920-4c652a70f348?w=900&q=80',
  'https://images.unsplash.com/photo-1753982861969-295e79c4bf78?w=900&q=80',
  'https://images.unsplash.com/photo-1619261148028-967ca5e0ccc3?w=900&q=80',
  'https://images.unsplash.com/photo-1769107262371-295ab518ab0b?w=900&q=80',
  'https://images.unsplash.com/photo-1542838132-92c53300491e?w=900&q=80',
]);

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
  const [clientAgentFilter, setClientAgentFilter] = useState<Set<string>>(new Set());
  const [clientLineFilter, setClientLineFilter] = useState<Set<string>>(new Set());
  const [clientTerritoryFilter, setClientTerritoryFilter] = useState<Set<string>>(new Set());
  const [clientClsFilter, setClientClsFilter] = useState<Set<string>>(new Set());
  const [clientPriceCatFilter, setClientPriceCatFilter] = useState<Set<string>>(new Set());
  const [clientGpsFilter, setClientGpsFilter] = useState<'all' | 'with_gps' | 'no_gps'>('all');
  const [clientStatusFilter, setClientStatusFilter] = useState<'all' | 'debtors' | 'inactive' | 'surplus'>('all');
  const [activeClient, setActiveClient] = useState<ClientRow | null>(null);
  const [clientMapOpen, setClientMapOpen] = useState(false);
  const [clientGpsWarnOpen, setClientGpsWarnOpen] = useState(false);
  const [clientPhotoOpen, setClientPhotoOpen] = useState(false);
  const [showAddClient, setShowAddClient] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientRow | null>(null);
  const [statsClient, setStatsClient] = useState<ClientRow | null>(null);
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferPickIds, setTransferPickIds] = useState<string[]>([]);
  const clientFilterBtnRef = useRef<HTMLButtonElement>(null);
  const clientTableRef = useRef<HTMLDivElement>(null);
  const scrollClientTable = (dir: 'left' | 'right') => {
    if (clientTableRef.current) clientTableRef.current.scrollBy({ left: dir === 'right' ? 220 : -220, behavior: 'smooth' });
  };

  const companyId = selectedCompanyIds.size === 1 ? [...selectedCompanyIds][0] : undefined;

  const refreshClients = useCallback(async () => {
    if (!hasApiToken()) {
      setClients([]);
      setAgents([]);
      setLines([]);
      setBackendReady(false);
      setLoadError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setSaveError(null);
    setLoadError(null);
    try {
      const [rawClients, distributors] = await Promise.all([
        api.getClients(companyId),
        api.getDistributors(companyId),
      ]);
      const agentList = distributorsToAgents(distributors);
      setAgents(agentList);
      setLines(distributorsToLines(distributors));
      setClients(rawClients.map(apiClientToRow));
      setBackendReady(true);
    } catch (e) {
      setClients([]);
      setAgents([]);
      setLines([]);
      setBackendReady(false);
      const msg = e instanceof Error ? e.message : String(e);
      // 401 → SessionExpiredOverlay; sahifada demo/xato banner ko'rsatilmasin
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
  }, [companyId]);

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
  }) => {
    setSaveError(null);
    try {
      const distributorId = data.distributorId
        ?? (data.agent ? agentNameToId(data.agent, agents) : undefined);
      const { appUsername, appPassword, appLoginChanged, hasAppLogin, ...rest } = data;
      const updated = await api.updateClient(
        data.id,
        {
          ...rowToUpdatePayload({ ...rest, distributorId, id: data.id }),
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
      const row = apiClientToRow(updated);
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
  }) => {
    setSaveError(null);
    try {
      const distributorId = data.distributorId
        ?? (data.agent ? agentNameToId(data.agent, agents) : undefined);
      const { appUsername, appPassword, ...rest } = data;
      const created = await api.createClient({
        ...formToCreatePayload({ ...rest, distributorId }, companyId),
        ...appCredentialsPayload(appUsername, appPassword),
      });
      if ((created as { status?: string }).status === 'pending') {
        setSaveError(
          'So\'rov yuborildi — admin tasdigidan keyin mijozlar ro\'yxatiga qo\'shiladi',
        );
        return created.id;
      }
      const row = apiClientToRow(created);
      setClients(prev => [...prev, row]);
      return row.id;
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Saqlashda xatolik');
      throw e;
    }
  };

  const agentOptions = useMemo(() => {
    const names = new Set(agents.map(a => a.name));
    clients.forEach(c => { if (c.agent) names.add(c.agent); });
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [agents, clients]);

  const lineOptions = useMemo(() => {
    const codes = new Set(lines);
    clients.forEach(c => { if (c.line) codes.add(c.line); });
    return [...codes].sort((a, b) => a.localeCompare(b));
  }, [lines, clients]);

  const territoryOptions = useMemo(() => uniqueField(clients, c => c.territory), [clients]);
  const clsOptions = useMemo(() => uniqueField(clients, c => c.cls), [clients]);
  const priceCatOptions = useMemo(() => uniqueField(clients, c => c.priceCat), [clients]);
  const hasUnassignedAgents = useMemo(() => clients.some(c => !c.agent), [clients]);

  const filtered = clients.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      c.name.toLowerCase().includes(q) ||
      c.code.includes(q) ||
      c.phone.replace(/\s/g,'').includes(q.replace(/\s/g,'')) ||
      c.agent.toLowerCase().includes(q) ||
      c.territory.toLowerCase().includes(q) ||
      c.line.toLowerCase().includes(q) ||
      String(c.id).includes(q);
    if (!matchSearch) return false;
    if (clientCatFilter.size > 0 && !clientCatFilter.has(c.category)) return false;
    if (clientAgentFilter.size > 0) {
      const noAgentSelected = clientAgentFilter.has(NO_AGENT_KEY);
      const agentSelected = c.agent && clientAgentFilter.has(c.agent);
      if (!agentSelected && !(noAgentSelected && !c.agent)) return false;
    }
    if (clientLineFilter.size > 0 && !clientLineFilter.has(c.line)) return false;
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

  const handleExport = () => {
    const rows = filtered.map(c => ({
      [t.colCode]:       c.code,
      [t.colClientName]: c.name,
      [t.colFullName]:   c.fullName,
      [t.colLine]:       c.line,
      [t.colPriceCat]:   c.priceCat,
      [t.colCategory]:   c.category,
      [t.colTerritory]:  c.territory,
      [t.colINN]:        c.inn,
      [t.colLegalAddr]:  c.legalAddr,
      [t.colPhone]:      c.phone,
      [t.colContact]:    c.contact,
      [t.colClass]:      c.cls,
      [t.colGPS]:        c.gps,
      [t.colGpsUpdated]: c.locationUpdatedAt
        ? `${formatDisplayDate(c.locationUpdatedAt)}${c.locationUpdatedBy ? ` · ${c.locationUpdatedBy}` : ''}`
        : '',
      [t.colAgent]:      c.agent,
      [t.colBalance]:    c.balance,
      [t.colLastVisit]:  formatDisplayDate(c.lastVisit),
      [t.colID]:         c.code,
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

  const clearAllFilters = () => {
    setClientCatFilter(new Set());
    setClientAgentFilter(new Set());
    setClientLineFilter(new Set());
    setClientTerritoryFilter(new Set());
    setClientClsFilter(new Set());
    setClientPriceCatFilter(new Set());
    setClientGpsFilter('all');
    setClientStatusFilter('all');
    setClientPage(1);
  };

  const activeFilterCount =
    clientCatFilter.size +
    clientAgentFilter.size +
    clientLineFilter.size +
    clientTerritoryFilter.size +
    clientClsFilter.size +
    clientPriceCatFilter.size +
    (clientGpsFilter !== 'all' ? 1 : 0) +
    (clientStatusFilter !== 'all' ? 1 : 0);

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
          <h2 className="text-xl font-bold">{t.allClientsTitle}</h2>
          <p className={`text-sm ${sub} mt-0.5`}>
            {loading ? (t.loading || 'Yuklanmoqda...') : `${filtered.length} / ${clients.length}`}
          </p>
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

                  {/* Yo'nalish / Liniya */}
                  {lineOptions.length > 0 && (
                    <div>
                      <p className={`text-[10px] font-semibold uppercase tracking-widest ${sub} mb-2`}>{t.lineFilterLabel || t.colLine}</p>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {lineOptions.map(line => (
                          <button key={line} onClick={() => toggleSet(setClientLineFilter, line)}
                            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl transition-colors text-xs
                              ${clientLineFilter.has(line) ? D ? 'bg-white/10' : 'bg-indigo-50' : D ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                            <span className={clientLineFilter.has(line) ? D ? 'text-white font-medium' : 'text-indigo-700 font-medium' : ''}>{line}</span>
                            {clientLineFilter.has(line) && <Check size={11} className="ml-auto text-indigo-400" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Kategoriya */}
                  <div>
                    <p className={`text-[10px] font-semibold uppercase tracking-widest ${sub} mb-2`}>{t.catFilterLabel}</p>
                    <div className="space-y-1.5">
                      {[
                        { key: 'Standard', label: 'Standard', color: '#6366f1' },
                        { key: 'VIP',      label: 'VIP',      color: '#8b5cf6' },
                        { key: 'Premium',  label: 'Premium',  color: '#a78bfa' },
                      ].map(({ key, label, color }) => {
                        const active = clientCatFilter.has(key);
                        return (
                          <button key={key} onClick={() => toggleCat(key)}
                            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl transition-colors text-xs
                              ${active ? D ? 'bg-white/10' : 'bg-indigo-50' : D ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                            <span className={active ? D ? 'text-white font-medium' : 'text-indigo-700 font-medium' : ''}>{label}</span>
                            {active && <Check size={11} className="ml-auto text-indigo-400" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

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
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors
              ${D ? 'bg-teal-900/50 hover:bg-teal-800/50 text-teal-300' : 'bg-teal-50 hover:bg-teal-100 text-teal-700'}`}
          >
            <ArrowRightLeft size={12} /> {t.transferBtn ?? "O'tkazish"}
          </button>

          <button
            onClick={() => { if (activeClient) setEditingClient(activeClient); }}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors
              ${activeClient
                ? D ? 'bg-amber-900/60 hover:bg-amber-800/60 text-amber-300' : 'bg-amber-50 hover:bg-amber-100 text-amber-700'
                : 'opacity-40 cursor-not-allowed ' + (D ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-400')}`}>
            <Edit2 size={12} /> {t.editClientBtn ?? 'Tahrirlash'}
          </button>

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
            onClick={() => { if (activeClient) setClientPhotoOpen(true); }}
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

          <button onClick={handleExport}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors
              ${D ? 'bg-emerald-900/60 hover:bg-emerald-800/60 text-emerald-400' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'}`}>
            <Download size={12} /> {t.exportBtn}
          </button>

          <button
            onClick={() => setShowAddClient(true)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors
              ${D ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}>
            <Plus size={13} /> {t.addClientBtn ?? "Mijoz qo'shish"}
          </button>
        </div>
      </div>

      {/* Add / Edit Client Modal */}
      {showAddClient && (
        <AddClient
          agents={agents}
          lines={lines}
          onSave={handleCreateClient}
          onClose={() => setShowAddClient(false)}
        />
      )}
      {editingClient && (
        <AddClient
          client={editingClient}
          agents={agents}
          lines={lines}
          onSave={handleSaveClient}
          onClose={() => setEditingClient(null)}
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

      {/* Search */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${card} flex-shrink-0`}>
        <Search size={14} className={sub} />
        <input value={search} onChange={e => { setSearch(e.target.value); setClientPage(1); }}
          placeholder={t.searchPlaceholder}
          className={`flex-1 bg-transparent outline-none text-sm min-w-0`} />
        {search && <button onClick={() => { setSearch(''); setClientPage(1); }}><X size={13} className={sub} /></button>}
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
                  <span className="font-mono">{t.colClass}: {c.cls}</span>
                  <span className="font-mono">{t.colID}: {c.code}</span>
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

      {/* DESKTOP: full data grid */}
      <div className={`hidden md:flex flex-col rounded-2xl border ${card}`}>
        {/* scroll nav buttons */}
        <div className={`flex justify-end gap-1 px-3 py-2 border-b ${D ? 'border-gray-800' : 'border-gray-100'}`}>
          <button onClick={() => scrollClientTable('left')} className={`flex items-center justify-center w-7 h-7 rounded-lg border ${D ? 'border-gray-700 bg-white/[0.05] hover:bg-white/[0.1] text-gray-300' : 'border-gray-200 bg-gray-100 hover:bg-gray-200 text-gray-600'} transition-colors`}><ChevronLeft size={14} /></button>
          <button onClick={() => scrollClientTable('right')} className={`flex items-center justify-center w-7 h-7 rounded-lg border ${D ? 'border-gray-700 bg-white/[0.05] hover:bg-white/[0.1] text-gray-300' : 'border-gray-200 bg-gray-100 hover:bg-gray-200 text-gray-600'} transition-colors`}><ChevronRight size={14} /></button>
        </div>
        <div ref={clientTableRef} className="show-sb" style={{ maxHeight: 'calc(100vh - 230px)', overflowX: 'scroll', overflowY: 'auto' }}>
          <table style={{ minWidth: 1550, borderCollapse: 'collapse', width: '100%' }}>
            <thead className={`sticky top-0 z-10 ${D ? 'bg-gray-900' : 'bg-gray-50'}`}>
              <tr className={`border-b ${D ? 'border-gray-700' : 'border-gray-200'}`}>
                <th className={`${thCls} sticky left-0 z-20 ${D ? 'bg-gray-900' : 'bg-gray-50'}`}>{t.colCode}</th>
                <th className={thCls}>{t.colClientName}</th>
                <th className={thCls}>{t.colFullName}</th>
                <th className={`${thCls} cursor-pointer`}>{t.colLine} <span className="ml-0.5 opacity-60">↕</span></th>
                <th className={thCls}>{t.colPriceCat}</th>
                <th className={thCls}>{t.colTerritory}</th>
                <th className={thCls}>{t.colINN}</th>
                <th className={thCls}>{t.colLegalAddr}</th>
                <th className={thCls}>{t.colPhone}</th>
                <th className={thCls}>{t.colContact}</th>
                <th className={thCls}>{t.colClass}</th>
                <th className={thCls}>{t.colGPS}</th>
                <th className={thCls}>{t.colGpsUpdated}</th>
                <th className={thCls}>{t.colID}</th>
                <th className={thCls}>{t.colCategory}</th>
                <th className={thCls}>{t.colLastVisit}</th>
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
                return (
                  <tr key={c.id}
                    onClick={() => setActiveClient(c)}
                    className={`transition-colors border-b ${D ? 'border-gray-800' : 'border-gray-100'} cursor-pointer
                      ${activeClient?.id === c.id
                        ? D ? 'bg-indigo-900/40 ring-1 ring-inset ring-indigo-500/40' : 'bg-indigo-50 ring-1 ring-inset ring-indigo-300'
                        : rowBg + ' ' + (D ? 'hover:bg-white/5' : 'hover:bg-blue-50/60')}`}>
                    <td className={`${tdCls} sticky left-0 z-10 font-mono ${rowBg} ${rowText}`}>{c.code}</td>
                    <td className={`${tdCls} font-semibold ${rowText} max-w-[160px] truncate`}>{c.name}</td>
                    <td className={`${tdCls} ${rowText} max-w-[160px] truncate`}>{c.fullName}</td>
                    <td className={`${tdCls} ${rowText}`}>{c.line}</td>
                    <td className={`${tdCls} ${rowText}`}>{c.priceCat}</td>
                    <td className={`${tdCls} ${rowText} max-w-[110px] truncate`}>{c.territory}</td>
                    <td className={`${tdCls} font-mono ${rowText}`}>{c.inn || '000000000'}</td>
                    <td className={`${tdCls} ${rowText} max-w-[150px] truncate`}>{c.legalAddr}</td>
                    <td className={`${tdCls} ${rowText}`}>{c.phone}</td>
                    <td className={`${tdCls} ${rowText} max-w-[90px] truncate`}>{c.contact}</td>
                    <td className={`${tdCls} font-mono ${rowText}`}>{c.cls}</td>
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
                    <td className={`${tdCls} font-mono ${D ? 'text-gray-400' : 'text-gray-500'}`}>{c.code}</td>
                    <td className={`${tdCls} ${rowText}`}>
                      <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold whitespace-nowrap
                        ${c.category === 'VIP' ? 'bg-purple-500/20 text-purple-400' :
                          c.category === 'Premium' ? 'bg-violet-500/20 text-violet-400' :
                          'bg-indigo-500/15 text-indigo-400'}`}>
                        {c.category}
                      </span>
                    </td>
                    <td className={`${tdCls} ${rowText} text-[10px] whitespace-nowrap`}>{formatDisplayDate(c.lastVisit)}</td>
                    <td className={`${tdCls} border-r-0 ${rowText}`}></td>
                  </tr>
                );
              })}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={17} className={`text-center py-10 text-sm ${sub}`}>{listEmptyMessage}</td>
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
        const photo = PHOTOS[clientIdHash(activeClient.id) % PHOTOS.length];
        const balColor = activeClient.balance < 0 ? 'text-rose-400' : activeClient.balance > 0 ? 'text-emerald-400' : (D ? 'text-gray-400' : 'text-gray-500');
        const sign = activeClient.balance < 0 ? '-' : activeClient.balance > 0 ? '+' : '';
        return (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ backdropFilter: 'blur(6px)', backgroundColor: 'rgba(0,0,0,0.70)' }}
            onClick={() => setClientPhotoOpen(false)}>
            <div className={`relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl border ${D ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}
              onClick={e => e.stopPropagation()}>
              <button onClick={() => setClientPhotoOpen(false)}
                className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-xl bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition-colors">
                <X size={14} />
              </button>
              <div className="relative" style={{ height: 280 }}>
                <img src={photo} alt={activeClient.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0) 55%)' }} />
                <div className="absolute bottom-0 left-0 right-0 px-4 pb-3">
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
                      ${activeClient.category === 'VIP' ? 'bg-purple-500/20 text-purple-400' :
                        activeClient.category === 'Premium' ? 'bg-violet-500/20 text-violet-400' :
                        'bg-indigo-500/15 text-indigo-400'}`}>
                      {activeClient.category}
                    </span>
                    <span className={`text-[11px] font-mono ${D ? 'text-gray-500' : 'text-gray-400'}`}>{t.colID}: {activeClient.code}</span>
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
        );
      })()}
    </div>
  );
}