import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, Filter, Loader2,
  Package, RefreshCcw, Search, ShoppingCart, Undo2, Wallet, X,
} from 'lucide-react';
import {
  api,
  type ClientDebtDetail,
  type DebtAgePreset,
  type DebtSort,
  type DebtorListItem,
} from '../../../api/client';
import { fmt } from '../../../data/adminData';
import { formatDisplayDateTime } from '../../../utils/dateFormat';
import { SingleDatePicker } from '../SingleDatePicker';

type Props = {
  onBack: () => void;
  D: boolean;
  sub: string;
  text: string;
  card: string;
  divider: string;
  t: Record<string, string>;
  showBalances: boolean;
  companyIds: string[];
  initialAgePreset?: DebtAgePreset;
};

type AgeChip = { id: DebtAgePreset; labelKey: string };
type SelectOption = { value: string; label: string };

const AGE_CHIPS: AgeChip[] = [
  { id: 'all', labelKey: 'debtAgeAll' },
  { id: 'gt10', labelKey: 'debtAgeGt10' },
  { id: 'gt20', labelKey: 'debtAgeGt20' },
  { id: 'gt30', labelKey: 'debtAgeGt30' },
  { id: 'gt60', labelKey: 'debtAgeGt60' },
  { id: 'custom', labelKey: 'debtAgeCustom' },
];

function money(show: boolean, n: number) {
  return show ? fmt(n) : '••••';
}

function na(t: Record<string, string>, v?: string | null) {
  return v && String(v).trim() ? v : (t.debtDataUnavailable ?? 'Maʼlumot mavjud emas');
}

function translatePaymentStatus(t: Record<string, string>, status?: string | null) {
  const s = (status ?? '').toLowerCase().trim();
  if (s === 'unpaid') return t.debtPayUnpaid ?? 'To‘lanmagan';
  if (s === 'partial') return t.debtPayPartial ?? 'Qisman to‘langan';
  if (s === 'paid') return t.debtPayPaid ?? 'To‘langan';
  if (s === 'pending') return t.debtPayPending ?? 'Kutilmoqda';
  if (s === 'cancelled' || s === 'canceled') return t.debtPayCancelled ?? 'Bekor qilingan';
  return status && status.trim() ? status : na(t, null);
}

function translatePayMethod(t: Record<string, string>, method?: string | null) {
  const m = (method ?? '').toLowerCase().trim();
  if (m === 'cash') return t.debtMethodCash ?? 'Naqd';
  if (m === 'terminal') return t.debtMethodTerminal ?? 'Terminal';
  if (m === 'deferred') return t.debtMethodDeferred ?? 'Muddatli';
  return method && method.trim() ? method : '';
}

/** Tizim uslubidagi custom dropdown (native <select> o‘rniga) */
function DebtFilterSelect({
  value, options, onChange, D, className = '',
}: {
  value: string;
  options: SelectOption[];
  onChange: (v: string) => void;
  D: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find(o => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full h-9 flex items-center gap-2 px-3 rounded-xl text-sm border outline-none transition-colors text-left
          ${open
            ? D
              ? 'bg-gray-900 border-indigo-500 text-gray-100'
              : 'bg-white border-indigo-400 text-gray-900'
            : D
              ? 'bg-gray-900 border-gray-700 text-gray-100 hover:border-gray-600'
              : 'bg-gray-50 border-gray-200 text-gray-900 hover:border-gray-300'
          }`}
      >
        <span className="flex-1 min-w-0 truncate">{selected?.label ?? '—'}</span>
        <ChevronDown
          size={14}
          className={`flex-shrink-0 transition-transform duration-150 ${D ? 'text-gray-500' : 'text-gray-400'} ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div
          className={`absolute left-0 right-0 top-[calc(100%+4px)] z-[80] overflow-hidden rounded-xl border shadow-xl
            ${D ? 'bg-[#1a1a1a] border-indigo-500/50 shadow-black/50' : 'bg-white border-indigo-200 shadow-gray-200/80'}`}
          style={{ animation: 'debtDropIn .12s ease-out' }}
        >
          <div className="max-h-52 overflow-y-auto py-1">
            {options.map(opt => {
              const active = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className={`w-full text-left px-3 py-2.5 text-sm transition-colors
                    ${active
                      ? D
                        ? 'bg-indigo-500/20 text-indigo-300 font-medium'
                        : 'bg-indigo-50 text-indigo-600 font-medium'
                      : D
                        ? 'text-gray-300 hover:bg-white/5'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <style>{`@keyframes debtDropIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}

export function AdminDebtorsTab({
  onBack, D, sub, text, card, divider, t, showBalances, companyIds, initialAgePreset = 'all',
}: Props) {
  const [agePreset, setAgePreset] = useState<DebtAgePreset>(initialAgePreset);
  const [minAgeDays, setMinAgeDays] = useState('');
  const [maxAgeDays, setMaxAgeDays] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<DebtSort>('oldest');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<DebtorListItem[]>([]);
  const [summary, setSummary] = useState({ clientsCount: 0, documentsCount: 0, totalRemaining: 0 });
  const [totalPages, setTotalPages] = useState(1);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [branchId, setBranchId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [debtDateFrom, setDebtDateFrom] = useState('');
  const [debtDateTo, setDebtDateTo] = useState('');
  const [minRemaining, setMinRemaining] = useState('');
  const [maxRemaining, setMaxRemaining] = useState('');
  const [filterOpts, setFilterOpts] = useState<{
    companies: { id: string; name: string }[];
    employees: { id: string; name: string; position: string | null }[];
  }>({ companies: [], employees: [] });

  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ClientDebtDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const listScrollRef = useRef<HTMLDivElement>(null);
  const savedScroll = useRef(0);

  useLayoutEffect(() => {
    setAgePreset(initialAgePreset);
    setPage(1);
    setSelectedClientId(null);
    setDetail(null);
    setError(null);
  }, [initialAgePreset]);

  const activeFilterCount = [
    branchId, employeeId, debtDateFrom, debtDateTo, minRemaining, maxRemaining,
  ].filter(Boolean).length;

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getDebtors({
        companyIds,
        agePreset,
        minAgeDays: agePreset === 'custom' && minAgeDays !== '' ? Number(minAgeDays) : undefined,
        maxAgeDays: agePreset === 'custom' && maxAgeDays !== '' ? Number(maxAgeDays) : undefined,
        search: search.trim() || undefined,
        employeeId: employeeId || undefined,
        branchId: branchId || undefined,
        debtDateFrom: debtDateFrom || undefined,
        debtDateTo: debtDateTo || undefined,
        minRemaining: minRemaining !== '' ? Number(minRemaining) : undefined,
        maxRemaining: maxRemaining !== '' ? Number(maxRemaining) : undefined,
        sort,
        page,
        pageSize: 30,
      });
      setItems(res.items);
      setSummary(res.summary);
      setTotalPages(res.totalPages);
    } catch (e) {
      setError(e instanceof Error ? e.message : (t.debtLoadError ?? 'Yuklash xatosi'));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [
    companyIds, agePreset, minAgeDays, maxAgeDays, search, employeeId, branchId,
    debtDateFrom, debtDateTo, minRemaining, maxRemaining, sort, page, t.debtLoadError,
  ]);

  useEffect(() => { void loadList(); }, [loadList]);

  useEffect(() => {
    api.getDebtFilterOptions(companyIds)
      .then(setFilterOpts)
      .catch(() => setFilterOpts({ companies: [], employees: [] }));
  }, [companyIds]);

  const openDetail = async (clientId: string) => {
    savedScroll.current = listScrollRef.current?.scrollTop ?? 0;
    setSelectedClientId(clientId);
    setDetailLoading(true);
    setDetail(null);
    try {
      const d = await api.getClientDebtDetail(clientId, companyIds, agePreset);
      setDetail(d);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const backToList = () => {
    setSelectedClientId(null);
    setDetail(null);
    requestAnimationFrame(() => {
      if (listScrollRef.current) listScrollRef.current.scrollTop = savedScroll.current;
    });
  };

  const clearAll = () => {
    setAgePreset('all');
    setMinAgeDays('');
    setMaxAgeDays('');
    setSearch('');
    setSort('oldest');
    setBranchId('');
    setEmployeeId('');
    setDebtDateFrom('');
    setDebtDateTo('');
    setMinRemaining('');
    setMaxRemaining('');
    setPage(1);
  };

  const chips = useMemo(() => {
    const out: { key: string; label: string; clear: () => void }[] = [];
    if (branchId) {
      const name = filterOpts.companies.find(c => c.id === branchId)?.name ?? branchId;
      out.push({ key: 'b', label: name, clear: () => setBranchId('') });
    }
    if (employeeId) {
      const name = filterOpts.employees.find(e => e.id === employeeId)?.name ?? employeeId;
      out.push({ key: 'e', label: name, clear: () => setEmployeeId('') });
    }
    if (debtDateFrom || debtDateTo) {
      out.push({
        key: 'd',
        label: `${debtDateFrom || '…'} → ${debtDateTo || '…'}`,
        clear: () => { setDebtDateFrom(''); setDebtDateTo(''); },
      });
    }
    if (minRemaining || maxRemaining) {
      out.push({
        key: 'r',
        label: `${minRemaining || '0'} – ${maxRemaining || '∞'}`,
        clear: () => { setMinRemaining(''); setMaxRemaining(''); },
      });
    }
    return out;
  }, [branchId, employeeId, debtDateFrom, debtDateTo, minRemaining, maxRemaining, filterOpts]);

  const panel = D ? 'bg-[#121212] border-gray-800' : 'bg-white border-gray-200';
  const inputCls = `w-full h-9 rounded-xl border px-3 text-sm outline-none transition-colors focus:border-indigo-400 ${
    D ? 'bg-gray-900 border-gray-700 text-gray-100 placeholder:text-gray-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400'
  }`;

  const sortOptions: SelectOption[] = [
    { value: 'oldest', label: t.debtSortOldest ?? 'Eng eski qarzlar' },
    { value: 'largest', label: t.debtSortLargest ?? 'Eng katta qoldiq' },
    { value: 'name', label: t.debtSortName ?? 'Mijoz nomi' },
  ];
  const ageOptions: SelectOption[] = AGE_CHIPS.map(chip => ({
    value: chip.id,
    label: t[chip.labelKey] ?? chip.id,
  }));
  const branchOptions: SelectOption[] = [
    { value: '', label: t.debtFilterBranch ?? 'Filial (barchasi)' },
    ...filterOpts.companies.map(c => ({ value: c.id, label: c.name })),
  ];
  const employeeOptions: SelectOption[] = [
    { value: '', label: t.debtFilterEmployee ?? 'Xodim (barchasi)' },
    ...filterOpts.employees.map(e => ({ value: e.id, label: e.name })),
  ];

  return (
    <div
      className={`w-full min-h-[calc(100dvh-var(--nav-h,65px))] rounded-none border-0 shadow-none flex flex-col ${panel}`}
      aria-label={t.debtorsTitle ?? 'Qarzdorlar'}
    >
      {/* Header */}
      <div className={`px-4 sm:px-6 py-4 border-b ${divider} flex items-start gap-3 flex-shrink-0`}>
        {selectedClientId ? (
          <button
            type="button"
            onClick={backToList}
            className={`mt-0.5 w-9 h-9 rounded-xl flex items-center justify-center ${D ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
            aria-label={t.debtBack ?? 'Orqaga'}
          >
            <ArrowLeft size={18} />
          </button>
        ) : (
          <button
            type="button"
            onClick={onBack}
            className={`mt-0.5 w-9 h-9 rounded-xl flex items-center justify-center ${D ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
            aria-label={t.debtBack ?? 'Orqaga'}
          >
            <ArrowLeft size={18} />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h2 className={`text-lg font-bold truncate ${text}`}>
            {selectedClientId
              ? (detail?.client.name ?? t.debtDetailTitle ?? 'Qarz tafsiloti')
              : (t.debtorsTitle ?? 'Qarzdorlar')}
          </h2>
          {!selectedClientId && (
            <p className={`text-xs mt-1 ${sub}`}>
              {(t.debtorsSummaryLine ?? '{clients} ta mijoz · {docs} ta hujjat · {sum} so‘m')
                .replace('{clients}', String(summary.clientsCount))
                .replace('{docs}', String(summary.documentsCount))
                .replace('{sum}', money(showBalances, summary.totalRemaining))}
            </p>
          )}
          {selectedClientId && detail && (
            <p className={`text-xs mt-1 ${sub}`}>
              {[detail.client.companyName, detail.client.phone, detail.client.address]
                .filter(Boolean)
                .join(' · ') || na(t, null)}
            </p>
          )}
        </div>
        {selectedClientId && detail && (
          <div className="text-right flex-shrink-0">
            <p className={`text-[10px] uppercase tracking-wide ${sub}`}>{t.debtOpenBalance ?? 'Ochiq qoldiq'}</p>
            <p className={`text-base font-bold tabular-nums ${detail.summary.overdueRemaining > 0 ? 'text-rose-500' : text}`}>
              {money(showBalances, detail.summary.totalRemaining)}
            </p>
          </div>
        )}
      </div>

      {selectedClientId ? (
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
          {detailLoading && (
            <div className={`flex items-center justify-center gap-2 py-16 ${sub}`}>
              <Loader2 className="animate-spin" size={18} /> {t.loading ?? 'Yuklanmoqda…'}
            </div>
          )}
          {!detailLoading && !detail && (
            <p className={`text-center py-16 text-sm ${sub}`}>{t.debtLoadError ?? 'Yuklash xatosi'}</p>
          )}
          {!detailLoading && detail && (
            <DebtDetailBody detail={detail} D={D} sub={sub} text={text} card={card} divider={divider} t={t} showBalances={showBalances} />
          )}
        </div>
      ) : (
        <>
          {/* Filters block */}
          <div className={`px-4 sm:px-6 py-3 border-b ${divider} space-y-3 flex-shrink-0`}>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${sub}`} />
                <input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder={t.debtSearchPlaceholder ?? 'Mijoz, telefon, hujjat, xodim…'}
                  className={`${inputCls} pl-9`}
                />
              </div>
              <DebtFilterSelect
                value={sort}
                options={sortOptions}
                onChange={(v) => { setSort(v as DebtSort); setPage(1); }}
                D={D}
                className="sm:w-48"
              />
              <button
                type="button"
                onClick={() => setFiltersOpen(v => !v)}
                className={`inline-flex items-center justify-center gap-2 h-9 px-3 rounded-xl text-sm font-medium border transition-colors ${
                  activeFilterCount || filtersOpen
                    ? 'border-indigo-500 text-indigo-500 bg-indigo-500/10'
                    : D ? 'border-gray-700 text-gray-300 hover:border-gray-600' : 'border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                <Filter size={14} />
                {t.debtFilters ?? t.filterBtn ?? 'Filtrlar'}
                {activeFilterCount > 0 && (
                  <span className="min-w-[18px] h-[18px] rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>

            {/* Age chips — desktop row / mobile select */}
            <div className="hidden md:flex flex-wrap gap-1.5">
              {AGE_CHIPS.map(chip => {
                const active = agePreset === chip.id;
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => { setAgePreset(chip.id); setPage(1); }}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                      active
                        ? 'bg-indigo-600 text-white shadow'
                        : D ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {t[chip.labelKey] ?? chip.id}
                  </button>
                );
              })}
            </div>
            <div className="md:hidden">
              <DebtFilterSelect
                value={agePreset}
                options={ageOptions}
                onChange={(v) => { setAgePreset(v as DebtAgePreset); setPage(1); }}
                D={D}
              />
            </div>

            {agePreset === 'custom' && (
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min={0}
                  value={minAgeDays}
                  onChange={(e) => { setMinAgeDays(e.target.value); setPage(1); }}
                  placeholder={t.debtMinDays ?? 'Kamida necha kun'}
                  className={inputCls}
                />
                <input
                  type="number"
                  min={0}
                  value={maxAgeDays}
                  onChange={(e) => { setMaxAgeDays(e.target.value); setPage(1); }}
                  placeholder={t.debtMaxDays ?? 'Ko‘pi bilan necha kun'}
                  className={inputCls}
                />
              </div>
            )}

            {filtersOpen && (
              <div className={`rounded-xl border p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 ${D ? 'border-gray-800 bg-black/20' : 'border-gray-100 bg-gray-50'}`}>
                <DebtFilterSelect
                  value={branchId}
                  options={branchOptions}
                  onChange={(v) => { setBranchId(v); setPage(1); }}
                  D={D}
                />
                <DebtFilterSelect
                  value={employeeId}
                  options={employeeOptions}
                  onChange={(v) => { setEmployeeId(v); setPage(1); }}
                  D={D}
                />
                <div className="space-y-1">
                  <p className={`text-[11px] font-medium px-0.5 ${sub}`}>{t.debtDateFrom ?? 'Sana (dan)'}</p>
                  <SingleDatePicker
                    value={debtDateFrom}
                    onChange={(v) => { setDebtDateFrom(v); setPage(1); }}
                    onClear={() => { setDebtDateFrom(''); setPage(1); }}
                    D={D}
                  />
                </div>
                <div className="space-y-1">
                  <p className={`text-[11px] font-medium px-0.5 ${sub}`}>{t.debtDateTo ?? 'Sana (gacha)'}</p>
                  <SingleDatePicker
                    value={debtDateTo}
                    onChange={(v) => { setDebtDateTo(v); setPage(1); }}
                    onClear={() => { setDebtDateTo(''); setPage(1); }}
                    D={D}
                  />
                </div>
                <input type="number" value={minRemaining} onChange={(e) => { setMinRemaining(e.target.value); setPage(1); }} placeholder={t.debtMinSum ?? 'Eng kam qoldiq'} className={inputCls} />
                <input type="number" value={maxRemaining} onChange={(e) => { setMaxRemaining(e.target.value); setPage(1); }} placeholder={t.debtMaxSum ?? 'Eng ko‘p qoldiq'} className={inputCls} />
              </div>
            )}

            {(chips.length > 0 || search || agePreset !== 'all') && (
              <div className="flex flex-wrap items-center gap-1.5">
                {chips.map(c => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={c.clear}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] ${D ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'}`}
                  >
                    {c.label} <X size={11} />
                  </button>
                ))}
                <button type="button" onClick={clearAll} className="text-xs text-indigo-500 font-medium ml-1">
                  {t.debtClearAll ?? 'Hammasini tozalash'}
                </button>
                <button type="button" onClick={() => void loadList()} className={`ml-auto p-1.5 rounded-lg ${D ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
                  <RefreshCcw size={14} className={sub} />
                </button>
              </div>
            )}
          </div>

          <div ref={listScrollRef} className="flex-1 overflow-y-auto">
            {loading && (
              <div className={`flex items-center justify-center gap-2 py-16 ${sub}`}>
                <Loader2 className="animate-spin" size={18} /> {t.loading ?? 'Yuklanmoqda…'}
              </div>
            )}
            {!loading && error && (
              <div className="px-6 py-16 text-center">
                <p className="text-sm text-rose-500 mb-3">{error}</p>
                <button type="button" onClick={() => void loadList()} className="text-sm text-indigo-500 font-medium">
                  {t.debtRetry ?? t.retry ?? 'Qayta urinish'}
                </button>
              </div>
            )}
            {!loading && !error && items.length === 0 && (
              <div className="px-6 py-16 text-center space-y-3">
                <p className={`text-sm ${sub}`}>{t.debtNoMatch ?? 'Tanlangan filtrlarga mos qarz topilmadi'}</p>
                <button type="button" onClick={clearAll} className="text-sm text-indigo-500 font-medium">
                  {t.debtClearAll ?? 'Hammasini tozalash'}
                </button>
              </div>
            )}

            {/* Desktop table */}
            {!loading && !error && items.length > 0 && (
              <>
                <div className="hidden md:block">
                  <table className="w-full text-sm">
                    <thead className={`sticky top-0 z-10 ${D ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
                      <tr className={`text-left text-xs ${sub}`}>
                        <th className="px-4 py-3 font-semibold">{t.debtColClient ?? 'Mijoz'}</th>
                        <th className="px-3 py-3 font-semibold">{t.debtColBranch ?? 'Filial'}</th>
                        <th className="px-3 py-3 font-semibold text-right">{t.debtColDocs ?? 'Hujjat'}</th>
                        <th className="px-3 py-3 font-semibold text-right">{t.debtColRemaining ?? 'Qoldiq'}</th>
                        <th className="px-3 py-3 font-semibold text-right">{t.debtColOverdue ?? '30+ qoldiq'}</th>
                        <th className="px-4 py-3 font-semibold text-right">{t.debtColAge ?? 'Yosh'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(row => (
                        <tr
                          key={row.clientId}
                          onClick={() => void openDetail(row.clientId)}
                          className={`border-t cursor-pointer transition-colors ${divider} ${D ? 'hover:bg-white/5' : 'hover:bg-indigo-50/60'}`}
                        >
                          <td className="px-4 py-3">
                            <p className={`font-semibold ${text}`}>{row.name}</p>
                            <p className={`text-xs ${sub} truncate max-w-[280px]`}>
                              {[row.phone, row.address].filter(Boolean).join(' · ') || '—'}
                            </p>
                          </td>
                          <td className={`px-3 py-3 ${sub}`}>{row.companyName ?? '—'}</td>
                          <td className="px-3 py-3 text-right tabular-nums">{row.openDocuments}</td>
                          <td className="px-3 py-3 text-right font-semibold tabular-nums">{money(showBalances, row.totalRemaining)}</td>
                          <td className={`px-3 py-3 text-right tabular-nums ${row.overdueRemaining > 0 ? 'text-rose-500 font-semibold' : sub}`}>
                            {row.overdueRemaining > 0 ? money(showBalances, row.overdueRemaining) : '—'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-semibold tabular-nums ${
                              row.oldestAgeDays > 30
                                ? 'bg-rose-500/15 text-rose-500'
                                : D ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {(t.debtDaysShort ?? '{n} kun').replace('{n}', String(row.oldestAgeDays))}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden divide-y divide-inherit px-3">
                  {items.map(row => (
                    <button
                      key={row.clientId}
                      type="button"
                      onClick={() => void openDetail(row.clientId)}
                      className={`w-full text-left py-3 px-1 ${D ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className={`font-semibold truncate ${text}`}>{row.name}</p>
                          <p className={`text-xs ${sub} truncate`}>{row.phone || row.address || '—'}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold tabular-nums text-sm">{money(showBalances, row.totalRemaining)}</p>
                          <span className={`text-[11px] font-semibold ${row.oldestAgeDays > 30 ? 'text-rose-500' : sub}`}>
                            {(t.debtDaysShort ?? '{n} kun').replace('{n}', String(row.oldestAgeDays))}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {totalPages > 1 && (
            <div className={`px-4 py-3 border-t ${divider} flex items-center justify-between flex-shrink-0`}>
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className={`w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-40 ${D ? 'bg-gray-800' : 'bg-gray-100'}`}
              >
                <ChevronLeft size={16} />
              </button>
              <span className={`text-xs ${sub}`}>{page} / {totalPages}</span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className={`w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-40 ${D ? 'bg-gray-800' : 'bg-gray-100'}`}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function DebtDetailBody({
  detail, D, sub, text, card, divider, t, showBalances,
}: {
  detail: ClientDebtDetail;
  D: boolean;
  sub: string;
  text: string;
  card: string;
  divider: string;
  t: Record<string, string>;
  showBalances: boolean;
}) {
  const [showAllOpen, setShowAllOpen] = useState(false);
  const openDocs = showAllOpen
    ? detail.openDocuments
    : detail.openDocuments.filter(d => d.matchesAgeFilter).length
      ? detail.openDocuments.filter(d => d.matchesAgeFilter)
      : detail.openDocuments;

  return (
    <div className="space-y-5">
      {/* Client block */}
      <section className={`rounded-2xl border ${card} p-4 space-y-2`}>
        <h3 className="text-sm font-bold">{t.debtSectionClient ?? 'Mijoz'}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <Field label={t.debtContactPerson ?? 'Masʼul shaxs'} value={na(t, detail.client.contactPerson)} sub={sub} text={text} />
          <Field label={t.debtPhone ?? 'Telefon'} value={na(t, detail.client.phone)} sub={sub} text={text} />
          <Field label={t.debtAddress ?? 'Manzil'} value={na(t, detail.client.address)} sub={sub} text={text} />
          <Field
            label={t.debtAssignedAgent ?? 'Biriktirilgan agent'}
            value={detail.client.assignedAgent
              ? `${detail.client.assignedAgent.name}${detail.client.assignedAgent.position ? ` · ${detail.client.assignedAgent.position}` : ''}`
              : na(t, null)}
            sub={sub}
            text={text}
          />
        </div>
      </section>

      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold">{t.debtSectionDocs ?? 'Qarz hujjatlari'}</h3>
        {detail.openDocuments.some(d => !d.matchesAgeFilter) && (
          <button type="button" onClick={() => setShowAllOpen(v => !v)} className="text-xs text-indigo-500 font-medium">
            {showAllOpen ? (t.debtShowMatched ?? 'Mos hujjatlar') : (t.debtShowAllOpen ?? 'Barcha ochiq qarzlar')}
          </button>
        )}
      </div>

      {openDocs.map(doc => (
        <section key={doc.orderId} className={`rounded-2xl border ${card} overflow-hidden`}>
          <div className={`px-4 py-3 border-b ${divider} flex flex-wrap items-center justify-between gap-2`}>
            <div>
              <p className={`font-semibold ${text}`}>#{doc.orderNumber}</p>
              <p className={`text-xs ${sub}`}>{doc.companyName ?? '—'} · {translatePaymentStatus(t, doc.paymentStatus)}</p>
            </div>
            <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
              doc.overdue ? 'bg-rose-500/15 text-rose-500' : D ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'
            }`}>
              {(t.debtDaysShort ?? '{n} kun').replace('{n}', String(doc.ageDays))}
            </span>
          </div>
          <div className="p-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MiniStat
              q={t.debtWhoSold ?? 'Kim qarzga bergan?'}
              a={`${doc.soldBy.name}${doc.soldBy.position ? `\n${doc.soldBy.position}` : ''}`}
              D={D} sub={sub} text={text}
            />
            <MiniStat
              q={t.debtWhenSold ?? 'Qachon?'}
              a={`${doc.debtAt ? formatDisplayDateTime(doc.debtAt) : na(t, null)}\n${(t.debtDaysShort ?? '{n} kun').replace('{n}', String(doc.ageDays))}${doc.dueAt ? `\n${t.debtDueAt ?? 'Muddat'}: ${formatDisplayDateTime(doc.dueAt)}` : ''}`}
              D={D} sub={sub} text={text}
            />
            <MiniStat q={t.debtInitial ?? 'Qancha berilgan?'} a={money(showBalances, doc.initialAmount)} D={D} sub={sub} text={text} />
            <MiniStat q={t.debtLeft ?? 'Qancha qolgan?'} a={money(showBalances, doc.remaining)} D={D} sub={sub} text={text} danger={doc.overdue} />
          </div>

          <div className={`px-4 pb-2 text-xs ${sub}`}>
            {(t.debtPaidReturned ?? 'To‘lov: {paid} · Qaytarim: {ret}')
              .replace('{paid}', money(showBalances, doc.paidAmount))
              .replace('{ret}', money(showBalances, doc.returnedAmount))}
          </div>

          {doc.items.length > 0 && (
            <div className={`mx-4 mb-4 rounded-xl border overflow-hidden ${D ? 'border-gray-800' : 'border-gray-100'}`}>
              <div className={`px-3 py-2 text-xs font-semibold ${sub}`}>{t.debtProducts ?? 'Mahsulotlar'}</div>
              {doc.items.map((it, i) => (
                <div key={i} className={`px-3 py-2 flex justify-between gap-2 text-sm border-t ${divider}`}>
                  <div className="min-w-0">
                    <p className={`truncate ${text}`}>{it.productName}</p>
                    <p className={`text-xs ${sub}`}>{it.quantity} {it.unit} × {money(showBalances, it.price)}</p>
                  </div>
                  <p className="tabular-nums font-medium flex-shrink-0">{money(showBalances, it.lineTotal)}</p>
                </div>
              ))}
            </div>
          )}

          <div className="px-4 pb-4 space-y-2">
            <p className="text-xs font-semibold">{t.debtSectionHistory ?? 'Operatsiyalar tarixi'}</p>
            {doc.history.map((h, i) => {
              const Icon = h.type === 'sale' ? ShoppingCart : h.type === 'payment' ? Wallet : h.type === 'return' ? Undo2 : Package;
              const label =
                h.type === 'sale' ? (t.debtHistSale ?? 'Qarzga sotuv')
                  : h.type === 'payment' ? (t.debtHistPayment ?? 'To‘lov')
                    : h.type === 'return' ? (t.debtHistReturn ?? 'Qaytarim')
                      : (t.debtHistAdjust ?? 'Tuzatish');
              return (
                <div key={i} className={`rounded-xl border px-3 py-2.5 flex gap-3 ${D ? 'border-gray-800' : 'border-gray-100'}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${D ? 'bg-gray-800' : 'bg-gray-100'}`}>
                    <Icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between gap-2">
                      <p className={`text-sm font-medium ${text}`}>{label}</p>
                      <p className="text-sm font-semibold tabular-nums">{money(showBalances, h.amount)}</p>
                    </div>
                    <p className={`text-xs ${sub}`}>
                      {formatDisplayDateTime(h.at)}
                      {h.actorName ? ` · ${h.actorName}` : ''}
                      {h.method ? ` · ${translatePayMethod(t, h.method)}` : ''}
                      {h.documentNo ? ` · #${h.documentNo}` : ''}
                    </p>
                    {h.note ? <p className={`text-xs mt-0.5 ${sub}`}>{h.note}</p> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {openDocs.length === 0 && (
        <p className={`text-sm text-center py-8 ${sub}`}>{t.debtNoOpenDocs ?? 'Ochiq qarz hujjati yo‘q'}</p>
      )}
    </div>
  );
}

function Field({ label, value, sub, text }: { label: string; value: string; sub: string; text: string }) {
  return (
    <div>
      <p className={`text-[11px] ${sub}`}>{label}</p>
      <p className={`text-sm ${text}`}>{value}</p>
    </div>
  );
}

function MiniStat({
  q, a, D, sub, text, danger,
}: {
  q: string; a: string; D: boolean; sub: string; text: string; danger?: boolean;
}) {
  return (
    <div className={`rounded-xl p-3 ${D ? 'bg-white/5' : 'bg-gray-50'}`}>
      <p className={`text-[11px] mb-1 ${sub}`}>{q}</p>
      <p className={`text-sm font-semibold whitespace-pre-line ${danger ? 'text-rose-500' : text}`}>{a}</p>
    </div>
  );
}
