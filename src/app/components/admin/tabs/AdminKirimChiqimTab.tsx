import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ArrowDownRight, ArrowUpRight, Check, ChevronDown, ChevronRight,
  Download, Plus, RefreshCw, Search, X, Wallet,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { MiniLineChart } from '../../MiniCharts';
import { fmt, fmtFull } from '../../../data/adminData';
import { useCompanies } from '../../CompaniesContext';
import { DateRangePicker } from '../DateRangePicker';
import {
  api,
  type CashFlowGroupNode,
  type CashFlowSummary,
  type CashMovementDto,
  type SalesProfitResponse,
} from '../../../api/client';

interface Props {
  D: boolean;
  card: string;
  divider: string;
  sub: string;
  t: Record<string, string>;
  showBalances: boolean;
  selectedCompanyIds: Set<string>;
  viewOrg: string;
  onOpenOrder?: (orderId: string) => void;
}

type InnerTab = 'overview' | 'cash' | 'profit';
type PeriodPreset = 'today' | 'week' | 'month' | 'custom';

function toIsoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function formatMoney(n: number | null | undefined, t: Record<string, string>) {
  if (n == null || Number.isNaN(n)) return t.kcDash ?? '—';
  return `${fmtFull(n)} ${t.kcSom ?? "so'm"}`;
}
function formatShort(n: number | null | undefined, t: Record<string, string>, show: boolean) {
  if (!show) return '••••';
  if (n == null || Number.isNaN(n)) return t.kcDash ?? '—';
  return fmt(n);
}

type KcOption = { value: string; label: string };

function KcSelect({
  value,
  options,
  onChange,
  D,
  className = '',
  size = 'sm',
}: {
  value: string;
  options: KcOption[];
  onChange: (v: string) => void;
  D: boolean;
  className?: string;
  size?: 'sm' | 'md';
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value) ?? options[0];
  const h = size === 'md' ? 'h-11 text-sm' : 'h-9 text-xs';

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
        onClick={() => setOpen((o) => !o)}
        className={`w-full ${h} flex items-center gap-2 px-3 rounded-xl border outline-none transition-all text-left font-medium
          ${open
            ? D
              ? 'bg-gray-900 border-indigo-500 text-gray-100 shadow-[0_0_0_3px_rgba(99,102,241,0.18)]'
              : 'bg-white border-indigo-400 text-gray-900 shadow-[0_0_0_3px_rgba(99,102,241,0.12)]'
            : D
              ? 'bg-gray-900/80 border-gray-700 text-gray-100 hover:border-gray-500'
              : 'bg-white border-gray-200 text-gray-900 hover:border-gray-300'
          }`}
      >
        <span className="flex-1 min-w-0 truncate">{selected?.label ?? '—'}</span>
        <ChevronDown
          size={14}
          className={`flex-shrink-0 transition-transform duration-150 ${
            D ? 'text-gray-500' : 'text-gray-400'
          } ${open ? 'rotate-180 text-indigo-500' : ''}`}
        />
      </button>
      {open && (
        <div
          className={`absolute left-0 right-0 top-[calc(100%+6px)] z-[90] overflow-hidden rounded-xl border shadow-xl
            ${D
              ? 'bg-[#1a1a1a] border-indigo-500/40 shadow-black/50'
              : 'bg-white border-indigo-100 shadow-indigo-100/60'
            }`}
          style={{ animation: 'kcDropIn .14s ease-out' }}
        >
          <div className="max-h-56 overflow-y-auto py-1">
            {options.map((opt) => {
              const active = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2.5 text-xs transition-colors
                    ${active
                      ? D
                        ? 'bg-indigo-500/20 text-indigo-300 font-semibold'
                        : 'bg-indigo-50 text-indigo-600 font-semibold'
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
      <style>{`@keyframes kcDropIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}

function periodRange(preset: PeriodPreset, from: string, to: string): { from: string; to: string } {
  const now = new Date();
  if (preset === 'today') return { from: toIsoDate(now), to: toIsoDate(now) };
  if (preset === 'week') {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    const day = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - day);
    return { from: toIsoDate(d), to: toIsoDate(now) };
  }
  if (preset === 'month') {
    const d = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: toIsoDate(d), to: toIsoDate(now) };
  }
  return { from: from || toIsoDate(now), to: to || toIsoDate(now) };
}

export function AdminKirimChiqimTab({
  D, card, divider, sub, t, showBalances, selectedCompanyIds, viewOrg, onOpenOrder,
}: Props) {
  const { companies } = useCompanies();
  const [innerTab, setInnerTab] = useState<InnerTab>('overview');
  const [preset, setPreset] = useState<PeriodPreset>('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [branchId, setBranchId] = useState<string>('all');

  const [summary, setSummary] = useState<CashFlowSummary | null>(null);
  const [movements, setMovements] = useState<CashMovementDto[]>([]);
  const [groups, setGroups] = useState<CashFlowGroupNode[]>([]);
  const [groupsTotal, setGroupsTotal] = useState(0);
  const [profit, setProfit] = useState<SalesProfitResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fade, setFade] = useState(false);

  const [cashType, setCashType] = useState<'all' | 'income' | 'expense'>('all');
  const [cashMethod, setCashMethod] = useState('all');
  const [cashSearch, setCashSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'groups'>('list');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedOp, setSelectedOp] = useState<CashMovementDto | null>(null);

  const [profitSort, setProfitSort] = useState('grossProfit_desc');
  const [profitCategory, setProfitCategory] = useState('');
  const [profitSearch, setProfitSearch] = useState('');
  const [openProductId, setOpenProductId] = useState<string | null>(null);

  const [modal, setModal] = useState<null | { type: 'income' | 'expense' }>(null);
  const [form, setForm] = useState({
    amount: '', occurredAt: toIsoDate(new Date()), categoryPath: '',
    method: 'cash', counterparty: '', note: '', cashbox: '',
  });
  const [saving, setSaving] = useState(false);

  const reqSeq = useRef(0);
  const reduceMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  const companyIds = useMemo(() => {
    if (branchId !== 'all') return [branchId];
    if (viewOrg !== 'all') return [viewOrg];
    return Array.from(selectedCompanyIds);
  }, [branchId, viewOrg, selectedCompanyIds]);

  const branchOptions = useMemo(
    () => companies.filter((c) => selectedCompanyIds.has(c.id)),
    [companies, selectedCompanyIds],
  );

  const range = useMemo(
    () => periodRange(preset, customFrom, customTo),
    [preset, customFrom, customTo],
  );

  const [refreshOk, setRefreshOk] = useState(false);
  const refreshOkTimer = useRef<number | null>(null);

  const load = useCallback(async (): Promise<boolean> => {
    const seq = ++reqSeq.current;
    setLoading(true);
    setError(null);
    if (!reduceMotion) {
      setFade(true);
      window.setTimeout(() => { if (reqSeq.current === seq) setFade(false); }, 220);
    }
    try {
      const base = { companyIds, from: range.from, to: range.to };
      const [sum, mov, grp, prof] = await Promise.all([
        api.getCashFlowSummary(base),
        api.getCashFlowMovements({
          ...base,
          type: cashType,
          method: cashMethod,
          search: cashSearch || undefined,
          categoryPath: categoryFilter || undefined,
          page: 1,
          pageSize: 200,
        }),
        api.getCashFlowGroups({
          ...base,
          type: cashType === 'all' ? 'expense' : cashType,
          categoryPath: categoryFilter || undefined,
          search: cashSearch || undefined,
        }),
        api.getSalesProfit({
          ...base,
          productCategory: profitCategory || undefined,
          sort: profitSort,
        }),
      ]);
      if (seq !== reqSeq.current) return false;
      setSummary(sum);
      setMovements(mov.items);
      setGroups(grp.groups);
      setGroupsTotal(grp.total);
      setProfit(prof);
      return true;
    } catch (e: any) {
      if (seq !== reqSeq.current) return false;
      setError(e?.message || (t.kcError ?? 'Error'));
      setSummary(null);
      setMovements([]);
      setGroups([]);
      setProfit(null);
      return false;
    } finally {
      if (seq === reqSeq.current) setLoading(false);
    }
  }, [
    companyIds, range.from, range.to, cashType, cashMethod, cashSearch,
    categoryFilter, profitCategory, profitSort, reduceMotion, t.kcError,
  ]);

  const handleRefresh = useCallback(async () => {
    if (loading || refreshOk) return;
    setRefreshOk(false);
    if (refreshOkTimer.current) window.clearTimeout(refreshOkTimer.current);
    const ok = await load();
    if (!ok) return;
    setRefreshOk(true);
    refreshOkTimer.current = window.setTimeout(() => setRefreshOk(false), 1600);
  }, [load, loading, refreshOk]);

  useEffect(() => () => {
    if (refreshOkTimer.current) window.clearTimeout(refreshOkTimer.current);
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (viewOrg !== 'all') setBranchId(viewOrg);
    else setBranchId('all');
  }, [viewOrg]);

  const openCashWithCategory = (name: string) => {
    setCategoryFilter(name);
    setCashType('expense');
    setViewMode('groups');
    setInnerTab('cash');
  };

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    const title = [[t.kcTitle ?? 'Kirim-chiqim'], [`${range.from} — ${range.to}`], []];
    if (innerTab === 'profit' && profit) {
      const rows = [
        ...title,
        [t.kcProduct, t.kcQty, t.kcUnit, t.kcNetSales, t.kcCogs, t.kcGrossProfit, t.kcMargin],
        ...profit.rows.map((r) => [
          r.productName, r.qty, r.unit, r.netSales, r.cogs ?? '', r.grossProfit ?? '',
          r.marginPct == null ? (t.kcDash ?? '—') : `${r.marginPct.toFixed(1)}%`,
        ]),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Foyda');
    } else if (viewMode === 'groups') {
      const flat: any[][] = [...title, [t.kcCategory, t.kcAmount, t.kcQty]];
      const walk = (nodes: CashFlowGroupNode[], depth = 0) => {
        for (const n of nodes) {
          flat.push([`${'  '.repeat(depth)}${n.name}`, n.amount, n.count]);
          walk(n.children, depth + 1);
        }
      };
      walk(groups);
      flat.push([t.zatItogo ?? 'JAMI', groupsTotal, '']);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(flat), 'Guruhlar');
    } else {
      const rows = [
        ...title,
        [t.kcDate, t.kcType, t.kcCategory, t.kcCounterparty, t.kcMethod, t.kcAmount, t.kcNote],
        ...movements.map((m) => [
          m.occurredAt.slice(0, 10),
          m.type === 'income' ? (t.kcFilterIncome ?? 'Kirim') : (t.kcFilterExpense ?? 'Chiqim'),
          m.categoryPath ?? '',
          m.counterparty ?? '',
          m.method,
          m.amount,
          m.note ?? '',
        ]),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Harakat');
    }
    XLSX.writeFile(wb, `kirim-chiqim_${range.from}_${range.to}.xlsx`);
  };

  const saveMovement = async () => {
    const amount = Number(String(form.amount).replace(/\s/g, '').replace(',', '.'));
    if (!(amount > 0) || !modal) return;
    const companyId = companyIds[0] || Array.from(selectedCompanyIds)[0];
    if (!companyId) return;
    setSaving(true);
    try {
      await api.createCashMovement({
        companyId,
        type: modal.type,
        amount,
        occurredAt: new Date(form.occurredAt).toISOString(),
        categoryPath: form.categoryPath || null,
        method: form.method as any,
        cashbox: form.cashbox || null,
        counterparty: form.counterparty || null,
        note: form.note || null,
      });
      setModal(null);
      setForm({
        amount: '', occurredAt: toIsoDate(new Date()), categoryPath: '',
        method: 'cash', counterparty: '', note: '', cashbox: '',
      });
      await load();
    } catch (e: any) {
      setError(e?.message || (t.kcError ?? 'Error'));
    } finally {
      setSaving(false);
    }
  };

  const toggleExpand = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path); else next.add(path);
      return next;
    });
  };

  const filteredProfitRows = useMemo(() => {
    const q = profitSearch.trim().toLowerCase();
    if (!q || !profit) return profit?.rows ?? [];
    return profit.rows.filter((r) =>
      `${r.productName} ${r.productCode} ${r.category ?? ''}`.toLowerCase().includes(q),
    );
  }, [profit, profitSearch]);

  const chartData = (summary?.chart ?? []).map((d) => ({
    label: d.date.slice(5),
    income: d.income,
    expense: d.expense,
  }));

  const presets: { id: PeriodPreset; label: string }[] = [
    { id: 'today', label: t.kcToday ?? 'Bugun' },
    { id: 'week', label: t.kcThisWeek ?? 'Shu hafta' },
    { id: 'month', label: t.kcThisMonth ?? 'Shu oy' },
    { id: 'custom', label: t.kcCustomRange ?? 'Davr' },
  ];

  const tabs: { id: InnerTab; label: string }[] = [
    { id: 'overview', label: t.kcTabOverview ?? 'Umumiy' },
    { id: 'cash', label: t.kcTabCash ?? 'Pul harakati' },
    { id: 'profit', label: t.kcTabProfit ?? 'Sotuv foydasi' },
  ];

  const kpiClass = `rounded-2xl p-4 md:p-5 transition-[opacity,transform] ${
    reduceMotion ? '' : 'duration-200'
  } ${fade ? 'opacity-70' : 'opacity-100'} ${D ? 'bg-[#141414] border border-gray-800' : 'bg-white border border-gray-100 shadow-sm'}`;

  const renderGroup = (node: CashFlowGroupNode, depth = 0): ReactNode => {
    const open = expanded.has(node.path);
    const hasKids = node.children.length > 0 || node.operations.length > 0;
    return (
      <div key={node.path} className={divider}>
        <button
          type="button"
          onClick={() => hasKids && toggleExpand(node.path)}
          className={`w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-colors ${
            depth ? 'pl-' + Math.min(3 + depth * 3, 12) : ''
          }`}
          style={{ paddingLeft: 12 + depth * 14 }}
        >
          <span className={`transition-transform duration-200 ${open ? 'rotate-90' : ''}`}>
            {hasKids ? <ChevronRight size={14} className={sub} /> : <span className="w-3.5" />}
          </span>
          <span className="flex-1 min-w-0 font-medium truncate text-sm">{node.name}</span>
          <span className="text-[10px] tabular-nums opacity-50 mr-2">{node.count}</span>
          <span className="tabular-nums text-sm font-semibold text-rose-600">
            {showBalances ? fmt(node.amount) : '••••'}
          </span>
        </button>
        <div
          className={`overflow-hidden transition-[max-height,opacity] ${
            reduceMotion ? '' : 'duration-200'
          } ${open ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}
        >
          {node.children.map((c) => renderGroup(c, depth + 1))}
          {node.operations.map((op) => (
            <button
              key={op.id}
              type="button"
              onClick={() => setSelectedOp(op)}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs hover:bg-gray-50 dark:hover:bg-gray-900/40"
              style={{ paddingLeft: 28 + depth * 14 }}
            >
              <span className={`opacity-60 ${sub}`}>{op.occurredAt.slice(0, 10)}</span>
              <span className="flex-1 truncate">{op.counterparty || op.note || '—'}</span>
              <span className={`tabular-nums font-medium ${op.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                {showBalances ? fmt(op.amount) : '••••'}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 w-full">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight flex items-center gap-2">
            <Wallet size={22} className="text-indigo-600" />
            {t.kcTitle ?? 'Kirim-chiqim'}
          </h2>
          <p className={`text-xs mt-1 ${sub}`}>{range.from} — {range.to}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <KcSelect
            D={D}
            value={branchId}
            onChange={setBranchId}
            className="min-w-[140px]"
            options={[
              { value: 'all', label: t.kcAllBranches ?? 'Barcha filiallar' },
              ...branchOptions.map((c) => ({
                value: c.id,
                label: c.shortName || c.name,
              })),
            ]}
          />
          <div className={`flex rounded-xl p-0.5 border ${D ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
            {presets.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setPreset(p.id);
                  if (p.id === 'custom' && (!customFrom || !customTo)) {
                    const now = new Date();
                    const start = new Date(now.getFullYear(), now.getMonth(), 1);
                    setCustomFrom(toIsoDate(start));
                    setCustomTo(toIsoDate(now));
                  }
                }}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                  preset === p.id ? 'bg-indigo-600 text-white' : sub
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {preset === 'custom' && (
            <DateRangePicker
              from={customFrom}
              to={customTo}
              onChange={(f, t2) => {
                setCustomFrom(f);
                setCustomTo(t2);
              }}
              onClear={() => {
                const now = new Date();
                const start = new Date(now.getFullYear(), now.getMonth(), 1);
                setCustomFrom(toIsoDate(start));
                setCustomTo(toIsoDate(now));
              }}
              D={D}
              compact
              align="right"
            />
          )}
          <button
            type="button"
            onClick={() => void handleRefresh()}
            title={refreshOk ? (t.kcSave ?? 'OK') : (t.kcRetry ?? 'Yangilash')}
            aria-label="Yangilash"
            className={`h-9 w-9 rounded-xl flex items-center justify-center border transition-all duration-200
              ${refreshOk
                ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/30 scale-105'
                : D
                  ? 'border-gray-700 hover:border-indigo-500 hover:text-indigo-300'
                  : 'border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
              }`}
          >
            {refreshOk ? (
              <Check size={16} strokeWidth={2.6} className="animate-[kcCheckPop_.28s_ease-out]" />
            ) : (
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            )}
          </button>
          <style>{`@keyframes kcCheckPop{0%{opacity:0;transform:scale(.55)}70%{opacity:1;transform:scale(1.12)}100%{opacity:1;transform:scale(1)}}`}</style>
        </div>
      </div>

      {/* Inner tabs */}
      <div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setInnerTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold flex-shrink-0 transition-all ${
              innerTab === tab.id
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/20'
                : D ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 text-sm flex items-center justify-between gap-3">
          <span>{error}</span>
          <button type="button" onClick={() => void load()} className="font-semibold underline">{t.kcRetry}</button>
        </div>
      )}

      {/* OVERVIEW */}
      {innerTab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {[
              {
                key: 'in', label: t.kcIncome, value: summary?.incomeTotal,
                icon: ArrowDownRight, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30',
              },
              {
                key: 'out', label: t.kcExpense, value: summary?.expenseTotal,
                icon: ArrowUpRight, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-950/30',
              },
              {
                key: 'net', label: t.kcNetCash, value: summary?.netCash,
                icon: (summary?.netCash ?? 0) >= 0 ? ArrowDownRight : ArrowUpRight,
                color: (summary?.netCash ?? 0) >= 0 ? 'text-indigo-600' : 'text-rose-600',
                bg: 'bg-indigo-50 dark:bg-indigo-950/30',
              },
              {
                key: 'gp', label: t.kcGrossProfit, value: summary?.grossProfit,
                icon: ArrowUpRight, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-950/30',
              },
            ].map((k) => {
              const Icon = k.icon;
              return (
                <button
                  key={k.key}
                  type="button"
                  title={loading ? undefined : formatMoney(k.value, t)}
                  onClick={() => {
                    if (k.key === 'gp') setInnerTab('profit');
                    else { setCashType(k.key === 'in' ? 'income' : k.key === 'out' ? 'expense' : 'all'); setInnerTab('cash'); }
                  }}
                  className={`${kpiClass} text-left`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-[11px] font-medium ${sub}`}>{k.label}</span>
                    <span className={`w-8 h-8 rounded-xl flex items-center justify-center ${k.bg}`}>
                      <Icon size={16} className={k.color} />
                    </span>
                  </div>
                  <p className={`text-xl md:text-2xl font-bold tabular-nums tracking-tight ${k.color}`}>
                    {loading ? (
                      <span className={`inline-block h-7 w-24 rounded-lg animate-pulse ${D ? 'bg-gray-800' : 'bg-gray-100'}`} />
                    ) : (
                      formatShort(k.value ?? 0, t, showBalances)
                    )}
                  </p>
                  {!loading && showBalances && (
                    <p className={`text-[10px] mt-1 tabular-nums ${sub}`}>{formatMoney(k.value ?? 0, t)}</p>
                  )}
                </button>
              );
            })}
          </div>

          <div className="grid lg:grid-cols-5 gap-4">
            <div className={`lg:col-span-3 rounded-2xl p-4 md:p-5 ${card} border ${D ? 'border-gray-800' : 'border-gray-100'}`}>
              <h3 className="font-semibold text-sm mb-3">{t.kcChartTitle}</h3>
              {loading ? (
                <div className={`h-[220px] rounded-xl animate-pulse ${D ? 'bg-gray-800' : 'bg-gray-100'}`} />
              ) : chartData.length === 0 ? (
                <p className={`text-sm py-16 text-center ${sub}`}>{t.kcEmpty}</p>
              ) : (
                <MiniLineChart
                  data={chartData}
                  labelKey="label"
                  series={[
                    { key: 'income', name: t.kcFilterIncome ?? 'Kirim', color: '#059669' },
                    { key: 'expense', name: t.kcFilterExpense ?? 'Chiqim', color: '#e11d48' },
                  ]}
                  dark={D}
                  showDots
                  height={220}
                />
              )}
            </div>
            <div className={`lg:col-span-2 rounded-2xl p-4 md:p-5 ${card} border ${D ? 'border-gray-800' : 'border-gray-100'}`}>
              <h3 className="font-semibold text-sm mb-3">{t.kcTopGroups}</h3>
              <div className="space-y-2">
                {loading && Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className={`h-10 rounded-xl animate-pulse ${D ? 'bg-gray-800' : 'bg-gray-100'}`} />
                ))}
                {!loading && (summary?.topExpenseGroups?.length ?? 0) === 0 && (
                  <p className={`text-sm py-8 text-center ${sub}`}>{t.kcEmpty}</p>
                )}
                {!loading && summary?.topExpenseGroups.map((g) => {
                  const max = summary.topExpenseGroups[0]?.amount || 1;
                  return (
                    <button
                      key={g.name}
                      type="button"
                      onClick={() => openCashWithCategory(g.name)}
                      className={`w-full text-left rounded-xl px-3 py-2 border transition-colors ${
                        D ? 'border-gray-800 hover:border-indigo-700' : 'border-gray-100 hover:border-indigo-200'
                      }`}
                    >
                      <div className="flex justify-between text-xs mb-1.5 gap-2">
                        <span className="font-medium truncate">{g.name}</span>
                        <span className="tabular-nums font-semibold text-rose-600 flex-shrink-0">
                          {showBalances ? fmt(g.amount) : '••••'}
                        </span>
                      </div>
                      <div className={`h-1.5 rounded-full overflow-hidden ${D ? 'bg-gray-800' : 'bg-gray-100'}`}>
                        <div className="h-full rounded-full bg-rose-500" style={{ width: `${Math.max(6, (g.amount / max) * 100)}%` }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CASH */}
      {innerTab === 'cash' && (
        <div className="space-y-4">
          <div className={`rounded-2xl border p-3 flex flex-col gap-2 md:flex-row md:items-center md:flex-wrap ${D ? 'border-gray-800 bg-[#121212]' : 'border-gray-100 bg-white'}`}>
            <div className="flex gap-1">
              {(['all', 'income', 'expense'] as const).map((x) => (
                <button key={x} type="button" onClick={() => setCashType(x)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold ${
                    cashType === x ? 'bg-indigo-600 text-white' : D ? 'bg-gray-800' : 'bg-gray-100'
                  }`}>
                  {x === 'all' ? t.kcFilterAll : x === 'income' ? t.kcFilterIncome : t.kcFilterExpense}
                </button>
              ))}
            </div>
            <input
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              placeholder={t.kcCategory}
              className={`h-9 px-3 rounded-xl text-xs border flex-1 min-w-[120px] ${D ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}
            />
            <KcSelect
              D={D}
              value={cashMethod}
              onChange={setCashMethod}
              className="min-w-[132px]"
              options={[
                { value: 'all', label: t.kcCashbox ?? 'Kassa/bank' },
                { value: 'cash', label: t.kcMethodCash ?? 'Naqd' },
                { value: 'terminal', label: t.kcMethodTerminal ?? 'Terminal' },
                { value: 'bank', label: t.kcMethodBank ?? 'Bank' },
                { value: 'other', label: t.kcMethodOther ?? 'Boshqa' },
              ]}
            />
            <div className="relative flex-1 min-w-[140px]">
              <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${sub}`} />
              <input value={cashSearch} onChange={(e) => setCashSearch(e.target.value)} placeholder={t.kcSearch}
                className={`h-9 w-full pl-8 pr-3 rounded-xl text-xs border ${D ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`} />
            </div>
            <div className="flex gap-1 ml-auto flex-wrap">
              <button type="button" onClick={() => setViewMode(viewMode === 'list' ? 'groups' : 'list')}
                className={`h-9 px-3 rounded-xl text-[11px] font-semibold border ${D ? 'border-gray-700' : 'border-gray-200'}`}>
                {viewMode === 'list' ? t.kcGroupsView : t.kcListView}
              </button>
              <button type="button" onClick={() => setModal({ type: 'income' })}
                className="h-9 px-3 rounded-xl text-[11px] font-semibold bg-emerald-600 text-white flex items-center gap-1">
                <Plus size={13} /> {t.kcAddIncome}
              </button>
              <button type="button" onClick={() => setModal({ type: 'expense' })}
                className="h-9 px-3 rounded-xl text-[11px] font-semibold bg-rose-600 text-white flex items-center gap-1">
                <Plus size={13} /> {t.kcAddExpense}
              </button>
              <button type="button" onClick={exportExcel}
                className="h-9 px-3 rounded-xl text-[11px] font-semibold bg-indigo-600 text-white flex items-center gap-1">
                <Download size={13} /> {t.kcExcel}
              </button>
            </div>
          </div>

          <div className="flex gap-4">
            <div className={`flex-1 min-w-0 rounded-2xl border overflow-hidden ${D ? 'border-gray-800' : 'border-gray-100'} ${card}`}>
              {loading ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className={`h-10 rounded-xl animate-pulse ${D ? 'bg-gray-800' : 'bg-gray-100'}`} />
                  ))}
                </div>
              ) : viewMode === 'groups' ? (
                groups.length === 0 ? (
                  <p className={`text-sm py-16 text-center ${sub}`}>{t.kcEmpty}</p>
                ) : (
                  <div>
                    <div className="px-4 py-3 flex justify-between text-xs font-semibold border-b border-inherit">
                      <span>{t.kcGroupsView}</span>
                      <span className="tabular-nums text-rose-600">{showBalances ? formatMoney(groupsTotal, t) : '••••'}</span>
                    </div>
                    {groups.map((g) => renderGroup(g))}
                  </div>
                )
              ) : movements.length === 0 ? (
                <p className={`text-sm py-16 text-center ${sub}`}>{t.kcEmpty}</p>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className={`${D ? 'bg-gray-900/60' : 'bg-gray-50'} ${sub}`}>
                          <th className="text-left px-3 py-2.5 font-semibold">{t.kcDate}</th>
                          <th className="text-left px-3 py-2.5 font-semibold">{t.kcType}</th>
                          <th className="text-left px-3 py-2.5 font-semibold">{t.kcCategory}</th>
                          <th className="text-left px-3 py-2.5 font-semibold">{t.kcCounterparty}</th>
                          <th className="text-left px-3 py-2.5 font-semibold">{t.kcMethod}</th>
                          <th className="text-right px-3 py-2.5 font-semibold">{t.kcAmount}</th>
                          <th className="text-left px-3 py-2.5 font-semibold">{t.kcNote}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {movements.map((m) => (
                          <tr key={m.id} onClick={() => setSelectedOp(m)}
                            className={`border-t cursor-pointer ${D ? 'border-gray-800 hover:bg-gray-900/40' : 'border-gray-50 hover:bg-indigo-50/40'}`}>
                            <td className="px-3 py-2.5 tabular-nums whitespace-nowrap">{m.occurredAt.slice(0, 10)}</td>
                            <td className="px-3 py-2.5">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                                m.type === 'income' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                              }`}>
                                {m.type === 'income' ? t.kcFilterIncome : t.kcFilterExpense}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 max-w-[180px] truncate">{m.categoryPath || '—'}</td>
                            <td className="px-3 py-2.5 max-w-[140px] truncate">{m.counterparty || '—'}</td>
                            <td className="px-3 py-2.5">{m.method}</td>
                            <td className={`px-3 py-2.5 text-right tabular-nums font-semibold ${m.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {showBalances ? fmtFull(m.amount) : '••••'}
                            </td>
                            <td className="px-3 py-2.5 max-w-[160px] truncate opacity-70">{m.note || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Mobile cards */}
                  <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
                    {movements.map((m) => (
                      <button key={m.id} type="button" onClick={() => setSelectedOp(m)}
                        className="w-full text-left px-3 py-3 space-y-1">
                        <div className="flex justify-between gap-2">
                          <span className="text-[11px] opacity-60">{m.occurredAt.slice(0, 10)}</span>
                          <span className={`text-sm font-bold tabular-nums ${m.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {showBalances ? fmt(m.amount) : '••••'}
                          </span>
                        </div>
                        <p className="text-sm font-medium truncate">{m.categoryPath || m.counterparty || '—'}</p>
                        <p className={`text-[11px] ${sub} truncate`}>{m.note || m.method}</p>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Detail panel desktop */}
            {selectedOp && (
              <div className={`hidden lg:block w-80 flex-shrink-0 rounded-2xl border p-4 ${card} ${D ? 'border-gray-800' : 'border-gray-100'}`}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-sm">{t.kcTabCash}</h4>
                  <button type="button" onClick={() => setSelectedOp(null)}><X size={16} /></button>
                </div>
                <dl className="space-y-2 text-xs">
                  {[
                    [t.kcDate, selectedOp.occurredAt.slice(0, 19).replace('T', ' ')],
                    [t.kcType, selectedOp.type === 'income' ? t.kcFilterIncome : t.kcFilterExpense],
                    [t.kcCategory, selectedOp.categoryPath || '—'],
                    [t.kcCounterparty, selectedOp.counterparty || '—'],
                    [t.kcMethod, selectedOp.method],
                    [t.kcAmount, formatMoney(selectedOp.amount, t)],
                    [t.kcNote, selectedOp.note || '—'],
                  ].map(([k, v]) => (
                    <div key={String(k)} className="flex justify-between gap-3">
                      <dt className={sub}>{k}</dt>
                      <dd className="font-medium text-right break-all">{v}</dd>
                    </div>
                  ))}
                </dl>
                {selectedOp.orderId && (
                  <button
                    type="button"
                    onClick={() => onOpenOrder?.(selectedOp.orderId!)}
                    className="mt-4 w-full h-9 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
                  >
                    {t.kcOpenOrder}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PROFIT */}
      {innerTab === 'profit' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: t.kcNetSales, value: profit?.totals.netSales, color: 'text-indigo-600' },
              { label: t.kcCogs, value: profit?.totals.cogs, color: 'text-amber-600' },
              { label: t.kcGrossProfit, value: profit?.totals.grossProfit, color: 'text-emerald-600' },
              {
                label: t.kcMargin,
                value: profit?.totals.marginPct,
                color: 'text-violet-600',
                isPct: true,
              },
            ].map((k) => (
              <div key={k.label} className={kpiClass}>
                <p className={`text-[11px] mb-2 ${sub}`}>{k.label}</p>
                <p className={`text-xl font-bold tabular-nums ${k.color}`}>
                  {loading ? (
                    <span className={`inline-block h-7 w-20 rounded-lg animate-pulse ${D ? 'bg-gray-800' : 'bg-gray-100'}`} />
                  ) : (k as any).isPct ? (
                    k.value == null ? (t.kcDash ?? '—') : `${Number(k.value).toFixed(1)}%`
                  ) : (
                    formatShort(k.value as number, t, showBalances)
                  )}
                </p>
              </div>
            ))}
          </div>

          {profit && profit.totals.missingCostLines > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-800 px-3 py-2 text-xs">
              {t.kcCostMissing}: {profit.totals.missingCostLines} {t.kcMissingLines}
              {' · '}{t.kcPartialProfit}
            </div>
          )}

          <div className={`rounded-2xl border p-3 flex flex-wrap gap-2 ${D ? 'border-gray-800' : 'border-gray-100'}`}>
            <input value={profitSearch} onChange={(e) => setProfitSearch(e.target.value)} placeholder={t.kcProduct}
              className={`h-9 px-3 rounded-xl text-xs border flex-1 min-w-[140px] ${D ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`} />
            <input value={profitCategory} onChange={(e) => setProfitCategory(e.target.value)} placeholder={t.kcCategory}
              className={`h-9 px-3 rounded-xl text-xs border min-w-[120px] ${D ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`} />
            <KcSelect
              D={D}
              value={profitSort}
              onChange={setProfitSort}
              className="min-w-[180px]"
              options={[
                { value: 'grossProfit_desc', label: `${t.kcGrossProfit ?? 'Foyda'} ↓` },
                { value: 'grossProfit_asc', label: `${t.kcGrossProfit ?? 'Foyda'} ↑` },
                { value: 'netSales_desc', label: `${t.kcNetSales ?? 'Sof sotuv'} ↓` },
                { value: 'margin_desc', label: `${t.kcMargin ?? 'Marja'} ↓` },
                { value: 'name', label: t.kcProduct ?? 'Mahsulot' },
              ]}
            />
            <button type="button" onClick={exportExcel}
              className="h-9 px-3 rounded-xl text-[11px] font-semibold bg-indigo-600 text-white flex items-center gap-1">
              <Download size={13} /> {t.kcExcel}
            </button>
          </div>

          <div className={`rounded-2xl border overflow-hidden ${card} ${D ? 'border-gray-800' : 'border-gray-100'}`}>
            {loading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className={`h-10 rounded-xl animate-pulse ${D ? 'bg-gray-800' : 'bg-gray-100'}`} />
                ))}
              </div>
            ) : filteredProfitRows.length === 0 ? (
              <p className={`text-sm py-16 text-center ${sub}`}>{t.kcEmpty}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[720px]">
                  <thead>
                    <tr className={`${D ? 'bg-gray-900/60' : 'bg-gray-50'} ${sub}`}>
                      <th className="text-left px-3 py-2.5">{t.kcProduct}</th>
                      <th className="text-right px-3 py-2.5">{t.kcQty}</th>
                      <th className="text-left px-3 py-2.5">{t.kcUnit}</th>
                      <th className="text-right px-3 py-2.5">{t.kcNetSales}</th>
                      <th className="text-right px-3 py-2.5">{t.kcCogs}</th>
                      <th className="text-right px-3 py-2.5">{t.kcGrossProfit}</th>
                      <th className="text-right px-3 py-2.5">{t.kcMargin}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProfitRows.map((r) => (
                      <Fragment key={r.productId}>
                        <tr
                          onClick={() => setOpenProductId(openProductId === r.productId ? null : r.productId)}
                          className={`border-t cursor-pointer ${D ? 'border-gray-800 hover:bg-gray-900/40' : 'border-gray-50 hover:bg-indigo-50/40'}`}>
                          <td className="px-3 py-2.5 font-medium">
                            <span className="inline-flex items-center gap-1">
                              <ChevronDown size={12} className={`transition-transform ${openProductId === r.productId ? 'rotate-180' : ''}`} />
                              {r.productName}
                            </span>
                            {r.costMissing && (
                              <span className="ml-2 text-[10px] text-amber-600">{t.kcCostMissing}</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums">{r.qty}</td>
                          <td className="px-3 py-2.5">{r.unit}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums">{showBalances ? fmtFull(r.netSales) : '••••'}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            {r.cogs == null ? (t.kcDash ?? '—') : showBalances ? fmtFull(r.cogs) : '••••'}
                          </td>
                          <td className={`px-3 py-2.5 text-right tabular-nums font-semibold ${
                            (r.grossProfit ?? 0) < 0 ? 'text-rose-600' : 'text-emerald-600'
                          }`}>
                            {r.grossProfit == null ? (t.kcDash ?? '—') : showBalances ? fmtFull(r.grossProfit) : '••••'}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            {r.marginPct == null ? (t.kcDash ?? '—') : `${r.marginPct.toFixed(1)}%`}
                          </td>
                        </tr>
                        {openProductId === r.productId && r.lines.map((l, idx) => (
                          <tr key={`${r.productId}-${l.orderId}-${idx}`} className={`${D ? 'bg-gray-950/40' : 'bg-gray-50/80'}`}>
                            <td className="px-3 py-2 pl-8" colSpan={2}>
                              <button type="button" className="text-indigo-600 underline"
                                onClick={() => onOpenOrder?.(l.orderId)}>
                                {l.orderId.slice(0, 8)}…
                              </button>
                              <span className={`ml-2 ${sub}`}>{l.deliveredAt?.slice(0, 10)}</span>
                            </td>
                            <td className="px-3 py-2">{l.qty}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{fmtFull(l.netSales)}</td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {l.costMissing ? (t.kcCostMissing) : l.cogs == null ? (t.kcDash ?? '—') : fmtFull(l.cogs)}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums" colSpan={2}>
                              {l.grossProfit == null ? (t.kcDash ?? '—') : fmtFull(l.grossProfit)}
                            </td>
                          </tr>
                        ))}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile detail sheet */}
      {selectedOp && (
        <div className="lg:hidden fixed inset-0 z-[240] flex items-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedOp(null)} />
          <div className={`relative w-full rounded-t-3xl p-5 max-h-[70vh] overflow-y-auto ${D ? 'bg-[#161616]' : 'bg-white'}`}>
            <div className="flex justify-between mb-3">
              <h4 className="font-semibold">{t.kcTabCash}</h4>
              <button type="button" onClick={() => setSelectedOp(null)}><X size={18} /></button>
            </div>
            <p className="text-2xl font-bold tabular-nums mb-3">{formatMoney(selectedOp.amount, t)}</p>
            <p className={`text-sm ${sub}`}>{selectedOp.categoryPath || '—'}</p>
            <p className="text-sm mt-1">{selectedOp.counterparty || selectedOp.note || '—'}</p>
            {selectedOp.orderId && (
              <button type="button" onClick={() => onOpenOrder?.(selectedOp.orderId!)}
                className="mt-4 w-full h-11 rounded-xl bg-indigo-600 text-white text-sm font-semibold">
                {t.kcOpenOrder}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Add modal */}
      {modal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setModal(null)} />
          <div className={`relative w-full max-w-md rounded-3xl p-5 shadow-2xl ${D ? 'bg-[#161616]' : 'bg-white'}`}>
            <h3 className="font-bold text-lg mb-4">
              {modal.type === 'income' ? t.kcAddIncome : t.kcAddExpense}
            </h3>
            <div className="space-y-3">
              <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder={t.kcAmount}
                className={`w-full h-11 px-3 rounded-xl border text-sm ${D ? 'bg-gray-900 border-gray-700' : 'border-gray-200'}`} />
              <input type="date" value={form.occurredAt} onChange={(e) => setForm({ ...form, occurredAt: e.target.value })}
                className={`w-full h-11 px-3 rounded-xl border text-sm ${D ? 'bg-gray-900 border-gray-700' : 'border-gray-200'}`} />
              <input value={form.categoryPath} onChange={(e) => setForm({ ...form, categoryPath: e.target.value })}
                placeholder={`${t.kcCategory} (Ofis / Ofisga / Isuzu)`}
                className={`w-full h-11 px-3 rounded-xl border text-sm ${D ? 'bg-gray-900 border-gray-700' : 'border-gray-200'}`} />
              <input value={form.counterparty} onChange={(e) => setForm({ ...form, counterparty: e.target.value })}
                placeholder={t.kcCounterparty}
                className={`w-full h-11 px-3 rounded-xl border text-sm ${D ? 'bg-gray-900 border-gray-700' : 'border-gray-200'}`} />
              <KcSelect
                D={D}
                size="md"
                value={form.method}
                onChange={(v) => setForm({ ...form, method: v })}
                options={[
                  { value: 'cash', label: t.kcMethodCash ?? 'Naqd' },
                  { value: 'terminal', label: t.kcMethodTerminal ?? 'Terminal' },
                  { value: 'bank', label: t.kcMethodBank ?? 'Bank' },
                  { value: 'other', label: t.kcMethodOther ?? 'Boshqa' },
                ]}
              />
              <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder={t.kcNote} rows={2}
                className={`w-full px-3 py-2 rounded-xl border text-sm ${D ? 'bg-gray-900 border-gray-700' : 'border-gray-200'}`} />
            </div>
            <div className="flex gap-2 mt-5">
              <button type="button" onClick={() => setModal(null)}
                className={`flex-1 h-11 rounded-xl font-semibold text-sm border ${D ? 'border-gray-700' : 'border-gray-200'}`}>
                {t.kcCancel}
              </button>
              <button type="button" disabled={saving} onClick={() => void saveMovement()}
                className="flex-1 h-11 rounded-xl font-semibold text-sm bg-indigo-600 text-white disabled:opacity-50">
                {saving ? '...' : t.kcSave}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
