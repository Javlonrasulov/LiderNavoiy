import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import React from 'react';
import { Plus, X, Search, ChevronRight, ChevronLeft, Check, AlertCircle, Calendar, Edit3, ChevronDown, ChevronUp, ArrowLeft, BarChart2 } from 'lucide-react';
import { type AgentRow, fmt } from '../../../data/adminData';
import { api, type Distributor } from '../../../api/client';
import {
  type PlanCat,
  DEFAULT_PLAN_CATS,
  fetchPlanCategories,
  emptyCatAmounts,
  sumCatAmounts,
  toKey,
} from '../../../utils/planCategories';
import {
  type PlanUnit,
  PLAN_UNITS,
  planUnitLabel,
  normalizePlanUnit,
} from '../../../utils/planUnits';

function hasApiToken(): boolean {
  return typeof localStorage !== 'undefined' && !!localStorage.getItem('api_access_token');
}

function stableAgentId(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (Math.imul(31, h) + key.charCodeAt(i)) | 0;
  return Math.abs(h) || 1;
}

function nameInitials(name: string): string {
  return name.split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'AG';
}

function isDeliveryPosition(position?: string | null): boolean {
  const p = (position ?? '').toLowerCase();
  return p.includes('delivery') || p.includes('yetkaz') || p.includes('kuryer')
    || p.includes('dostav') || p.includes('haydov');
}

function distributorToAgentRow(d: Distributor): AgentRow {
  const name = d.user?.fullName?.trim() || d.user?.username || 'Agent';
  const active = d.user?.isActive !== false;
  return {
    id: stableAgentId(d.userId || d.id),
    name,
    avatar: nameInitials(name),
    clients: 0,
    visits: 0,
    sales: 0,
    payments: 0,
    debt: 0,
    plan: 0,
    status: active ? 'active' : 'inactive',
    orgId: d.companyId || '',
    phone: d.phone?.trim() || '',
    backendUserId: d.userId,
    distributorId: d.id,
  };
}

/** Toshkent vaqti bo'yicha joriy yil/oy (backend bilan bir xil). */
function getTashkentYearMonth(): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tashkent',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());
  return {
    year: Number(parts.find(p => p.type === 'year')?.value),
    month: Number(parts.find(p => p.type === 'month')?.value),
  };
}

function addCalendarMonth(year: number, month: number, delta = 1): { year: number; month: number } {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

type BackendPlanView = Awaited<ReturnType<typeof api.listAgentPlans>>[number];
type AgentPlanDisplayData = {
  planSum: number;
  doneSum: number;
  donePct: number;
  remaining: number;
  unit: PlanUnit;
  cats: {
    key: string;
    name: string;
    color: string;
    plan: number;
    done: number;
    pct: number;
    products?: Array<{ productId: string; productName: string; plan: number; done: number; pct: number }>;
  }[];
  monthKind?: 'current' | 'next';
};

type StoredBackendPlan = BackendPlanView & { monthKind: 'current' | 'next' };

function planDataFromBackend(bp: StoredBackendPlan): AgentPlanDisplayData {
  const planSum = Number(bp.totalPlan);
  const doneSum = Number(bp.totalDone);
  return {
    planSum,
    doneSum,
    donePct: bp.donePct,
    remaining: planSum - doneSum,
    unit: normalizePlanUnit(bp.unit),
    monthKind: bp.monthKind,
    cats: bp.categories.map(c => ({
      key: c.key,
      name: c.name,
      color: c.color,
      plan: Number(c.plan),
      done: Number(c.done),
      pct: c.pct,
      products: c.products?.map(p => ({
        productId: p.productId,
        productName: p.productName,
        plan: Number(p.plan),
        done: Number(p.done),
        pct: p.pct,
      })),
    })),
  };
}

function emptyPlanData(planCats: PlanCat[]): AgentPlanDisplayData {
  return {
    planSum: 0,
    doneSum: 0,
    donePct: 0,
    remaining: 0,
    unit: 'som',
    cats: planCats.map(c => ({ ...c, plan: 0, done: 0, pct: 0 })),
  };
}

function mergePlanMaps(
  current: BackendPlanView[],
  next: BackendPlanView[],
): Map<string, StoredBackendPlan> {
  const map = new Map<string, StoredBackendPlan>();
  for (const p of next) map.set(p.distributorId, { ...p, monthKind: 'next' });
  for (const p of current) map.set(p.distributorId, { ...p, monthKind: 'current' });
  return map;
}

// ─── Multi-segment donut ───────────────────────────────────────────────────────
function MultiDonut({ cats, pct, size = 140, stroke = 16, dark }: {
  cats: { color: string; pct: number; plan: number; done: number }[];
  pct: number; size?: number; stroke?: number; dark: boolean;
}) {
  const r    = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const cx   = size / 2;
  const bg   = dark ? '#1e1e1e' : '#f1f5f9';
  const pc   = pct >= 80 ? '#10b981' : pct >= 60 ? '#6366f1' : pct >= 40 ? '#f59e0b' : '#ef4444';
  const totalDone = cats.reduce((s, c) => s + c.done, 0);
  let accLen = 0;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke={bg} strokeWidth={stroke} />
        {cats.map((cat, i) => {
          const share = totalDone > 0 ? cat.done / totalDone : 1 / cats.length;
          const len   = Math.max(share * circ - 1.5, 0);
          const off   = -accLen;
          accLen += share * circ;
          return (
            <circle key={i} cx={cx} cy={cx} r={r} fill="none"
              stroke={cat.color} strokeWidth={stroke}
              strokeDasharray={`${len} ${circ}`} strokeDashoffset={off} strokeLinecap="butt" />
          );
        })}
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size >= 100 ? 16 : 12, fontWeight: 900, color: pc,
      }}>{pct}%</div>
    </div>
  );
}

// ─── Mini progress bar ─────────────────────────────────────────────────────────
function MiniBar({ pct, color, dark }: { pct: number; color: string; dark: boolean }) {
  return (
    <div style={{ height: 7, borderRadius: 6, background: dark ? '#1e1e1e' : '#f1f5f9', overflow: 'hidden', flex: 1 }}>
      <div style={{ height: '100%', borderRadius: 6, background: color, width: `${Math.min(pct, 100)}%`, transition: 'width 0.6s cubic-bezier(.4,0,.2,1)' }} />
    </div>
  );
}

// ─── Number input helper ───────────────────────────────────────────────────────
function parseNum(v: string) {
  const cleaned = v.replace(/\s/g, '').replace(/,/g, '.').replace(/[^0-9.]/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}
function fmtInput(n: number) {
  if (!n) return '';
  if (Number.isInteger(n)) return n.toLocaleString('ru-RU');
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 3 });
}

// ─── Plan Set Modal ────────────────────────────────────────────────────────────
type PlanProductLite = { id: string; name: string; category: string; categoryKey: string };

interface PlanEntry {
  total: number;
  cats: Record<string, number>;
  monthType: 'current' | 'next';
  unit: PlanUnit;
  products: Array<{ productId: string; productName: string; categoryKey: string; amount: number }>;
}

function PlanModal({ agents, planCats, dark, t, onClose, onSave, companyId }: {
  agents: AgentRow[];
  planCats: PlanCat[];
  dark: boolean;
  t: Record<string, string>;
  onClose: () => void;
  onSave: (agent: AgentRow, entry: PlanEntry) => void;
  companyId?: string;
}) {
  const [step, setStep]               = useState<'agent' | 'form'>('agent');
  const [search, setSearch]           = useState('');
  const [selectedAgent, setSelected]  = useState<AgentRow | null>(null);
  const [monthType, setMonthType]     = useState<'current' | 'next'>('current');
  const [unit, setUnit]               = useState<PlanUnit>('som');
  const [totalStr, setTotalStr]       = useState('');
  const [catStr, setCatStr]           = useState<Record<string, string>>(() => emptyCatAmounts(planCats));
  const [prodStr, setProdStr]         = useState<Record<string, string>>({});
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [allProducts, setAllProducts] = useState<PlanProductLite[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setCatStr(emptyCatAmounts(planCats)); }, [planCats]);
  useEffect(() => { if (step === 'agent') searchRef.current?.focus(); }, [step]);

  useEffect(() => {
    if (step !== 'form' || !hasApiToken()) return;
    let cancelled = false;
    setLoadingProducts(true);
    api.getProducts(undefined, companyId)
      .then(rows => {
        if (cancelled) return;
        setAllProducts(
          rows
            .filter(p => p.isActive !== false)
            .map(p => ({
              id: p.id,
              name: p.name,
              category: p.category || '',
              categoryKey: toKey(p.category || 'OTHER'),
            })),
        );
      })
      .catch(() => { if (!cancelled) setAllProducts([]); })
      .finally(() => { if (!cancelled) setLoadingProducts(false); });
    return () => { cancelled = true; };
  }, [step, companyId]);

  const bg      = dark ? '#0f0f0f' : '#ffffff';
  const overlay = 'rgba(0,0,0,0.55)';
  const border  = dark ? '#222' : '#e5e7eb';
  const txt     = dark ? '#e5e7eb' : '#111827';
  const sub     = dark ? '#6b7280' : '#9ca3af';
  const inp     = dark ? '#161616' : '#f8fafc';
  const inpBdr  = dark ? '#2a2a2a' : '#e5e7eb';
  const hov     = dark ? '#161616' : '#f8fafc';
  const unitLbl = planUnitLabel(unit, t);

  const filtered = agents.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase())
  );

  const productsByCat = useMemo(() => {
    const map = new Map<string, PlanProductLite[]>();
    for (const p of allProducts) {
      const matched = planCats.find(
        c => c.key === p.categoryKey || toKey(c.name) === p.categoryKey || c.name.toLowerCase() === p.category.toLowerCase(),
      );
      const key = matched?.key ?? p.categoryKey;
      const list = map.get(key) ?? [];
      list.push({ ...p, categoryKey: key });
      map.set(key, list);
    }
    return map;
  }, [allProducts, planCats]);

  /** Kategoriya mahsulotlardan to'ldirilgan bo'lsa — kategoriya sum = mahsulotlar yig'indisi */
  const catHasProducts = useCallback((catKey: string) => {
    const prods = productsByCat.get(catKey) ?? [];
    return prods.some(p => parseNum(prodStr[p.id] || '') > 0);
  }, [productsByCat, prodStr]);

  const effectiveCatStr = useMemo(() => {
    const next = { ...catStr };
    for (const cat of planCats) {
      if (!catHasProducts(cat.key)) continue;
      const sum = (productsByCat.get(cat.key) ?? []).reduce(
        (s, p) => s + parseNum(prodStr[p.id] || ''),
        0,
      );
      next[cat.key] = fmtInput(sum);
    }
    return next;
  }, [catStr, planCats, catHasProducts, productsByCat, prodStr]);

  const total     = parseNum(totalStr);
  const catNums   = Object.fromEntries(planCats.map(c => [c.key, parseNum(effectiveCatStr[c.key] || '')]));
  const catTotal  = sumCatAmounts(planCats, effectiveCatStr);
  const diff      = total - catTotal;
  const diffAbs   = Math.abs(diff);
  const isValid   = total > 0 && Math.abs(diff) < 0.001;
  const hasTotal  = total > 0;

  const now       = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const months    = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr'];
  const curLabel  = `${months[now.getMonth()]} ${now.getFullYear()}`;
  const nxtLabel  = `${months[nextMonth.getMonth()]} ${nextMonth.getFullYear()}`;

  function toggleCat(key: string) {
    setExpandedCats(prev => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key); else n.add(key);
      return n;
    });
  }

  function setProductAmount(productId: string, catKey: string, raw: string) {
    const n = parseNum(raw);
    setProdStr(prev => ({ ...prev, [productId]: fmtInput(n) }));
    // Kategoriya maydonini mahsulotlardan qayta hisoblash effectiveCatStr orqali
    void catKey;
  }

  function handleSave() {
    if (!selectedAgent || !isValid) return;
    const products: PlanEntry['products'] = [];
    for (const [catKey, list] of productsByCat) {
      for (const p of list) {
        const amount = parseNum(prodStr[p.id] || '');
        if (amount > 0) {
          products.push({
            productId: p.id,
            productName: p.name,
            categoryKey: catKey,
            amount,
          });
        }
      }
    }
    onSave(selectedAgent, {
      total,
      cats: catNums,
      monthType,
      unit,
      products,
    });
    onClose();
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: overlay, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: bg, borderRadius: 24, border: `1px solid ${border}`,
        width: '100%', maxWidth: 460, maxHeight: '90vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.28)',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 22px 16px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: txt }}>
              {step === 'agent' ? (t.planSelectAgent || 'Agent tanlash') : (t.planSetBtn || "Plan qo'yish")}
            </div>
            {step === 'form' && selectedAgent && (
              <div style={{ fontSize: 12, color: sub, marginTop: 2 }}>
                {selectedAgent.name}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {step === 'form' && (
              <button onClick={() => setStep('agent')} style={{
                padding: '6px 12px', borderRadius: 10, border: `1px solid ${border}`,
                background: 'transparent', color: sub, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}>{t.planBack || '← Orqaga'}</button>
            )}
            <button onClick={onClose} style={{
              width: 32, height: 32, borderRadius: 10, border: 'none',
              background: dark ? '#1a1a1a' : '#f1f5f9', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: sub,
            }}><X size={15} /></button>
          </div>
        </div>

        {/* ── STEP 1: Agent select ── */}
        {step === 'agent' && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            {/* Search */}
            <div style={{ padding: '14px 22px 10px', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: inp, border: `1px solid ${inpBdr}`, borderRadius: 12, padding: '10px 14px' }}>
                <Search size={15} color={sub} />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={t.planSearchAgent || 'Agent qidirish...'}
                  style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 14, color: txt, flex: 1, width: 0 }}
                />
                {search && <button onClick={() => setSearch('')} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: sub, display: 'flex' }}><X size={13} /></button>}
              </div>
            </div>
            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 14px 14px' }}>
              {filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 32, color: sub, fontSize: 13 }}>{t.planAgentNotFound || 'Agent topilmadi'}</div>
              ) : filtered.map(agent => {
                const initials = agent.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <button key={agent.id} onClick={() => { setSelected(agent); setStep('form'); }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                      padding: '11px 12px', borderRadius: 12, border: 'none',
                      background: 'transparent', cursor: 'pointer', textAlign: 'left',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = hov)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{
                      width: 38, height: 38, borderRadius: 11, flexShrink: 0,
                      background: '#6366f11a', border: '1.5px solid #6366f140',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 800, color: '#6366f1',
                    }}>{initials}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: txt, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{agent.name}</div>
                      <div style={{ fontSize: 11, color: sub, marginTop: 1 }}>{agent.phone || 'Agent'}</div>
                    </div>
                    <ChevronRight size={15} color={sub} />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── STEP 2: Plan form ── */}
        {step === 'form' && selectedAgent && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px' }}>

            {/* Month type toggle */}
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: sub, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t.planSelectMonth || 'Oy tanlash'}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {([['current', Edit3, curLabel, t.planEditCurrent || "Hozirgisini o'zgartirish"],
                   ['next',    Calendar, nxtLabel, t.planForNext || 'Keyingi oy uchun']] as const).map(([val, Icon, label, desc]) => {
                  const active = monthType === val;
                  return (
                    <button key={val} onClick={() => setMonthType(val)} style={{
                      padding: '12px 14px', borderRadius: 14, cursor: 'pointer', textAlign: 'left',
                      border: `2px solid ${active ? '#6366f1' : inpBdr}`,
                      background: active ? '#6366f10f' : inp,
                      transition: 'all 0.15s',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                        <Icon size={14} color={active ? '#6366f1' : sub} />
                        <span style={{ fontSize: 13, fontWeight: 800, color: active ? '#6366f1' : txt }}>{label}</span>
                      </div>
                      <div style={{ fontSize: 11, color: sub }}>{desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Unit selector */}
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: sub, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t.planSelectUnit || 'Birlik'}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {PLAN_UNITS.map(u => {
                  const active = unit === u.id;
                  const label = u.id === 'som' ? (t.som || u.label)
                    : u.id === 'kg' ? (t.planUnitKg || u.label)
                    : u.id === 'ton' ? (t.planUnitTon || u.label)
                    : (t.planUnitDona || u.label);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setUnit(u.id)}
                      style={{
                        padding: '10px 6px', borderRadius: 12, cursor: 'pointer',
                        border: `2px solid ${active ? '#6366f1' : inpBdr}`,
                        background: active ? '#6366f10f' : inp,
                        color: active ? '#6366f1' : txt,
                        fontSize: 13, fontWeight: 800, transition: 'all 0.15s',
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Total plan */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: sub, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t.planTotal || 'Umumiy plan'}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 0, background: inp, border: `1.5px solid ${hasTotal ? '#6366f1' : inpBdr}`, borderRadius: 14, overflow: 'hidden', transition: 'border-color 0.15s' }}>
                <input
                  value={totalStr}
                  onChange={e => setTotalStr(fmtInput(parseNum(e.target.value)))}
                  placeholder="0"
                  style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 18, fontWeight: 800, color: txt, padding: '14px 16px' }}
                />
                <div style={{ padding: '0 16px', fontSize: 13, fontWeight: 600, color: sub, borderLeft: `1px solid ${inpBdr}`, height: 52, display: 'flex', alignItems: 'center', flexShrink: 0 }}>{unitLbl}</div>
              </div>
              {hasTotal && (
                <div style={{ fontSize: 11, color: sub, marginTop: 6, paddingLeft: 4 }}>
                  = {fmt(total)} {unitLbl}
                </div>
              )}
            </div>

            {/* Category inputs */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: sub, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {t.planByCat || "Kategoriyalar bo'yicha"}
              </div>
              <div style={{ fontSize: 11, color: sub, marginBottom: 12, lineHeight: 1.4 }}>
                {t.planProductHint || "Xohlasangiz kategoriya yonidagi ▾ orqali har bir mahsulotga alohida reja qo'ying — kategoriya avtomatik yig'iladi."}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {planCats.map(cat => {
                  const val    = effectiveCatStr[cat.key];
                  const num    = parseNum(val);
                  const catPct = total > 0 && num > 0 ? Math.round((num / total) * 100) : 0;
                  const over   = num > total && total > 0;
                  const open   = expandedCats.has(cat.key);
                  const catProducts = productsByCat.get(cat.key) ?? [];
                  const fromProducts = catHasProducts(cat.key);
                  return (
                    <div key={cat.key} style={{
                      borderRadius: 14,
                      border: `1px solid ${num > 0 ? (over ? '#ef444440' : cat.color + '40') : inpBdr}`,
                      background: dark ? '#121212' : '#fff',
                      overflow: 'hidden',
                    }}>
                      <div style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                          <button
                            type="button"
                            onClick={() => toggleCat(cat.key)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 7,
                              border: 'none', background: 'transparent', cursor: 'pointer', padding: 0,
                            }}
                          >
                            <div style={{ width: 10, height: 10, borderRadius: 3, background: cat.color, flexShrink: 0 }} />
                            <span style={{ fontSize: 13, fontWeight: 700, color: txt }}>{cat.name}</span>
                            <span style={{ fontSize: 11, color: sub, fontWeight: 600 }}>
                              {open ? '▴' : '▾'} {catProducts.length > 0 ? `${catProducts.length}` : ''}
                            </span>
                          </button>
                          {num > 0 && (
                            <span style={{ fontSize: 12, fontWeight: 800, color: over ? '#ef4444' : cat.color }}>
                              {catPct}%
                            </span>
                          )}
                        </div>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 0,
                          background: inp, borderRadius: 12, overflow: 'hidden',
                          border: `1.5px solid ${num > 0 ? (over ? '#ef4444' : cat.color + '80') : inpBdr}`,
                          opacity: fromProducts ? 0.85 : 1,
                        }}>
                          <input
                            value={val}
                            readOnly={fromProducts}
                            onChange={e => {
                              if (fromProducts) return;
                              setCatStr(p => ({ ...p, [cat.key]: fmtInput(parseNum(e.target.value)) }));
                            }}
                            placeholder="0"
                            style={{
                              flex: 1, border: 'none', background: 'transparent', outline: 'none',
                              fontSize: 15, fontWeight: 700, color: txt, padding: '12px 14px',
                              cursor: fromProducts ? 'default' : 'text',
                            }}
                          />
                          <div style={{
                            padding: '0 14px', fontSize: 12, fontWeight: 600, color: sub,
                            borderLeft: `1px solid ${inpBdr}`, height: 46,
                            display: 'flex', alignItems: 'center', flexShrink: 0,
                          }}>{unitLbl}</div>
                        </div>
                        {fromProducts && (
                          <div style={{ fontSize: 10, color: '#6366f1', marginTop: 5, fontWeight: 600 }}>
                            {t.planFromProducts || 'Mahsulotlardan yig‘ildi'}
                          </div>
                        )}
                      </div>

                      {open && (
                        <div style={{
                          borderTop: `1px solid ${inpBdr}`,
                          padding: '10px 12px 12px',
                          background: dark ? '#0c0c0c' : '#f8fafc',
                        }}>
                          {loadingProducts ? (
                            <div style={{ fontSize: 12, color: sub }}>{t.planLoading || 'Yuklanmoqda...'}</div>
                          ) : catProducts.length === 0 ? (
                            <div style={{ fontSize: 12, color: sub }}>
                              {t.planNoProducts || 'Bu kategoriyada mahsulot yo‘q'}
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {catProducts.map(p => {
                                const pv = prodStr[p.id] || '';
                                const pn = parseNum(pv);
                                return (
                                  <div key={p.id}>
                                    <div style={{
                                      fontSize: 11, fontWeight: 600, color: sub, marginBottom: 4,
                                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                    }}>{p.name}</div>
                                    <div style={{
                                      display: 'flex', alignItems: 'center',
                                      background: dark ? '#161616' : '#fff',
                                      border: `1px solid ${pn > 0 ? cat.color + '70' : inpBdr}`,
                                      borderRadius: 10, overflow: 'hidden',
                                    }}>
                                      <input
                                        value={pv}
                                        onChange={e => setProductAmount(p.id, cat.key, e.target.value)}
                                        placeholder="0"
                                        style={{
                                          flex: 1, border: 'none', background: 'transparent', outline: 'none',
                                          fontSize: 13, fontWeight: 700, color: txt, padding: '9px 12px',
                                        }}
                                      />
                                      <div style={{
                                        padding: '0 10px', fontSize: 11, fontWeight: 600, color: sub,
                                        borderLeft: `1px solid ${inpBdr}`, height: 38,
                                        display: 'flex', alignItems: 'center',
                                      }}>{unitLbl}</div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Summary validation */}
            {hasTotal && catTotal > 0 && (
              <div style={{
                padding: '12px 16px', borderRadius: 14, marginBottom: 20,
                background: isValid ? '#10b98112' : '#ef444412',
                border: `1px solid ${isValid ? '#10b98140' : '#ef444440'}`,
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                {isValid
                  ? <Check size={15} color="#10b981" />
                  : <AlertCircle size={15} color="#ef4444" />}
                <div style={{ fontSize: 13, color: isValid ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                  {isValid
                    ? (t.planDistributed || "Kategoriyalar to'g'ri taqsimlangan")
                    : diff > 0
                      ? `${fmt(diffAbs)} ${unitLbl} ${t.planNotDistributed || 'taqsimlanmadi'}`
                      : `${fmt(diffAbs)} ${unitLbl} ${t.planExcess || 'ortiqcha'}`}
                </div>
              </div>
            )}

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={!isValid}
              style={{
                width: '100%', padding: '15px', borderRadius: 16, border: 'none',
                background: isValid ? '#6366f1' : (dark ? '#1a1a1a' : '#f1f5f9'),
                color: isValid ? '#fff' : sub,
                fontSize: 15, fontWeight: 800, cursor: isValid ? 'pointer' : 'not-allowed',
                transition: 'all 0.18s',
                boxShadow: isValid ? '0 4px 18px rgba(99,102,241,0.35)' : 'none',
              }}
            >
              {isValid ? `✓ ${t.planSaveBtn || 'Planni saqlash'}` : (t.planFillCats || "Kategoriyalarni to'ldiring")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Types ─────────────────────────────────────────────────────────────────────
type SortKey = 'pct' | 'sum' | 'name';

interface Props {
  D: boolean; card: string; sub: string;
  t: Record<string, string>;
  activeAgents: AgentRow[];
  selectedCompanyIds: Set<string>;
  showBalances: boolean;
}

const MEDALS = ['🥇', '🥈', '🥉'];

// ─── Historical data generator ─────────────────────────────────────────────────
type ViewMode = 'months' | 'weeks' | 'days';

const MONTH_NAMES = ['Yan','Fev','Mar','Apr','May','Iyn','Iyl','Avg','Sen','Okt','Noy','Dek'];

function genHistory(seed: number, mode: ViewMode, planBase: number) {
  const now = new Date();
  const items: { label: string; done: number; plan: number }[] = [];

  if (mode === 'months') {
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const s = seed + i * 7;
      const plan = planBase * (0.9 + (s % 20) / 100);
      const pct  = 40 + ((s * 13) % 58);
      items.push({ label: MONTH_NAMES[d.getMonth()], plan, done: Math.round(plan * pct / 100) });
    }
  } else if (mode === 'weeks') {
    const WEEK_DAYS = ['Ya','Du','Se','Ch','Pa','Sh','Ya'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setDate(now.getDate() - i);
      const s = seed + i * 11;
      const plan = planBase / 4;
      const pct  = 35 + ((s * 17) % 63);
      items.push({ label: WEEK_DAYS[d.getDay()], plan, done: Math.round(plan * pct / 100) });
    }
  } else {
    let pct = 45 + ((seed * 7) % 30);
    for (let i = 19; i >= 0; i--) {
      const d = new Date(now); d.setDate(now.getDate() - i);
      const s = seed + i * 3;
      const delta = ((s * 11 + i * 7) % 17) - 7;
      pct = Math.max(28, Math.min(92, pct + delta));
      const plan = planBase / 20;
      items.push({ label: i % 4 === 0 ? `${d.getDate()}` : '', plan, done: Math.round(plan * pct / 100) });
    }
  }
  return items;
}

// ─── Smooth Bezier Line Chart ──────────────────────────────────────────────────
function midpointBezier(pts: { x: number; y: number }[]) {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1];
    const c = pts[i];
    const mx = ((p.x + c.x) / 2).toFixed(2);
    d += ` C ${mx} ${p.y.toFixed(2)}, ${mx} ${c.y.toFixed(2)}, ${c.x.toFixed(2)} ${c.y.toFixed(2)}`;
  }
  return d;
}

function SmoothLineChart({ items, dark, showBalances, uid }: {
  items: { label: string; done: number; plan: number }[];
  dark: boolean; showBalances: boolean; uid: string;
}) {
  const [hovIdx, setHovIdx] = useState<number | null>(null);
  const W = 1000, H = 200;
  const PAD = { t: 30, r: 30, b: 46, l: 30 };
  const cW = W - PAD.l - PAD.r;
  const cH = H - PAD.t - PAD.b;

  const vals   = items.map(it => it.done);
  const minVal = Math.min(...vals);
  const maxVal = Math.max(...vals);
  const range  = Math.max(maxVal - minVal, 1);
  const lo = minVal - range * 0.25;
  const hi = maxVal + range * 0.25;

  const lineClr = dark ? '#818cf8' : '#6366f1';
  const gridClr = dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
  const dropClr = dark ? 'rgba(255,255,255,0.06)' : 'rgba(99,102,241,0.10)';
  const labClr  = dark ? '#4b5563' : '#d1d5db';
  const dotBg   = dark ? '#0a0a0a' : '#ffffff';
  const gradId  = `g-${uid}`;
  const tipBg   = dark ? '#1e1e2e' : '#1f2937';

  function fy(v: number) {
    return PAD.t + cH - ((v - lo) / (hi - lo)) * cH;
  }

  const pts = items.map((it, i) => ({
    x: PAD.l + (items.length > 1 ? (i / (items.length - 1)) : 0.5) * cW,
    y: fy(it.done),
    label: it.label,
    done: it.done,
    plan: it.plan,
  }));

  const linePath = midpointBezier(pts);
  const areaPath = linePath
    + ` L ${pts[pts.length - 1].x.toFixed(2)} ${(PAD.t + cH).toFixed(2)}`
    + ` L ${pts[0].x.toFixed(2)} ${(PAD.t + cH).toFixed(2)} Z`;

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    let closest = 0, minD = Infinity;
    pts.forEach((pt, i) => {
      const d = Math.abs(pt.x - svgX);
      if (d < minD) { minD = d; closest = i; }
    });
    setHovIdx(closest);
  }

  const tip = hovIdx !== null ? pts[hovIdx] : null;
  const tipW = 148, tipH = 48;
  const tipX = tip ? Math.min(Math.max(tip.x - tipW / 2, 2), W - tipW - 2) : 0;
  const tipY = tip ? Math.max(tip.y - tipH - 14, PAD.t - 8) : 0;

  function tipDateLabel(idx: number) {
    if (pts[idx].label) return pts[idx].label;
    const d = new Date();
    d.setDate(d.getDate() - (pts.length - 1 - idx));
    return `${d.getDate()}-${MONTH_NAMES[d.getMonth()]}`;
  }

  return (
    <svg
      width="100%" viewBox={`0 0 ${W} ${H}`}
      style={{ display: 'block', overflow: 'visible', cursor: 'crosshair' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHovIdx(null)}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={lineClr} stopOpacity={dark ? 0.14 : 0.07} />
          <stop offset="100%" stopColor={lineClr} stopOpacity={0} />
        </linearGradient>
      </defs>

      {[0.2, 0.5, 0.8].map((t, i) => (
        <line key={i}
          x1={PAD.l} y1={PAD.t + cH * t}
          x2={W - PAD.r} y2={PAD.t + cH * t}
          stroke={gridClr} strokeWidth={0.7} strokeDasharray="3 9"
        />
      ))}

      {pts.map((pt, i) => (
        <line key={i}
          x1={pt.x} y1={pt.y + 4}
          x2={pt.x} y2={PAD.t + cH}
          stroke={dropClr} strokeWidth={0.7} strokeDasharray="2 5"
        />
      ))}

      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={linePath} fill="none" stroke={lineClr} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />

      {tip && (
        <line
          x1={tip.x} y1={PAD.t}
          x2={tip.x} y2={PAD.t + cH}
          stroke={lineClr} strokeWidth={1} strokeDasharray="4 5" opacity={0.4}
        />
      )}

      {pts.map((pt, i) => {
        const isHov = i === hovIdx;
        return (
          <g key={i}>
            {isHov && (
              <circle cx={pt.x} cy={pt.y} r={9}
                fill={lineClr} opacity={0.12} />
            )}
            <circle cx={pt.x} cy={pt.y} r={isHov ? 5 : 3.5}
              fill={isHov ? lineClr : dotBg}
              stroke={lineClr} strokeWidth={isHov ? 0 : 1.4}
            />
            {pt.label && (
              <text x={pt.x} y={H - 8}
                textAnchor="middle" fontSize={11}
                fill={isHov ? lineClr : labClr} fontFamily="inherit">
                {pt.label}
              </text>
            )}
          </g>
        );
      })}

      {tip && hovIdx !== null && (
        <g>
          <rect x={tipX} y={tipY} width={tipW} height={tipH} rx={10} fill={tipBg} opacity={0.96} />
          <text
            x={tipX + tipW / 2} y={tipY + 16}
            textAnchor="middle" fontSize={10}
            fill="rgba(255,255,255,0.5)" fontFamily="inherit"
          >
            {tipDateLabel(hovIdx)} · Savdo
          </text>
          <text
            x={tipX + tipW / 2} y={tipY + 35}
            textAnchor="middle" fontSize={13} fontWeight="800"
            fill="#ffffff" fontFamily="inherit"
          >
            {showBalances ? `${fmt(tip.done)} so'm` : '••••'}
          </text>
        </g>
      )}
    </svg>
  );
}

// ─── Pie / Donut Chart ─────────────────────────────────────────────────────────
function PieDonutChart({ items, dark, showBalances, isMobile }: {
  items: { label: string; done: number; plan: number }[];
  dark: boolean; showBalances: boolean; isMobile?: boolean;
}) {
  const COLORS = ['#6366f1','#10b981','#f59e0b','#3b82f6','#ec4899','#8b5cf6'];
  const total  = items.reduce((s, it) => s + it.done, 0) || 1;
  const txt    = dark ? '#e5e7eb' : '#111827';
  const sub    = dark ? '#6b7280' : '#9ca3af';
  const border = dark ? '#1e1e1e' : '#f0f0f0';

  const svgSize = isMobile ? 160 : 220;
  const CX = svgSize / 2, CY = svgSize / 2, R = isMobile ? 60 : 82, INNER = isMobile ? 36 : 50;
  let acc = -Math.PI / 2;

  const slices = items.map((it, i) => {
    const frac  = it.done / total;
    const start = acc;
    const end   = acc + frac * Math.PI * 2;
    acc = end;
    const mid = (start + end) / 2;
    const x1 = CX + R * Math.cos(start), y1 = CY + R * Math.sin(start);
    const x2 = CX + R * Math.cos(end),   y2 = CY + R * Math.sin(end);
    const xi1 = CX + INNER * Math.cos(start), yi1 = CY + INNER * Math.sin(start);
    const xi2 = CX + INNER * Math.cos(end),   yi2 = CY + INNER * Math.sin(end);
    const lg  = frac > 0.5 ? 1 : 0;
    void mid;
    const path = `M ${xi1.toFixed(2)} ${yi1.toFixed(2)} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 ${lg} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} L ${xi2.toFixed(2)} ${yi2.toFixed(2)} A ${INNER} ${INNER} 0 ${lg} 0 ${xi1.toFixed(2)} ${yi1.toFixed(2)} Z`;
    return { path, color: COLORS[i % COLORS.length], label: it.label, pct: Math.round(frac * 100), done: it.done };
  });

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'center', gap: isMobile ? 12 : 24, padding: '4px 0 8px' }}>
      <svg width={svgSize} height={svgSize} style={{ flexShrink: 0 }}>
        {slices.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} opacity={0.9} />
        ))}
        <text x={CX} y={CY - 7} textAnchor="middle" fontSize={isMobile ? 10 : 11} fill={sub}>Jami</text>
        <text x={CX} y={CY + 13} textAnchor="middle" fontSize={isMobile ? 14 : 16} fill={txt} fontWeight="800">
          {showBalances ? `${Math.round(total / 1_000_000)}M` : '••••'}
        </text>
      </svg>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, width: isMobile ? '100%' : 'auto' }}>
        {slices.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: txt, flex: 1 }}>{s.label}</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: s.color }}>{s.pct}%</span>
            {showBalances && (
              <span style={{ fontSize: 11, color: sub, minWidth: 54, textAlign: 'right', paddingLeft: 4, borderLeft: `1px solid ${border}` }}>
                {(s.done / 1_000_000).toFixed(1)}M
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Bar Chart ─────────────────────────────────────────────────────────────────
function BarChart({ items, dark, showBalances, uid }: {
  items: { label: string; done: number; plan: number }[];
  dark: boolean; showBalances: boolean; uid: string;
}) {
  const [hovIdx, setHovIdx] = useState<number | null>(null);
  const W = 1000, H = 220;
  const PAD = { t: 14, r: 16, b: 48, l: 16 };
  const cW = W - PAD.l - PAD.r;
  const cH = H - PAD.t - PAD.b;

  const maxVal    = Math.max(...items.map(it => Math.max(it.done, it.plan)), 1);
  const barGroupW = cW / items.length;
  const barW      = Math.max(Math.min(barGroupW * 0.62, 48), 10);

  const accentClr = dark ? '#818cf8' : '#6366f1';
  const trackClr  = dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const labClr    = dark ? '#52525b' : '#cbd5e1';
  const gridClr   = dark ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.04)';
  const tipBg     = '#18181b';
  const gradId    = `barg-${uid}`;
  const gradHovId = `bargh-${uid}`;

  function barCx(i: number) { return PAD.l + barGroupW * i + barGroupW / 2; }

  function tipDateLabel(idx: number) {
    if (items[idx].label) return items[idx].label;
    const d = new Date();
    d.setDate(d.getDate() - (items.length - 1 - idx));
    return `${d.getDate()}-${MONTH_NAMES[d.getMonth()]}`;
  }

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    let closest = 0, minD = Infinity;
    items.forEach((_, i) => {
      const d = Math.abs(barCx(i) - svgX);
      if (d < minD) { minD = d; closest = i; }
    });
    setHovIdx(closest);
  }

  function roundedTopBar(x: number, y: number, w: number, h: number, r: number) {
    if (h <= 0) return '';
    const rr = Math.min(r, h, w / 2);
    return `M ${x},${y + h} L ${x},${y + rr} Q ${x},${y} ${x + rr},${y} L ${x + w - rr},${y} Q ${x + w},${y} ${x + w},${y + rr} L ${x + w},${y + h} Z`;
  }

  const tipW     = 156, tipH = 52;
  const tipCx    = hovIdx !== null ? barCx(hovIdx) : 0;
  const tipX     = hovIdx !== null ? Math.min(Math.max(tipCx - tipW / 2, 2), W - tipW - 2) : 0;
  const tipDoneH = hovIdx !== null ? Math.max((items[hovIdx].done / maxVal) * cH, 0) : 0;
  const tipY     = hovIdx !== null ? Math.max(PAD.t + cH - tipDoneH - tipH - 16, 2) : 0;

  return (
    <svg
      width="100%" viewBox={`0 0 ${W} ${H}`}
      style={{ display: 'block', overflow: 'visible', cursor: 'default' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHovIdx(null)}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={accentClr} stopOpacity={dark ? 0.75 : 0.7} />
          <stop offset="100%" stopColor={accentClr} stopOpacity={dark ? 0.28 : 0.22} />
        </linearGradient>
        <linearGradient id={gradHovId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={accentClr} stopOpacity={1} />
          <stop offset="100%" stopColor={accentClr} stopOpacity={dark ? 0.55 : 0.5} />
        </linearGradient>
      </defs>

      {[0, 0.33, 0.66, 1].map((t, i) => (
        <line key={i}
          x1={PAD.l} y1={PAD.t + cH * t}
          x2={W - PAD.r} y2={PAD.t + cH * t}
          stroke={gridClr} strokeWidth={t === 1 ? 1 : 0.6}
        />
      ))}

      {items.map((it, i) => {
        const isHov  = i === hovIdx;
        const cx     = barCx(i);
        const bx     = cx - barW / 2;
        const bottom = PAD.t + cH;
        const doneH  = Math.max((it.done / maxVal) * cH, 0);
        const planH  = Math.max((it.plan / maxVal) * cH, 0);
        const doneY  = bottom - doneH;
        const planY  = bottom - planH;
        const rr     = Math.min(5, barW / 2);

        return (
          <g key={i}>
            <path d={roundedTopBar(bx, planY, barW, planH, rr)} fill={trackClr} />
            <path
              d={roundedTopBar(bx, doneY, barW, doneH, rr)}
              fill={isHov ? `url(#${gradHovId})` : `url(#${gradId})`}
            />
            {it.plan > 0 && (
              <line x1={bx + 2} y1={planY} x2={bx + barW - 2} y2={planY}
                stroke={accentClr} strokeWidth={1.5} opacity={0.28} strokeLinecap="round" />
            )}
            {isHov && doneH > 0 && (
              <circle cx={cx} cy={doneY} r={3.5} fill={accentClr} />
            )}
            {it.label && (
              <text x={cx} y={H - 10}
                textAnchor="middle"
                fontSize={items.length > 12 ? 9 : 11}
                fill={isHov ? accentClr : labClr}
                fontFamily="inherit"
                fontWeight={isHov ? '700' : '400'}>
                {it.label}
              </text>
            )}
          </g>
        );
      })}

      {hovIdx !== null && (() => {
        const pct = items[hovIdx].plan > 0
          ? Math.round((items[hovIdx].done / items[hovIdx].plan) * 100) : 0;
        const pctClr = pct >= 80 ? '#10b981' : pct >= 50 ? accentClr : '#f59e0b';
        return (
          <g>
            <rect x={tipX + 2} y={tipY + 4} width={tipW} height={tipH} rx={12}
              fill="rgba(0,0,0,0.18)" />
            <rect x={tipX} y={tipY} width={tipW} height={tipH} rx={12} fill={tipBg} />
            <rect x={tipX} y={tipY} width={4} height={tipH} rx={2} fill={accentClr} />
            <text x={tipX + 14} y={tipY + 18}
              fontSize={10} fill="rgba(255,255,255,0.45)" fontFamily="inherit">
              {tipDateLabel(hovIdx)}
            </text>
            <text x={tipX + tipW - 10} y={tipY + 18}
              textAnchor="end" fontSize={10} fill={pctClr}
              fontFamily="inherit" fontWeight="700">
              {pct}%
            </text>
            <text x={tipX + 14} y={tipY + 38}
              fontSize={13} fontWeight="800" fill="#ffffff" fontFamily="inherit">
              {showBalances ? `${fmt(items[hovIdx].done)} so'm` : '••••••'}
            </text>
          </g>
        );
      })()}
    </svg>
  );
}

// ─── Multi-Line Chart ──────────────────────────────────────────────────────────
function MultiLineChart({ series, dark, showBalances, uid }: {
  series: { label: string; color: string; items: { label: string; done: number }[] }[];
  dark: boolean; showBalances: boolean; uid: string;
}) {
  const [hovIdx, setHovIdx] = useState<number | null>(null);
  const W = 1000, H = 205;
  const PAD = { t: 22, r: 20, b: 40, l: 20 };
  const cW = W - PAD.l - PAD.r;
  const cH = H - PAD.t - PAD.b;
  const n = series[0]?.items.length ?? 0;

  const allVals = series.flatMap(s => s.items.map(it => it.done));
  const maxV = Math.max(...allVals, 1);
  const minV = Math.min(...allVals, 0);
  const range = Math.max(maxV - minV, 1);
  const lo = Math.max(minV - range * 0.18, 0);
  const hi = maxV + range * 0.18;

  const gridClr = dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
  const labClr  = dark ? '#4b5563' : '#d1d5db';
  const tipBg   = '#18181b';

  function fy(v: number) { return PAD.t + cH - ((v - lo) / (hi - lo)) * cH; }
  function fx(i: number) { return PAD.l + (n > 1 ? (i / (n - 1)) : 0.5) * cW; }

  const seriesPts = series.map(s =>
    s.items.map((it, i) => ({ x: fx(i), y: fy(it.done), done: it.done, label: it.label }))
  );

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    let cl = 0, md = Infinity;
    for (let i = 0; i < n; i++) { const d = Math.abs(fx(i) - svgX); if (d < md) { md = d; cl = i; } }
    setHovIdx(cl);
  }

  function tipLabel(idx: number) {
    const lbl = series[0]?.items[idx]?.label;
    if (lbl) return lbl;
    const d = new Date(); d.setDate(d.getDate() - (n - 1 - idx));
    return `${d.getDate()}-${MONTH_NAMES[d.getMonth()]}`;
  }

  const tipW = 180; const tipLineH = 20; const tipH = 18 + series.length * tipLineH + 10;
  const hovX = hovIdx !== null ? fx(hovIdx) : 0;
  const tipX = hovIdx !== null ? Math.min(Math.max(hovX - tipW / 2, 2), W - tipW - 2) : 0;
  const tipY = 2;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`}
      style={{ display: 'block', overflow: 'visible', cursor: 'crosshair' }}
      onMouseMove={handleMouseMove} onMouseLeave={() => setHovIdx(null)}>
      <defs>
        {series.map((s, si) => (
          <linearGradient key={si} id={`mlg-${uid}-${si}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={s.color} stopOpacity={dark ? 0.14 : 0.10}/>
            <stop offset="100%" stopColor={s.color} stopOpacity={0}/>
          </linearGradient>
        ))}
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
        <line key={i} x1={PAD.l} y1={PAD.t + cH * t} x2={W - PAD.r} y2={PAD.t + cH * t}
          stroke={gridClr} strokeWidth={t === 0 || t === 1 ? 0.8 : 0.5}
          strokeDasharray={t > 0 && t < 1 ? '3 8' : undefined}/>
      ))}
      {series[0]?.items.map((it, i) => it.label ? (
        <text key={i} x={fx(i)} y={H - 6} textAnchor="middle"
          fontSize={n > 12 ? 9 : 11} fill={labClr} fontFamily="inherit">{it.label}</text>
      ) : null)}
      {seriesPts.map((pts, si) => {
        const lp = midpointBezier(pts);
        const ap = lp + ` L ${pts[pts.length-1].x.toFixed(1)} ${(PAD.t+cH).toFixed(1)} L ${pts[0].x.toFixed(1)} ${(PAD.t+cH).toFixed(1)} Z`;
        return (
          <g key={si}>
            <path d={ap} fill={`url(#mlg-${uid}-${si})`}/>
            <path d={lp} stroke={series[si].color} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </g>
        );
      })}
      {hovIdx !== null && (
        <>
          <line x1={hovX} y1={PAD.t} x2={hovX} y2={PAD.t + cH}
            stroke={dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'} strokeWidth={1} strokeDasharray="4 5"/>
          {seriesPts.map((pts, si) => (
            <g key={si}>
              <circle cx={pts[hovIdx].x} cy={pts[hovIdx].y} r={6} fill={series[si].color} opacity={0.18}/>
              <circle cx={pts[hovIdx].x} cy={pts[hovIdx].y} r={3.5} fill={series[si].color}/>
            </g>
          ))}
          <rect x={tipX+2} y={tipY+3} width={tipW} height={tipH} rx={12} fill="rgba(0,0,0,0.2)"/>
          <rect x={tipX}   y={tipY}   width={tipW} height={tipH} rx={12} fill={tipBg}/>
          <text x={tipX+12} y={tipY+14} fontSize={10} fill="rgba(255,255,255,0.4)" fontFamily="inherit">
            {tipLabel(hovIdx)}
          </text>
          {series.map((s, si) => (
            <g key={si}>
              <circle cx={tipX+16} cy={tipY+18+tipLineH/2+si*tipLineH} r={4} fill={s.color}/>
              <text x={tipX+26} y={tipY+22+si*tipLineH} fontSize={11} fill="rgba(255,255,255,0.65)" fontFamily="inherit">{s.label}</text>
              <text x={tipX+tipW-10} y={tipY+22+si*tipLineH} textAnchor="end"
                fontSize={12} fontWeight="800" fill={s.color} fontFamily="inherit">
                {showBalances ? fmt(seriesPts[si][hovIdx].done) : '••••'}
              </text>
            </g>
          ))}
        </>
      )}
      {(() => {
        let lx = PAD.l;
        return (
          <g>
            {series.map((s, si) => {
              const el = (
                <g key={si} transform={`translate(${lx}, ${H - 8})`}>
                  <line x1={0} y1={-3} x2={14} y2={-3} stroke={s.color} strokeWidth={2.5} strokeLinecap="round"/>
                  <circle cx={7} cy={-3} r={3} fill={s.color}/>
                  <text x={18} y={0} fontSize={11} fill={labClr} fontFamily="inherit">{s.label}</text>
                </g>
              );
              lx += s.label.length * 7 + 32;
              return el;
            })}
          </g>
        );
      })()}
    </svg>
  );
}

// ─── Grouped Bar Chart ─────────────────────────────────────────────────────────
function GroupedBarChart({ series, dark, showBalances, uid }: {
  series: { label: string; color: string; items: { label: string; done: number; plan: number }[] }[];
  dark: boolean; showBalances: boolean; uid: string;
}) {
  const [hovGroup, setHovGroup] = useState<number | null>(null);
  const W = 1000, H = 205;
  const PAD = { t: 12, r: 16, b: 40, l: 16 };
  const cW = W - PAD.l - PAD.r;
  const cH = H - PAD.t - PAD.b;
  const n     = series[0]?.items.length ?? 0;
  const nCats = series.length;
  const maxVal = Math.max(...series.flatMap(s => s.items.map(it => Math.max(it.done, it.plan))), 1);
  const groupW  = cW / n;
  const gap     = 2;
  const barW    = Math.max(Math.min((groupW - gap * (nCats + 1)) / nCats, 38), 5);
  const totalBW = barW * nCats + gap * (nCats - 1);
  const gridClr = dark ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.04)';
  const labClr  = dark ? '#52525b' : '#cbd5e1';
  const tipBg   = '#18181b';

  function groupCx(gi: number) { return PAD.l + groupW * gi + groupW / 2; }
  function barX(gi: number, ci: number) { return groupCx(gi) - totalBW / 2 + ci * (barW + gap); }

  function roundedTop(x: number, y: number, w: number, h: number, r: number) {
    if (h <= 0) return '';
    const rr = Math.min(r, h, w / 2);
    return `M ${x},${y+h} L ${x},${y+rr} Q ${x},${y} ${x+rr},${y} L ${x+w-rr},${y} Q ${x+w},${y} ${x+w},${y+rr} L ${x+w},${y+h} Z`;
  }

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    let cl = 0, md = Infinity;
    for (let i = 0; i < n; i++) { const d = Math.abs(groupCx(i) - svgX); if (d < md) { md = d; cl = i; } }
    setHovGroup(cl);
  }

  function tipLabel(idx: number) {
    const lbl = series[0]?.items[idx]?.label;
    if (lbl) return lbl;
    const d = new Date(); d.setDate(d.getDate() - (n - 1 - idx));
    return `${d.getDate()}-${MONTH_NAMES[d.getMonth()]}`;
  }

  const tipW = 180; const tipLineH = 20; const tipH = 18 + nCats * tipLineH + 10;
  const hovCx = hovGroup !== null ? groupCx(hovGroup) : 0;
  const tipX  = hovGroup !== null ? Math.min(Math.max(hovCx - tipW / 2, 2), W - tipW - 2) : 0;
  const tipY  = 2;
  const rr    = Math.min(4, barW / 2);

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`}
      style={{ display: 'block', overflow: 'visible', cursor: 'default' }}
      onMouseMove={handleMouseMove} onMouseLeave={() => setHovGroup(null)}>
      <defs>
        {series.flatMap((s, si) => [
          <linearGradient key={`n${si}`} id={`gbg-${uid}-${si}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={s.color} stopOpacity={dark ? 0.82 : 0.76}/>
            <stop offset="100%" stopColor={s.color} stopOpacity={dark ? 0.28 : 0.22}/>
          </linearGradient>,
          <linearGradient key={`h${si}`} id={`gbgh-${uid}-${si}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={s.color} stopOpacity={1}/>
            <stop offset="100%" stopColor={s.color} stopOpacity={0.52}/>
          </linearGradient>,
        ])}
      </defs>
      {[0, 0.33, 0.66, 1].map((t, i) => (
        <line key={i} x1={PAD.l} y1={PAD.t+cH*t} x2={W-PAD.r} y2={PAD.t+cH*t}
          stroke={gridClr} strokeWidth={t===1?0.9:0.5}/>
      ))}
      {hovGroup !== null && (
        <rect x={groupCx(hovGroup)-groupW/2+1} y={PAD.t} width={groupW-2} height={cH}
          fill={dark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.025)'} rx={3}/>
      )}
      {Array.from({ length: n }).map((_, gi) => {
        const isHov = gi === hovGroup;
        const bot   = PAD.t + cH;
        return (
          <g key={gi}>
            {series.map((s, ci) => {
              const it = s.items[gi];
              const bx = barX(gi, ci);
              const dH = Math.max((it.done / maxVal) * cH, 0);
              return (
                <g key={ci}>
                  <path d={roundedTop(bx, bot-dH, barW, dH, rr)}
                    fill={isHov ? `url(#gbgh-${uid}-${ci})` : `url(#gbg-${uid}-${ci})`}/>
                  {isHov && dH > 0 && <circle cx={bx+barW/2} cy={bot-dH} r={2.5} fill={s.color}/>}
                </g>
              );
            })}
            {series[0].items[gi].label && (
              <text x={groupCx(gi)} y={H-6} textAnchor="middle"
                fontSize={n > 12 ? 9 : 11}
                fill={isHov ? (dark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)') : labClr}
                fontFamily="inherit">
                {series[0].items[gi].label}
              </text>
            )}
          </g>
        );
      })}
      {hovGroup !== null && (
        <g>
          <rect x={tipX+2} y={tipY+3} width={tipW} height={tipH} rx={12} fill="rgba(0,0,0,0.2)"/>
          <rect x={tipX}   y={tipY}   width={tipW} height={tipH} rx={12} fill={tipBg}/>
          <text x={tipX+12} y={tipY+14} fontSize={10} fill="rgba(255,255,255,0.4)" fontFamily="inherit">
            {tipLabel(hovGroup)}
          </text>
          {series.map((s, si) => (
            <g key={si}>
              <rect x={tipX+10} y={tipY+16+si*tipLineH} width={10} height={8} rx={2} fill={s.color} opacity={0.85}/>
              <text x={tipX+26} y={tipY+23+si*tipLineH} fontSize={11} fill="rgba(255,255,255,0.65)" fontFamily="inherit">{s.label}</text>
              <text x={tipX+tipW-10} y={tipY+23+si*tipLineH} textAnchor="end"
                fontSize={12} fontWeight="800" fill={s.color} fontFamily="inherit">
                {showBalances ? fmt(s.items[hovGroup].done) : '••••'}
              </text>
            </g>
          ))}
        </g>
      )}
      {(() => {
        let lx = PAD.l;
        return (
          <g>
            {series.map((s, si) => {
              const el = (
                <g key={si} transform={`translate(${lx}, ${H - 8})`}>
                  <rect x={0} y={-9} width={13} height={8} rx={2} fill={s.color} opacity={0.75}/>
                  <text x={17} y={0} fontSize={11} fill={labClr} fontFamily="inherit">{s.label}</text>
                </g>
              );
              lx += s.label.length * 7 + 32;
              return el;
            })}
          </g>
        );
      })()}
    </svg>
  );
}

// ─── Single Donut (individual category) ───────────────────────────────────────
function SingleCatDonut({ cat, dark, showBalances, t, isMobile, unit = 'som' }: {
  cat: { name: string; color: string; plan: number; done: number; pct: number };
  dark: boolean; showBalances: boolean; t: Record<string, string>; isMobile?: boolean;
  unit?: PlanUnit;
}) {
  const size = isMobile ? 110 : 160, stroke = isMobile ? 13 : 18;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const filled = Math.min(cat.pct / 100, 1) * circ;
  const cx = size / 2;
  const bg  = dark ? '#1e1e1e' : '#f1f5f9';
  const sub = dark ? '#6b7280' : '#9ca3af';
  const txt = dark ? '#e5e7eb' : '#111827';
  const uLbl = planUnitLabel(unit, t);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 16 : 28, padding: '10px 0' }}>
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
          <circle cx={cx} cy={cx} r={r} fill="none" stroke={bg} strokeWidth={stroke}/>
          <circle cx={cx} cy={cx} r={r} fill="none" stroke={cat.color} strokeWidth={stroke}
            strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"/>
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: isMobile ? 20 : 28, fontWeight: 900, color: cat.color, lineHeight: 1 }}>{cat.pct}%</span>
          <span style={{ fontSize: 9, color: sub, marginTop: 2 }}>{t.planDoneLbl || 'bajarildi'}</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 10 : 14, flex: 1, minWidth: 0 }}>
        {[
          { lbl: t.planReja || 'Reja',      val: showBalances ? fmt(cat.plan) + ` ${uLbl}`                         : '••••••', clr: sub       },
          { lbl: t.planDone || 'Bajarildi', val: showBalances ? fmt(cat.done) + ` ${uLbl}`                         : '••••••', clr: '#10b981' },
          { lbl: t.planRemaining || 'Qoldi',val: showBalances ? fmt(Math.max(cat.plan - cat.done, 0)) + ` ${uLbl}` : '••••••', clr: '#f59e0b' },
        ].map(s => (
          <div key={s.lbl}>
            <div style={{ fontSize: 10, color: sub, marginBottom: 2 }}>{s.lbl}</div>
            <div style={{ fontSize: isMobile ? 12 : 15, fontWeight: 800, color: s.clr, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.val}</div>
          </div>
        ))}
        <MiniBar pct={cat.pct} color={cat.color} dark={dark}/>
      </div>
    </div>
  );
  void txt;
}

// ─── All-Cats Donut Row ────────────────────────────────────────────────────────
function AllCatsDonut({ cats, dark, showBalances, isMobile }: {
  cats: { name: string; color: string; plan: number; done: number; pct: number }[];
  dark: boolean; showBalances: boolean; isMobile?: boolean;
}) {
  const size = isMobile ? 88 : 130, stroke = isMobile ? 11 : 15;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const cx  = size / 2;
  const bg  = dark ? '#1e1e1e' : '#f1f5f9';
  const sub = dark ? '#6b7280' : '#9ca3af';
  const txt = dark ? '#e5e7eb' : '#111827';
  return (
    <div style={{ display: 'flex', gap: isMobile ? 6 : 16, justifyContent: 'space-around', padding: '8px 0 4px' }}>
      {cats.map(c => {
        const filled = Math.min(c.pct / 100, 1) * circ;
        return (
          <div key={c.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isMobile ? 6 : 10, flex: 1, minWidth: 0 }}>
            <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
              <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
                <circle cx={cx} cy={cx} r={r} fill="none" stroke={bg} strokeWidth={stroke}/>
                <circle cx={cx} cy={cx} r={r} fill="none" stroke={c.color} strokeWidth={stroke}
                  strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"/>
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: isMobile ? 14 : 21, fontWeight: 900, color: c.color }}>{c.pct}%</span>
              </div>
            </div>
            <div style={{ textAlign: 'center', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center', marginBottom: 2 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: c.color, flexShrink: 0 }}/>
                <span style={{ fontSize: isMobile ? 10 : 12, fontWeight: 700, color: txt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
              </div>
              {showBalances && <div style={{ fontSize: isMobile ? 8 : 10, color: sub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fmtM(c.done)}/{fmtM(c.plan)}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Category View ─────────────────────────────────────────────────────────────
function CategoryView({ cats, dark, showBalances, mode, agent, t, isMobile, unit = 'som' }: {
  cats: { key: string; name: string; color: string; plan: number; done: number; pct: number }[];
  dark: boolean; showBalances: boolean; mode: ViewMode; agent: AgentRow; t: Record<string, string>; isMobile?: boolean;
  unit?: PlanUnit;
}) {
  const [activeCat, setActiveCat] = useState<string>('ALL');
  const [chartType, setChartType] = useState<'line' | 'bar' | 'donut'>('bar');

  const allSeries = useMemo(() => cats.map((c, ci) => ({
    label: c.name,
    color: c.color,
    items: genHistory(agent.id * 17 + ci * 100, mode, c.plan),
  })), [cats, agent.id, mode]);

  const series = useMemo(() =>
    activeCat === 'ALL'
      ? allSeries
      : allSeries.filter(s => s.label === cats.find(c => c.key === activeCat)?.name),
    [activeCat, allSeries, cats],
  );

  const activeCatData = activeCat !== 'ALL' ? cats.find(c => c.key === activeCat) : null;
  const activeColor   = activeCatData?.color ?? '#6366f1';

  const txt    = dark ? '#e5e7eb' : '#111827';
  const sub    = dark ? '#6b7280' : '#9ca3af';
  const border = dark ? '#222' : '#e5e7eb';
  const pillBg = dark ? '#111' : '#f1f5f9';
  const infoB  = dark ? '#111' : '#f8fafc';
  const uid    = `cv-${agent.id}-${activeCat}-${mode}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between', gap: isMobile ? 8 : 10 }}>
        <div style={{ display: 'flex', background: pillBg, borderRadius: 12, padding: 4, gap: 2 }}>
          <button onClick={() => setActiveCat('ALL')} style={{
            flex: 1, padding: isMobile ? '5px 8px' : '5px 14px', borderRadius: 9, border: 'none', cursor: 'pointer',
            background: activeCat === 'ALL' ? (dark ? '#1e1e2e' : '#6366f1') : 'transparent',
            color: activeCat === 'ALL' ? (dark ? '#818cf8' : '#fff') : sub,
            fontSize: isMobile ? 11 : 12, fontWeight: activeCat === 'ALL' ? 700 : 500, transition: 'all 0.15s',
            whiteSpace: 'nowrap',
          }}>{t.allBtn || 'Barchasi'}</button>
          {cats.map(c => {
            const isAct = activeCat === c.key;
            return (
              <button key={c.key} onClick={() => setActiveCat(c.key)} style={{
                flex: 1, padding: isMobile ? '5px 8px' : '5px 14px', borderRadius: 9, border: 'none', cursor: 'pointer',
                background: isAct ? c.color : 'transparent',
                color: isAct ? '#fff' : sub,
                fontSize: isMobile ? 11 : 12, fontWeight: isAct ? 700 : 500, transition: 'all 0.15s',
                whiteSpace: 'nowrap',
              }}>{c.name}</button>
            );
          })}
        </div>

        <div style={{ display: 'flex', background: pillBg, borderRadius: 10, padding: 3, gap: 1, alignSelf: isMobile ? 'flex-end' : 'auto' }}>
          {([
            { t: 'line'  as const, icon: <svg width="18" height="12" viewBox="0 0 18 12" fill="none"><path d="M1 9 C3 9,4 3,6 4.5 C8 6,9 9,11 7 C13 5,14 8,17 7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" fill="none"/><path d="M1 6 C3 4,5 7,7 5.5 C9 4,10 6.5,12 5 C14 3.5,15 5.5,17 4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" fill="none" opacity="0.45"/></svg> },
            { t: 'bar'   as const, icon: <svg width="18" height="13" viewBox="0 0 18 13" fill="none"><rect x="1" y="4" width="2.5" height="9" rx="1" fill="currentColor"/><rect x="4" y="7" width="2.5" height="6" rx="1" fill="currentColor" opacity="0.65"/><rect x="7" y="5.5" width="2.5" height="7.5" rx="1" fill="currentColor" opacity="0.35"/><rect x="11" y="2" width="2.5" height="11" rx="1" fill="currentColor"/><rect x="14" y="5" width="2.5" height="8" rx="1" fill="currentColor" opacity="0.65"/></svg> },
            { t: 'donut' as const, icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="6.5" stroke="currentColor" strokeWidth="1.8" fill="none"/><circle cx="7.5" cy="7.5" r="3" stroke="currentColor" strokeWidth="1.8" fill="none"/><path d="M7.5 1 A6.5 6.5 0 0 1 14 7.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg> },
          ]).map(({ t, icon }) => {
            const isAct = chartType === t;
            return (
              <button key={t} onClick={() => setChartType(t)} style={{
                width: 32, height: 28, borderRadius: 7, border: 'none', cursor: 'pointer',
                background: isAct ? (dark ? '#1e1e2e' : activeColor) : 'transparent',
                color: isAct ? '#fff' : sub,
                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
              }}>{icon}</button>
            );
          })}
        </div>
      </div>

      <div style={{ background: dark ? '#0a0a0a' : '#fff', borderRadius: 16, border: `1px solid ${border}`, padding: isMobile ? '12px 12px 10px' : '16px 20px 14px' }}>
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {activeCatData
              ? <div style={{ width: 10, height: 10, borderRadius: '50%', background: activeCatData.color }}/>
              : <div style={{ display: 'flex', gap: 3 }}>{cats.map(c => <div key={c.key} style={{ width: 7, height: 7, borderRadius: '50%', background: c.color }}/>)}</div>
            }
            <span style={{ fontSize: 14, fontWeight: 800, color: txt }}>
              {activeCatData ? `${activeCatData.name} ${t.planDynamics || 'dinamikasi'}` : (t.planCatCompare || 'Kategoriyalar solishtirmasi')}
            </span>
          </div>
          <div style={{ fontSize: 11, color: sub, marginTop: 2, marginLeft: 18 }}>
            {mode === 'days' ? (t.plan20daysLbl || 'Oxirgi 20 kun') : mode === 'weeks' ? (t.thisWeek || 'Joriy hafta') : (t.last6months || 'Oxirgi 6 oy')}
            {activeCat === 'ALL' ? ` · ${t.planAllCats || 'barcha kategoriyalar'}` : ''}
          </div>
        </div>

        {chartType === 'donut'
          ? activeCatData
            ? <SingleCatDonut cat={activeCatData} dark={dark} showBalances={showBalances} t={t} isMobile={isMobile} unit={unit}/>
            : <AllCatsDonut   cats={cats}          dark={dark} showBalances={showBalances} isMobile={isMobile}/>
          : chartType === 'line'
            ? <MultiLineChart  series={series} dark={dark} showBalances={showBalances} uid={uid}/>
            : <GroupedBarChart series={series} dark={dark} showBalances={showBalances} uid={uid}/>
        }

        {chartType !== 'donut' && (
          <div style={{ display: 'flex', gap: isMobile ? 6 : 8, marginTop: 10, flexWrap: 'wrap' }}>
            {(activeCatData ? [activeCatData] : cats).map(c => (
              <div key={c.key} style={{
                flex: '1 1 calc(33.33% - 8px)', minWidth: isMobile ? 76 : 100,
                background: infoB, borderRadius: 12, padding: isMobile ? '8px 9px' : '10px 12px',
                borderLeft: `3px solid ${c.color}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: c.color }}/>
                  <span style={{ fontSize: 10, color: sub }}>{c.name}</span>
                </div>
                <div style={{ fontSize: isMobile ? 16 : 20, fontWeight: 900, color: c.color, lineHeight: 1, marginBottom: 4 }}>
                  {c.pct}%
                </div>
                <div style={{ marginBottom: 5 }}>
                  <div style={{ fontSize: isMobile ? 10 : 11, fontWeight: 700, color: '#10b981', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {showBalances ? fmt(c.done) + ` ${planUnitLabel(unit, t)}` : '••••••'}
                  </div>
                  <div style={{ fontSize: 9, color: sub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    / {showBalances ? fmt(c.plan) + ` ${planUnitLabel(unit, t)}` : '••••••'}
                  </div>
                </div>
                <MiniBar pct={c.pct} color={c.color} dark={dark}/>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tarix: history helper ─────────────────────────────────────────────────────
const HIST_COUNT = 6;

function fmtM(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(0) + 'K';
  return String(n);
}

function agentMonthDetail(agent: AgentRow, idx: number, monthSlot: number, planCats: PlanCat[]) {
  const seed = agent.id * 17 + idx;
  const s    = seed + (HIST_COUNT - 1 - monthSlot) * 31;
  const base = agent.plan * 1_200_000 + (seed % 7) * 500_000;
  const plan = Math.round(base * (0.85 + ((s * 3) % 30) / 100));
  const wts  = planCats.map((_, i) => 20 + ((s * (i + 3)) % 25));
  const wSum = wts.reduce((a, b) => a + b, 0) || 1;
  const cats = planCats.map((c, i) => {
    const cp  = Math.round(plan * wts[i] / wSum);
    const pct = 35 + ((s + i * 13) % 58);
    return { ...c, plan: cp, done: Math.round(cp * pct / 100), pct };
  });
  const done = cats.reduce((a, c) => a + c.done, 0);
  return { plan, done, pct: Math.round((done / plan) * 100), cats };
}

// ─── Calendar Date Range Picker ────────────────────────────────────────────────
const CAL_DAYS   = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];
const CAL_MONTHS = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr'];

interface CalRange { start: Date | null; end: Date | null; }

function CalendarPicker({
  dark, dataMonths, onRangeChange, t,
}: {
  dark: boolean;
  dataMonths: Set<string>;
  onRangeChange: (r: CalRange) => void;
  t: Record<string, string>;
}) {
  const today = new Date();
  const [vYear,  setVYear]  = useState(today.getFullYear());
  const [vMonth, setVMonth] = useState(today.getMonth());
  const [range,  setRange]  = useState<CalRange>({ start: null, end: null });
  const [hover,  setHover]  = useState<Date | null>(null);
  const [phase,  setPhase]  = useState<'start' | 'end'>('start');

  const bg     = dark ? '#0f0f0f' : '#ffffff';
  const border = dark ? '#222' : '#e5e7eb';
  const txt    = dark ? '#e5e7eb' : '#111827';
  const sub    = dark ? '#6b7280' : '#9ca3af';

  function sameDay(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() &&
           a.getMonth()    === b.getMonth()    &&
           a.getDate()     === b.getDate();
  }

  function isInRange(d: Date) {
    const s = range.start;
    // Clamp hover to today so future days never light up as "in range"
    const rawHover = phase === 'end' && hover ? hover : null;
    const clampedHover = rawHover && isFutureDate(rawHover) ? today : rawHover;
    const e = range.end ?? clampedHover;
    if (!s || !e) return false;
    const dT = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const sT = new Date(s.getFullYear(), s.getMonth(), s.getDate()).getTime();
    const eT = new Date(e.getFullYear(), e.getMonth(), e.getDate()).getTime();
    const lo = Math.min(sT, eT), hi = Math.max(sT, eT);
    return dT > lo && dT < hi;
  }

  function isStartSel(d: Date) { return !!(range.start && sameDay(d, range.start)); }
  function isEndSel(d: Date)   { return !!(range.end   && sameDay(d, range.end));   }

  // Strictly after today (time-independent comparison)
  function isFutureDate(d: Date) {
    const todayMs = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const dMs     = new Date(d.getFullYear(),     d.getMonth(),     d.getDate()).getTime();
    return dMs > todayMs;
  }

  function handleDay(d: Date) {
    if (isFutureDate(d)) return; // block future dates
    if (phase === 'start' || (range.start && range.end)) {
      const nr = { start: d, end: null };
      setRange(nr); setPhase('end'); onRangeChange(nr);
    } else {
      if (!range.start) return;
      let s = range.start, e = d;
      if (s.getTime() > e.getTime()) [s, e] = [e, s];
      const nr = { start: s, end: e };
      setRange(nr); setPhase('start'); onRangeChange(nr);
    }
  }

  function hasData(d: Date) {
    if (isFutureDate(d)) return false; // no data for future dates
    return dataMonths.has(`${d.getFullYear()}-${d.getMonth()}`);
  }

  function prevM() {
    if (vMonth === 0) { setVYear(y => y - 1); setVMonth(11); }
    else setVMonth(m => m - 1);
  }
  function nextM() {
    if (vMonth === 11) { setVYear(y => y + 1); setVMonth(0); }
    else setVMonth(m => m + 1);
  }

  const firstDay    = new Date(vYear, vMonth, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(vYear, vMonth + 1, 0).getDate();

  const bannerLabel = (() => {
    if (!range.start) return null;
    const s    = range.start;
    const sLbl = `${s.getDate()} ${CAL_MONTHS[s.getMonth()].slice(0, 3)}`;
    if (!range.end) return `${sLbl} → ?`;
    const e = range.end;
    return `${sLbl} – ${e.getDate()} ${CAL_MONTHS[e.getMonth()].slice(0, 3)}`;
  })();

  return (
    <div
      style={{
        background: bg, borderRadius: 20, border: `1px solid ${border}`,
        padding: '20px 18px 16px', width: 312,
        boxShadow: dark ? '0 12px 48px rgba(0,0,0,0.65)' : '0 12px 48px rgba(0,0,0,0.14)',
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button onClick={prevM} style={{
          width: 32, height: 32, borderRadius: 9, border: `1px solid ${border}`,
          background: 'transparent', cursor: 'pointer', color: txt,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ChevronLeft size={16}/>
        </button>
        <span style={{ fontSize: 16, fontWeight: 800, color: txt }}>
          {CAL_MONTHS[vMonth]} {vYear}
        </span>
        <button onClick={nextM} style={{
          width: 32, height: 32, borderRadius: 9, border: `1px solid ${border}`,
          background: 'transparent', cursor: 'pointer', color: txt,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ChevronRight size={16}/>
        </button>
      </div>

      {/* Banner */}
      <div style={{
        background: '#6366f10f', border: '1px solid #6366f128', borderRadius: 10,
        padding: '9px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <Calendar size={14} color="#6366f1" style={{ flexShrink: 0 }}/>
        <span style={{ fontSize: 13, fontWeight: 600, color: bannerLabel ? '#6366f1' : sub }}>
          {bannerLabel ?? (t.calStartDate || "Boshlang'ich sanani tanlang")}
        </span>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
        {CAL_DAYS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: sub, paddingBottom: 6 }}>{d}</div>
        ))}
      </div>

      {/* Date cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`e${i}`} style={{ height: 40 }}/>
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const d      = new Date(vYear, vMonth, i + 1);
          const isTd   = sameDay(d, today);
          const isFut  = isFutureDate(d);
          const isSt   = isStartSel(d);
          const isEn   = isEndSel(d);
          const isSl   = isSt || isEn;
          const inRg   = !isFut && isInRange(d);
          const dot    = hasData(d); // already returns false for future dates

          return (
            <div
              key={i}
              onClick={() => handleDay(d)}
              onMouseEnter={() => !isFut && setHover(d)}
              onMouseLeave={() => setHover(null)}
              style={{
                position: 'relative', height: 40,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                borderRadius: isSl ? 10 : inRg ? 7 : 9,
                background: isSl
                  ? '#6366f1'
                  : inRg
                    ? (dark ? '#6366f125' : '#6366f112')
                    : 'transparent',
                border: isTd && !isSl
                  ? `1.5px solid ${dark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.20)'}`
                  : '1.5px solid transparent',
                cursor: isFut ? 'not-allowed' : 'pointer',
                transition: 'background 0.1s',
                opacity: isFut ? 0.28 : 1,
                pointerEvents: isFut ? 'none' : 'auto',
              }}
            >
              <span style={{
                fontSize: 13, lineHeight: 1,
                fontWeight: isSl ? 800 : isTd ? 700 : 500,
                color: isSl ? '#fff' : inRg ? (dark ? '#818cf8' : '#6366f1') : txt,
              }}>
                {i + 1}
              </span>
              {dot && (
                <div style={{
                  width: 4, height: 4, borderRadius: '50%',
                  background: isSl ? 'rgba(255,255,255,0.75)' : '#10b981',
                  position: 'absolute', bottom: 4,
                }}/>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 20, marginTop: 14, paddingTop: 12, borderTop: `1px solid ${border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1' }}/>
          <span style={{ fontSize: 12, color: sub }}>{t.calSelected || 'Tanlangan'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }}/>
          <span style={{ fontSize: 12, color: sub }}>{t.calHasData || "Ma'lumot bor"}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Tarix Stat Full Page ─────────────────────────────────────────────────────
function TarixStatPage({
  allData, planCats, dark, showBalances, onClose, onAgentClick, t,
}: {
  allData: { agent: AgentRow; data: AgentPlanDisplayData }[];
  planCats: PlanCat[];
  dark: boolean;
  showBalances: boolean;
  onClose: () => void;
  onAgentClick?: (agent: AgentRow, agentIdx: number) => void;
  t: Record<string, string>;
}) {
  const bg     = dark ? '#050505' : '#f8fafc';
  const card   = dark ? '#0a0a0a' : '#ffffff';
  const border = dark ? '#1e1e1e' : '#e5e7eb';
  const txt    = dark ? '#e5e7eb' : '#111827';
  const sub    = dark ? '#6b7280' : '#9ca3af';
  const hdr    = dark ? '#111111' : '#f3f4f6';
  const hdr2   = dark ? '#0d0d0d' : '#f9fafb';
  const [isMobile, setIsMobile] = useState(false);
  const [selCatKey, setSelCatKey] = useState<string>('all');

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const [selMonths, setSelMonths] = useState<Set<number>>(new Set(Array.from({ length: HIST_COUNT }, (_, i) => i)));
  const [calOpen,   setCalOpen]   = useState(false);
  const [calRange,  setCalRange]  = useState<CalRange>({ start: null, end: null });
  const calWrapRef = useRef<HTMLDivElement>(null);

  const now = new Date();
  const monthLabels: string[] = Array.from({ length: HIST_COUNT }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (HIST_COUNT - 1 - i), 1);
    return MONTH_NAMES[d.getMonth()];
  });

  // Set of "YYYY-M" strings for all historical months (for calendar dots)
  const dataMonthsSet = useMemo(() => {
    const s = new Set<string>();
    for (let i = 0; i < HIST_COUNT; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - (HIST_COUNT - 1 - i), 1);
      s.add(`${d.getFullYear()}-${d.getMonth()}`);
    }
    return s;
  }, []);

  // Convert a CalRange to a Set of month indices
  function rangeToSelMonths(r: CalRange): Set<number> {
    if (!r.start) return new Set(Array.from({ length: HIST_COUNT }, (_, i) => i));
    const end = r.end ?? r.start;
    const lo  = r.start.getTime() <= end.getTime() ? r.start : end;
    const hi  = r.start.getTime() <= end.getTime() ? end     : r.start;
    const result = new Set<number>();
    for (let i = 0; i < HIST_COUNT; i++) {
      const mS = new Date(now.getFullYear(), now.getMonth() - (HIST_COUNT - 1 - i), 1);
      const mE = new Date(now.getFullYear(), now.getMonth() - (HIST_COUNT - 1 - i) + 1, 0);
      mE.setHours(23, 59, 59, 999);
      if (mS.getTime() <= hi.getTime() && mE.getTime() >= lo.getTime()) result.add(i);
    }
    return result.size > 0 ? result : new Set([HIST_COUNT - 1]);
  }

  const isAllSelected = selMonths.size === HIST_COUNT && !calRange.start;

  function selectAll() {
    setSelMonths(new Set(Array.from({ length: HIST_COUNT }, (_, i) => i)));
    setCalRange({ start: null, end: null });
    setCalOpen(false);
  }

  function pctCol(p: number) {
    if (p >= 75) return '#10b981';
    if (p >= 45) return '#f59e0b';
    return '#ef4444';
  }

  const rows = useMemo(() => {
    const selectedArr = Array.from(selMonths).sort();
    return allData
      .map((x, i) => {
        const monthDetails = selectedArr.map(mIdx => agentMonthDetail(x.agent, i, mIdx, planCats));
        const aggPlan = monthDetails.reduce((s, d) => s + d.plan, 0);
        const aggDone = monthDetails.reduce((s, d) => s + d.done, 0);
        const aggPct  = aggPlan > 0 ? Math.round((aggDone / aggPlan) * 100) : 0;
        const aggCats = planCats.map((_, ci) => {
          const cp = monthDetails.reduce((s, d) => s + d.cats[ci].plan, 0);
          const cd = monthDetails.reduce((s, d) => s + d.cats[ci].done, 0);
          return { ...planCats[ci], plan: cp, done: cd, pct: cp > 0 ? Math.round((cd / cp) * 100) : 0 };
        });
        return { agent: x.agent, data: x.data, plan: aggPlan, done: aggDone, pct: aggPct, cats: aggCats };
      })
      .sort((a, b) => b.pct - a.pct);
  }, [allData, selMonths, planCats]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Close calendar on click outside
  useEffect(() => {
    if (!calOpen) return;
    function handle(e: MouseEvent) {
      if (calWrapRef.current && !calWrapRef.current.contains(e.target as Node)) {
        setCalOpen(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [calOpen]);

  const v = (n: number) => showBalances ? fmtM(n) : '––';

  const totPlan = rows.reduce((s, r) => s + r.plan, 0);
  const totDone = rows.reduce((s, r) => s + r.done, 0);
  const totPct  = totPlan > 0 ? Math.round((totDone / totPlan) * 100) : 0;
  const catTots = planCats.map((_, ci) => ({
    plan: rows.reduce((s, r) => s + r.cats[ci].plan, 0),
    done: rows.reduce((s, r) => s + r.cats[ci].done, 0),
    pct:  rows.length > 0 ? Math.round(rows.reduce((s, r) => s + r.cats[ci].pct, 0) / rows.length) : 0,
  }));

  const C = border;
  const NUM_W  = isMobile ? 26 : 38;
  const ISM_W  = isMobile ? 98 : 140;
  const th0: React.CSSProperties = {
    padding: isMobile ? '5px 4px' : '8px 12px', 
    fontSize: isMobile ? 9 : 11, 
    fontWeight: 700,
    whiteSpace: 'nowrap', position: 'sticky', top: 0, zIndex: 2,
    background: hdr, color: sub,
    borderBottom: `2px solid ${C}`, borderRight: `1px solid ${C}`,
  };
  const th1: React.CSSProperties = {
    ...th0, background: hdr2, borderBottom: `1px solid ${C}`,
    top: isMobile ? 27 : 34, fontWeight: 600, fontSize: isMobile ? 8 : 10,
  };
  const tdBase = (extra?: React.CSSProperties): React.CSSProperties => ({
    padding: isMobile ? '6px 4px' : '9px 12px', 
    fontSize: isMobile ? 10 : 12, 
    whiteSpace: 'nowrap',
    borderBottom: `1px solid ${C}`, borderRight: `1px solid ${C}`,
    color: txt, textAlign: 'right', background: card, ...extra,
  });
  const pctTd = (p: number): React.CSSProperties => ({
    ...tdBase(), textAlign: 'center', fontWeight: 800, color: pctCol(p),
  });
  // sticky helpers
  const ISM_SHADOW = '3px 0 8px rgba(0,0,0,0.22)';
  const stickyNum  = (bg?: string): React.CSSProperties => ({ position: 'sticky', left: 0,       zIndex: 1, background: bg ?? card });
  const stickyIsm  = (bg?: string): React.CSSProperties => ({ position: 'sticky', left: NUM_W,   zIndex: 1, background: bg ?? card, boxShadow: ISM_SHADOW });
  const thAgentSpan: React.CSSProperties = { position: 'sticky', left: 0, zIndex: 4, background: hdr,  borderRight: 'none', boxShadow: ISM_SHADOW };
  const thNum1: React.CSSProperties = { position: 'sticky', left: 0,     zIndex: 3, background: hdr2, borderRight: 'none' };
  const thIsm1: React.CSSProperties = { position: 'sticky', left: NUM_W, zIndex: 3, background: hdr2, boxShadow: ISM_SHADOW };

  return (
    <div className="stat-overlay" style={{
      position: 'fixed', top: 'var(--nav-h, 65px)', right: 0, bottom: 0,
      left: 'var(--sb-w, 0px)',
      zIndex: 200, background: bg,
      display: 'flex', flexDirection: 'column',
      animation: 'slideUpPage 0.28s cubic-bezier(.4,0,.2,1)',
    }}>
      <style>{`
        @media(max-width:767px){.stat-overlay{left:0!important}}
        @keyframes slideUpPage{from{transform:translateY(14px);opacity:0}to{transform:translateY(0);opacity:1}}
        .tx-tr:hover > td { background: ${dark ? '#161616' : '#f0f4ff'} !important; }
      `}</style>

      {/* SUB-NAVBAR */}
      <div style={{ background: card, borderBottom: `1px solid ${border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: isMobile ? '10px 12px 8px' : '10px 18px' }}>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 9, border: 'none', cursor: 'pointer',
            background: dark ? '#1a1a1a' : '#f1f5f9',
            color: txt, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <ArrowLeft size={15}/>
          </button>

          <span style={{ fontSize: isMobile ? 13 : 15, fontWeight: 800, color: txt, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {t.planHistTitle || 'Tarix statistika'}
          </span>

          {!isMobile && <span style={{ fontSize: 12, color: sub, flexShrink: 0, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {calRange.start && calRange.end
              ? `— ${calRange.start.getDate()} ${CAL_MONTHS[calRange.start.getMonth()].slice(0,3)} – ${calRange.end.getDate()} ${CAL_MONTHS[calRange.end.getMonth()].slice(0,3)}`
              : isAllSelected
                ? `— ${t.planAllMonths || 'Hammasi'} (${HIST_COUNT} oy)`
                : `— ${Array.from(selMonths).sort().map(i => monthLabels[i]).join(', ')}`}
          </span>}

          <div style={{ flex: 1 }}/>

          {/* Calendar controls */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
            <button
              onClick={selectAll}
              style={{
                padding: isMobile ? '5px 10px' : '6px 14px', borderRadius: 9, flexShrink: 0,
                border: `1.5px solid ${isAllSelected ? '#10b981' : border}`,
                background: isAllSelected ? '#10b981' : 'transparent',
                color: isAllSelected ? '#fff' : sub,
                fontSize: isMobile ? 11 : 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                whiteSpace: 'nowrap',
              }}
            >{t.planAllMonths || 'Hammasi'}</button>

            <div ref={calWrapRef} style={{ position: 'relative', flexShrink: 0 }}>
              <button
                onClick={() => setCalOpen(o => !o)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: isMobile ? '5px 10px' : '6px 14px', borderRadius: 9,
                  border: `1.5px solid ${calOpen || calRange.start ? '#6366f1' : border}`,
                  background: calOpen || calRange.start ? '#6366f10f' : 'transparent',
                  color: calOpen || calRange.start ? '#6366f1' : sub,
                  fontSize: isMobile ? 11 : 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >
                <Calendar size={isMobile ? 12 : 13}/>
                {isMobile
                  ? (calRange.start
                    ? `${calRange.start.getDate()}/${calRange.start.getMonth()+1}${calRange.end ? `–${calRange.end.getDate()}/${calRange.end.getMonth()+1}` : ''}`
                    : 'Sana')
                  : (calRange.start && calRange.end
                    ? `${calRange.start.getDate()} ${CAL_MONTHS[calRange.start.getMonth()].slice(0,3)} – ${calRange.end.getDate()} ${CAL_MONTHS[calRange.end.getMonth()].slice(0,3)}`
                    : calRange.start
                      ? `${calRange.start.getDate()} ${CAL_MONTHS[calRange.start.getMonth()].slice(0,3)} → ?`
                      : (t.planSelectDate || 'Sana tanlash'))}
              </button>

              {calOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)',
                  right: 0,
                  zIndex: 9999,
                }}>
                  <CalendarPicker
                    dark={dark}
                    t={t}
                    dataMonths={dataMonthsSet}
                    onRangeChange={r => {
                      setCalRange(r);
                      setSelMonths(rangeToSelMonths(r));
                      if (r.end) setCalOpen(false);
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Category Tabs */}
        <div style={{ 
          display: 'flex', gap: 8, overflowX: 'auto', 
          padding: isMobile ? '10px 12px' : '12px 18px', borderTop: `1px solid ${border}`, 
          WebkitOverflowScrolling: 'touch', background: card,
        }}>
          <button onClick={() => setSelCatKey('all')} style={{
            padding: '6px 14px', borderRadius: 12, border: 'none',
            background: selCatKey === 'all' ? '#10b981' : (dark ? '#1a1a1a' : '#f1f5f9'),
            color: selCatKey === 'all' ? '#fff' : sub,
            fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s',
          }}>
            {t.planAll || 'Hammasi'}
          </button>
          {planCats.map(c => (
            <button key={c.key} onClick={() => setSelCatKey(c.key)} style={{
              padding: '6px 14px', borderRadius: 12, border: 'none',
              background: selCatKey === c.key ? c.color : (dark ? '#1a1a1a' : '#f1f5f9'),
              color: selCatKey === c.key ? '#fff' : sub,
              fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s',
            }}>
              {c.name}
            </button>
          ))}
        </div>

        {/* Summary strip */}
        <div style={{ display: 'flex', borderTop: `1px solid ${border}`, flexWrap: 'wrap' }}>
          {([
            { lbl: t.planAgents || 'Agentlar',     val: `${rows.length} ta`,                          c: txt,            w: isMobile ? '33.33%' : 'auto' },
            { lbl: '80%+',                          val: `${rows.filter(r => r.pct >= 80).length} ta`, c: '#10b981',      w: isMobile ? '33.33%' : 'auto' },
            { lbl: t.planTotalPlan || 'Jami plan', val: v(totPlan) + ` ${planUnitLabel('som', t)}`,           c: sub,            w: isMobile ? '33.33%' : 'auto' },
            { lbl: t.planExecuted  || 'Bajardi',   val: v(totDone) + ` ${planUnitLabel('som', t)}`,           c: '#6366f1',      w: isMobile ? '50%' : 'auto'    },
            { lbl: '%',                            val: `${totPct}%`,                                  c: pctCol(totPct), w: isMobile ? '50%' : 'auto'    },
          ] as { lbl: string; val: string; c: string; w: string }[]).map((s, i, arr) => (
            <div key={s.lbl} style={{
              flex: isMobile ? `0 0 ${s.w}` : 1,
              padding: isMobile ? '6px 10px' : '7px 14px',
              borderRight: isMobile
                ? (i === 2 || i === 4 ? 'none' : `1px solid ${border}`)
                : (i < arr.length - 1 ? `1px solid ${border}` : 'none'),
              borderBottom: isMobile && i < 3 ? `1px solid ${border}` : 'none',
              minWidth: 0, overflow: 'hidden',
              boxSizing: 'border-box' as const,
            }}>
              <div style={{ fontSize: isMobile ? 9 : 10, color: sub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.lbl}</div>
              <div style={{ fontSize: isMobile ? 12 : 14, fontWeight: 800, color: s.c, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* TABLE */}
      <div style={{ flex: 1, overflow: 'auto', WebkitOverflowScrolling: 'touch' as any }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: isMobile ? 374 : 860, tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: NUM_W }}/>
            <col style={{ width: ISM_W }}/>
            {(selCatKey === 'all' || selCatKey === 'UMUMIY') && (
              <>
                {!isMobile && <col style={{ width: 90 }}/>}
                <col style={{ width: isMobile ? 72 : 90 }}/>
                <col style={{ width: isMobile ? 46 : 62 }}/>
              </>
            )}
            {planCats.filter(c => selCatKey === 'all' || selCatKey === c.key).flatMap(c => {
              if (!isMobile) {
                return [<col key={c.key+'-pl'} style={{ width: 90 }}/>, <col key={c.key+'-do'} style={{ width: 90 }}/>, <col key={c.key+'-pc'} style={{ width: 62 }}/>];
              }
              if (selCatKey === 'all') {
                return [<col key={c.key+'-m'} style={{ width: 44 }}/>];
              }
              return [<col key={c.key+'-do'} style={{ width: 80 }}/>, <col key={c.key+'-pc'} style={{ width: 50 }}/>];
            })}
          </colgroup>
          <thead>
            {/* ROW 1 – group headers */}
            <tr>
              <th colSpan={2} style={{ ...th0, textAlign: 'left', ...thAgentSpan }}>Agent</th>
              {(selCatKey === 'all' || selCatKey === 'UMUMIY') && (
                <th colSpan={isMobile ? 2 : 3} style={{ ...th0, textAlign: 'center', color: txt }}>{t.planUmumiy || 'Umumiy'}</th>
              )}
              {planCats.filter(c => selCatKey === 'all' || selCatKey === c.key).map(c => (
                <th key={c.key} colSpan={isMobile ? (selCatKey === 'all' ? 1 : 2) : 3} style={{ ...th0, textAlign: 'center', color: c.color }}>{c.name}</th>
              ))}
            </tr>
            {/* ROW 2 – sub-headers */}
            <tr>
              <th style={{ ...th1, textAlign: 'center', ...thNum1 }}>#</th>
              <th style={{ ...th1, textAlign: 'left',   ...thIsm1 }}>{t.planSortName?.replace(/ .+/, '') || 'Ism'}</th>
              {(selCatKey === 'all' || selCatKey === 'UMUMIY') && (
                <>
                  {!isMobile && <th style={{ ...th1, textAlign: 'right' }}>{t.planReja || 'Plan'}</th>}
                  <th style={{ ...th1, textAlign: 'right' }}>{isMobile ? 'Baj.' : (t.planExecuted || 'Bajardi')}</th>
                  <th style={{ ...th1, textAlign: 'center' }}>%</th>
                </>
              )}
              {planCats.filter(c => selCatKey === 'all' || selCatKey === c.key).flatMap(c => {
                if (!isMobile) {
                  return [
                    <th key={c.key+'-plan'} style={{ ...th1, textAlign: 'right' }}>{t.planReja || 'Plan'}</th>,
                    <th key={c.key+'-done'} style={{ ...th1, textAlign: 'right' }}>{t.planExecuted || 'Bajardi'}</th>,
                    <th key={c.key+'-pct'}  style={{ ...th1, textAlign: 'center' }}>%</th>,
                  ];
                }
                if (selCatKey === 'all') {
                  return [<th key={c.key+'-pct'} style={{ ...th1, textAlign: 'center' }}>%</th>];
                }
                return [
                  <th key={c.key+'-done'} style={{ ...th1, textAlign: 'right' }}>{isMobile ? 'Baj.' : (t.planExecuted || 'Bajardi')}</th>,
                  <th key={c.key+'-pct'} style={{ ...th1, textAlign: 'center' }}>%</th>
                ];
              })}
            </tr>
          </thead>

          <tbody>
            {rows.map((row, i) => (
              <tr key={row.agent.id} className="tx-tr"
                onClick={() => {
                  if (onAgentClick) {
                    const idx = allData.findIndex(x => x.agent.id === row.agent.id);
                    onAgentClick(row.agent, idx);
                  }
                }}
                style={{ cursor: onAgentClick ? 'pointer' : 'default' }}
              >
                <td style={{ ...tdBase({ textAlign: 'center' }), ...stickyNum(), borderRight: 'none',
                  fontSize: i < 3 ? (isMobile ? 12 : 15) : (isMobile ? 10 : 12), fontWeight: 700,
                  color: i < 3 ? (['#f59e0b','#9ca3af','#cd7c3f'] as string[])[i] : sub,
                }}>
                  {i < 3 ? MEDALS[i] : i + 1}
                </td>
                <td style={{ ...tdBase({ textAlign: 'left', fontWeight: 600, fontSize: isMobile ? 11 : 12 }), ...stickyIsm(), overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {row.agent.name}
                </td>
                {(selCatKey === 'all' || selCatKey === 'UMUMIY') && (
                  <>
                    {!isMobile && <td style={tdBase({ color: sub })}>{v(row.plan)}</td>}
                    <td style={tdBase({ fontWeight: 700 })}>{v(row.done)}</td>
                    <td style={pctTd(row.pct)}>
                      <MiniPctCell pct={row.pct} color={pctCol(row.pct)} dark={dark}/>
                    </td>
                  </>
                )}
                {row.cats.filter(cat => selCatKey === 'all' || selCatKey === cat.key).flatMap(cat => {
                  if (!isMobile) {
                    return [
                      <td key={cat.key+'-plan'} style={tdBase({ color: sub })}>{v(cat.plan)}</td>,
                      <td key={cat.key+'-done'} style={tdBase({ fontWeight: 600 })}>{v(cat.done)}</td>,
                      <td key={cat.key+'-pct'}  style={pctTd(cat.pct)}>
                        <MiniPctCell pct={cat.pct} color={pctCol(cat.pct)} dark={dark}/>
                      </td>,
                    ];
                  }
                  if (selCatKey === 'all') {
                    return [
                      <td key={cat.key+'-pct'} style={pctTd(cat.pct)}>
                        <MiniPctCell pct={cat.pct} color={pctCol(cat.pct)} dark={dark} compact/>
                      </td>,
                    ];
                  }
                  return [
                    <td key={cat.key+'-done'} style={tdBase({ fontWeight: 600 })}>{v(cat.done)}</td>,
                    <td key={cat.key+'-pct'} style={pctTd(cat.pct)}>
                      <MiniPctCell pct={cat.pct} color={pctCol(cat.pct)} dark={dark} compact/>
                    </td>
                  ];
                })}
              </tr>
            ))}

            {/* Jami row */}
            <tr style={{ background: dark ? '#111' : '#f3f4f6' }}>
              <td colSpan={2} style={{
                ...tdBase({ textAlign: 'left', fontWeight: 700 }),
                ...stickyNum(dark ? '#111' : '#f3f4f6'),
                borderRight: 'none', boxShadow: ISM_SHADOW,
              }}>
                {t.planJami || 'Jami'} ({rows.length} ta)
              </td>
              {(selCatKey === 'all' || selCatKey === 'UMUMIY') && (
                <>
                  {!isMobile && <td style={tdBase({ color: sub, background: dark ? '#111' : '#f3f4f6' })}>{v(totPlan)}</td>}
                  <td style={tdBase({ fontWeight: 700, background: dark ? '#111' : '#f3f4f6' })}>{v(totDone)}</td>
                  <td style={{ ...pctTd(totPct), background: dark ? '#111' : '#f3f4f6' }}>
                    <MiniPctCell pct={totPct} color={pctCol(totPct)} dark={dark}/>
                  </td>
                </>
              )}
              {catTots.filter((_, ci) => selCatKey === 'all' || selCatKey === planCats[ci].key).flatMap((ct, ci) => {
                if (!isMobile) {
                  return [
                    <td key={ci+'-plan'} style={tdBase({ color: sub, background: dark ? '#111' : '#f3f4f6' })}>{v(ct.plan)}</td>,
                    <td key={ci+'-done'} style={tdBase({ fontWeight: 700, background: dark ? '#111' : '#f3f4f6' })}>{v(ct.done)}</td>,
                    <td key={ci+'-pct'}  style={{ ...pctTd(ct.pct), background: dark ? '#111' : '#f3f4f6' }}>
                      <MiniPctCell pct={ct.pct} color={pctCol(ct.pct)} dark={dark}/>
                    </td>,
                  ];
                }
                if (selCatKey === 'all') {
                  return [
                    <td key={ci+'-pct'} style={{ ...pctTd(ct.pct), background: dark ? '#111' : '#f3f4f6' }}>
                      <MiniPctCell pct={ct.pct} color={pctCol(ct.pct)} dark={dark} compact/>
                    </td>,
                  ];
                }
                return [
                  <td key={ci+'-done'} style={tdBase({ fontWeight: 700, background: dark ? '#111' : '#f3f4f6' })}>{v(ct.done)}</td>,
                  <td key={ci+'-pct'} style={{ ...pctTd(ct.pct), background: dark ? '#111' : '#f3f4f6' }}>
                    <MiniPctCell pct={ct.pct} color={pctCol(ct.pct)} dark={dark} compact/>
                  </td>
                ];
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── tiny inline pct display ───────────────────────────────────────────────────
function MiniPctCell({ pct, color, dark, compact }: { pct: number; color: string; dark: boolean; compact?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: compact ? 1 : 2 }}>
      <span style={{ fontSize: compact ? 10 : 11, fontWeight: 800, color }}>{pct}%</span>
      <div style={{ width: compact ? 28 : 36, height: 3, borderRadius: 3, background: dark ? '#2a2a2a' : '#e5e7eb', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 3 }}/>
      </div>
    </div>
  );
}

// ─── Monthly History Table ─────────────────────────────────────────────────────
function MonthlyHistoryTable({ agent, agentIdx, planCats, dark, showBalances, t }: {
  agent: AgentRow; agentIdx: number; planCats: PlanCat[]; dark: boolean; showBalances: boolean; t: Record<string, string>;
}) {
  const border = dark ? '#1e1e1e' : '#e5e7eb';
  const txt    = dark ? '#e5e7eb' : '#111827';
  const sub    = dark ? '#6b7280' : '#9ca3af';
  const card   = dark ? '#0a0a0a' : '#fff';
  const hdr    = dark ? '#111111' : '#f3f4f6';
  const [isMobile, setIsMobile] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const now = new Date();
  const months = Array.from({ length: HIST_COUNT }, (_, i) => {
    const d      = new Date(now.getFullYear(), now.getMonth() - (HIST_COUNT - 1 - i), 1);
    const detail = agentMonthDetail(agent, agentIdx, i, planCats);
    return { label: MONTH_NAMES[d.getMonth()], ...detail };
  });

  function pctCol(p: number) { return p >= 75 ? '#10b981' : p >= 45 ? '#f59e0b' : '#ef4444'; }
  function toggleRow(i: number) {
    const newSet = new Set(expandedRows);
    if (newSet.has(i)) newSet.delete(i);
    else newSet.add(i);
    setExpandedRows(newSet);
  }

  const thS: React.CSSProperties = {
    padding: isMobile ? '6px 8px' : '8px 12px', 
    fontSize: isMobile ? 10 : 11, 
    fontWeight: 700, 
    color: sub,
    borderBottom: `2px solid ${border}`, 
    background: hdr, 
    whiteSpace: 'nowrap',
    position: 'sticky', top: 0, zIndex: 2,
  };
  const stickyMonth = { position: 'sticky', left: 0, zIndex: 3, background: hdr, boxShadow: '3px 0 8px rgba(0,0,0,0.1)' } as React.CSSProperties;
  const stickyMonthTd = { position: 'sticky', left: 0, zIndex: 1, background: card, boxShadow: '3px 0 8px rgba(0,0,0,0.1)' } as React.CSSProperties;

  return (
    <div style={{ overflowX: 'auto', margin: isMobile ? '0 -16px' : 0, padding: isMobile ? '0 16px' : 0 }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: isMobile ? 320 : 560 }}>
        <thead>
          <tr>
            <th style={{ ...thS, textAlign: 'left', ...(isMobile ? stickyMonth : {}) }}>{t.planMonth || 'Oy'}</th>
            {!isMobile && <th style={{ ...thS, textAlign: 'right' }}>{t.planReja || 'Plan'}</th>}
            <th style={{ ...thS, textAlign: 'right' }}>{t.planExecuted || 'Bajardi'}</th>
            <th style={{ ...thS, textAlign: 'center', width: isMobile ? 50 : 72 }}>%</th>
            {!isMobile && planCats.map(c => (
              <th key={c.key} style={{ ...thS, textAlign: 'center', color: c.color, width: 72 }}>{c.name}</th>
            ))}
            {isMobile && <th style={{ ...thS, width: 40 }}></th>}
          </tr>
        </thead>
        <tbody>
          {months.map((m, mi) => {
            const isExpanded = expandedRows.has(mi);
            return [
              <tr key={`r-${mi}`} onClick={() => isMobile && toggleRow(mi)} style={{ borderBottom: `1px solid ${border}`, cursor: isMobile ? 'pointer' : 'default' }}>
                  <td style={{ padding: isMobile ? '9px 10px' : '9px 12px', fontSize: isMobile ? 12 : 13, fontWeight: 700, color: txt, ...(isMobile ? stickyMonthTd : {}) }}>{m.label}</td>
                  {!isMobile && (
                    <td style={{ padding: '9px 12px', fontSize: 12, color: sub, textAlign: 'right', background: card }}>
                      {showBalances ? fmtM(m.plan) : '––'}
                    </td>
                  )}
                  <td style={{ padding: isMobile ? '9px 10px' : '9px 12px', fontSize: isMobile ? 12 : 12, fontWeight: 700, color: '#10b981', textAlign: 'right', background: card }}>
                    {showBalances ? fmtM(m.done) : '––'}
                    {isMobile && <div style={{ fontSize: 10, color: sub, fontWeight: 400 }}>/ {showBalances ? fmtM(m.plan) : '––'}</div>}
                  </td>
                  <td style={{ padding: isMobile ? '9px 10px' : '9px 12px', textAlign: 'center', background: card }}>
                    <MiniPctCell pct={m.pct} color={pctCol(m.pct)} dark={dark} compact={isMobile}/>
                  </td>
                  {!isMobile && m.cats.map(c => (
                    <td key={c.key} style={{ padding: '9px 12px', textAlign: 'center', background: card }}>
                      <MiniPctCell pct={c.pct} color={pctCol(c.pct)} dark={dark}/>
                    </td>
                  ))}
                  {isMobile && (
                    <td style={{ padding: '9px 10px', textAlign: 'center', background: card, color: sub }}>
                      {isExpanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                    </td>
                  )}
                </tr>,
              isMobile && isExpanded ? (
                <tr key={`e-${mi}`} style={{ background: dark ? '#111' : '#f9fafb', borderBottom: `1px solid ${border}` }}>
                  <td colSpan={5} style={{ padding: '10px 16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {m.cats.map(c => (
                        <div key={c.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 8, height: 8, borderRadius: 2, background: c.color }}/>
                            <span style={{ fontSize: 12, fontWeight: 600, color: txt }}>{c.name}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: txt }}>{showBalances ? fmtM(c.done) : '––'}</div>
                              <div style={{ fontSize: 10, color: sub }}>/ {showBalances ? fmtM(c.plan) : '––'}</div>
                            </div>
                            <div style={{ width: 40 }}>
                              <MiniPctCell pct={c.pct} color={pctCol(c.pct)} dark={dark} compact/>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              ) : null,
            ];
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Agent Stat Full Page ──────────────────────────────────────────────────────
function AgentStatPage({
  agent, agentIdx, planCats, planData, dark, showBalances, onClose, t,
}: {
  agent: AgentRow;
  agentIdx: number;
  planCats: PlanCat[];
  planData: AgentPlanDisplayData;
  dark: boolean;
  showBalances: boolean;
  onClose: () => void;
  t: Record<string, string>;
}) {
  const [mode, setMode] = useState<ViewMode>('months');

  const data      = planData;
  const histItems = useMemo(
    () => genHistory(agent.id * 17 + agentIdx, mode, data.planSum),
    [agent.id, agentIdx, mode, data.planSum],
  );

  const bg     = dark ? '#050505' : '#f8fafc';
  const card   = dark ? '#0a0a0a' : '#ffffff';
  const border = dark ? '#1e1e1e' : '#e5e7eb';
  const txt    = dark ? '#e5e7eb' : '#111827';
  const sub    = dark ? '#6b7280' : '#9ca3af';
  const infoB  = dark ? '#111' : '#f8fafc';
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  function pctCol(p: number) { return p >= 75 ? '#10b981' : p >= 45 ? '#f59e0b' : '#ef4444'; }
  const color    = pctCol(data.donePct);
  const initials = agent.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div className="agent-stat-overlay" style={{
      position: 'fixed', top: 'var(--nav-h, 65px)', right: 0, bottom: 0,
      left: 'var(--sb-w, 0px)',
      zIndex: 201, background: bg,
      display: 'flex', flexDirection: 'column',
      animation: 'slideUpPage 0.28s cubic-bezier(.4,0,.2,1)',
    }}>
      <style>{`
        @media(max-width:767px){.agent-stat-overlay{left:0!important}}
        @keyframes slideUpPage{from{transform:translateY(14px);opacity:0}to{transform:translateY(0);opacity:1}}
      `}</style>

      {/* ── SUB-NAVBAR ── */}
      <div style={{ background: card, borderBottom: `1px solid ${border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12, padding: isMobile ? '10px 12px' : '10px 18px' }}>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 9, border: 'none', cursor: 'pointer',
            background: dark ? '#1a1a1a' : '#f1f5f9',
            color: txt, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <ArrowLeft size={15}/>
          </button>

          <div style={{
            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
            background: color + '1a', border: `1.5px solid ${color}40`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 800, color,
          }}>{initials}</div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: isMobile ? 13 : 15, fontWeight: 800, color: txt, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
              {agent.name}
            </div>
            <div style={{ fontSize: 11, color: sub }}>{agent.phone || 'Agent'}</div>
          </div>

          {/* ViewMode switcher */}
          <div style={{ display: 'flex', gap: 2, background: dark ? '#111' : '#f1f5f9', borderRadius: 10, padding: 3, flexShrink: 0 }}>
            {([['months', isMobile ? '6 oy' : (t.plan6months||'6 oy')], ['weeks', isMobile ? 'Hafta' : (t.thisWeek||'Hafta')], ['days', isMobile ? '20K' : (t.plan20days||'20 kun')]] as [ViewMode, string][]).map(([m, lbl]) => {
              const isAct = mode === m;
              return (
                <button key={m} onClick={() => setMode(m)} style={{
                  padding: isMobile ? '5px 8px' : '5px 13px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: isAct ? (dark ? '#1e1e2e' : '#6366f1') : 'transparent',
                  color: isAct ? (dark ? '#818cf8' : '#fff') : sub,
                  fontSize: isMobile ? 11 : 12, fontWeight: isAct ? 700 : 500, transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                }}>{lbl}</button>
              );
            })}
          </div>
        </div>

        {/* Summary strip */}
        <div style={{ display: 'flex', borderTop: `1px solid ${border}`, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
          {([
            { lbl: t.planReja      || 'Reja',      val: showBalances ? fmtM(data.planSum)   + ` ${planUnitLabel(data.unit, t)}` : '––', c: sub       },
            { lbl: t.planDone      || 'Bajarildi', val: showBalances ? fmtM(data.doneSum)   + ` ${planUnitLabel(data.unit, t)}` : '––', c: '#10b981' },
            { lbl: t.planRemaining || 'Qoldi',     val: showBalances ? fmtM(data.remaining) + ` ${planUnitLabel(data.unit, t)}` : '––', c: '#f59e0b' },
            { lbl: t.planExecution || 'Bajarish',  val: `${data.donePct}%`,                                              c: color     },
          ] as { lbl: string; val: string; c: string }[]).map((s, i, arr) => (
            <div key={s.lbl} style={{
              flex: isMobile ? '0 0 50%' : 1,
              padding: isMobile ? '6px 10px' : '7px 14px',
              borderRight: isMobile
                ? (i === 1 || i === 3 ? 'none' : `1px solid ${border}`)
                : (i < arr.length - 1 ? `1px solid ${border}` : 'none'),
              borderBottom: isMobile && i < 2 ? `1px solid ${border}` : 'none',
              minWidth: 0, overflow: 'hidden',
              boxSizing: 'border-box' as const,
            }}>
              <div style={{ fontSize: isMobile ? 9 : 10, color: sub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.lbl}</div>
              <div style={{ fontSize: isMobile ? 12 : 14, fontWeight: 800, color: s.c, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '12px' : '20px' }}>

        {/* Top row: Donut + Line chart */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: 16, marginBottom: 16, alignItems: 'start',
        }}>

          {/* Donut card */}
          <div style={{ 
            background: card, 
            borderRadius: 18, 
            border: `1px solid ${border}`, 
            padding: isMobile ? '14px 14px' : '18px 16px',
            width: isMobile ? '100%' : 'auto',
            minWidth: isMobile ? '100%' : '180px',
            maxWidth: isMobile ? '100%' : '220px',
            flex: isMobile ? '0 0 auto' : '0 0 220px',
          }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: txt, marginBottom: 12 }}>{t.planOverall || 'Umumiy bajarish'}</div>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <MultiDonut cats={data.cats} pct={data.donePct} dark={dark} size={isMobile ? 120 : 150} stroke={isMobile ? 14 : 18}/>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data.cats.map(c => (
                <div key={c.key}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 9, height: 9, borderRadius: 2, background: c.color, flexShrink: 0 }}/>
                      <span style={{ fontSize: 12, fontWeight: 600, color: txt }}>{c.name}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 900, color: c.color }}>{c.pct}%</span>
                  </div>
                  <MiniBar pct={c.pct} color={c.color} dark={dark}/>
                  {showBalances && (
                    <div style={{ fontSize: 10, color: sub, textAlign: 'right', marginTop: 3 }}>
                      {fmtM(c.done)} / {fmtM(c.plan)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Line chart card */}
          <div style={{ 
            background: card, 
            borderRadius: 18, 
            border: `1px solid ${border}`, 
            padding: isMobile ? '14px 16px 12px' : '16px 20px 12px',
            flex: 1,
            width: isMobile ? '100%' : 'auto',
            minWidth: 0,
          }}>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: txt }}>{t.planSalesDyn || 'Savdo dinamikasi'}</div>
              <div style={{ fontSize: 11, color: sub, marginTop: 2 }}>
                {mode === 'days' ? (t.plan20daysLbl||'Oxirgi 20 kun') : mode === 'weeks' ? (t.thisWeek||'Joriy hafta') : (t.last6months||'Oxirgi 6 oy')}
              </div>
            </div>
            <SmoothLineChart
              items={histItems}
              dark={dark}
              showBalances={showBalances}
              uid={`asp-${agent.id}-${mode}`}
            />
          </div>
        </div>

        {/* Bar chart */}
        <div style={{ background: card, borderRadius: 18, border: `1px solid ${border}`, padding: isMobile ? '14px 16px' : '16px 20px', marginBottom: 16 }}>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: txt }}>{t.planExecDyn || 'Bajarish dinamikasi'}</div>
            <div style={{ fontSize: 11, color: sub, marginTop: 2 }}>
              {mode === 'days' ? (t.plan20daysLbl||'Oxirgi 20 kun') : mode === 'weeks' ? (t.thisWeek||'Joriy hafta') : (t.last6months||'Oxirgi 6 oy')}
            </div>
          </div>
          <BarChart items={histItems} dark={dark} showBalances={showBalances} uid={`aspbar-${agent.id}-${mode}`}/>
        </div>

        {/* Category summary row */}
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(auto-fill, minmax(95px, 1fr))' : 'repeat(auto-fill, minmax(120px, 1fr))',
          gap: isMobile ? 8 : 10, 
          marginBottom: 16,
        }}>
          {data.cats.map(c => (
            <div key={c.key} style={{
              background: infoB, borderRadius: 14, padding: isMobile ? '10px 10px' : '12px 14px',
              border: `1px solid ${border}`, borderLeft: `3px solid ${c.color}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: c.color, flexShrink: 0 }}/>
                <span style={{ fontSize: 11, color: sub, fontWeight: 600 }}>{c.name}</span>
              </div>
              <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 900, color: c.color, lineHeight: 1, marginBottom: 4 }}>
                {c.pct}%
              </div>
              <div style={{ fontSize: isMobile ? 10 : 11, fontWeight: 700, color: '#10b981', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {showBalances ? fmtM(c.done) + ` ${planUnitLabel(data.unit, t)}` : '••••••'}
              </div>
              <div style={{ fontSize: 9, color: sub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                / {showBalances ? fmtM(c.plan) + ` ${planUnitLabel(data.unit, t)}` : '••••••'}
              </div>
              <div style={{ marginTop: 7 }}>
                <MiniBar pct={c.pct} color={c.color} dark={dark}/>
              </div>
            </div>
          ))}
        </div>

        {/* Category analysis */}
        <div style={{ background: card, borderRadius: 18, border: `1px solid ${border}`, padding: isMobile ? '14px 16px' : '16px 20px', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: txt, marginBottom: 12 }}>{t.planCatAnalysis || 'Kategoriyalar tahlili'}</div>
          <CategoryView cats={data.cats} dark={dark} showBalances={showBalances} mode={mode} agent={agent} t={t} isMobile={isMobile} unit={data.unit}/>
        </div>

        {/* Monthly history table */}
        <div style={{ background: card, borderRadius: 18, border: `1px solid ${border}`, padding: isMobile ? '14px 16px' : '16px 20px' }}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: txt }}>{t.planMonthHist || 'Oylik tarix'}</div>
            <div style={{ fontSize: 11, color: sub, marginTop: 2 }}>{t.planLast || 'Oxirgi'} {HIST_COUNT} {t.planMonth?.toLowerCase() || 'oy'}</div>
          </div>
          <MonthlyHistoryTable agent={agent} agentIdx={agentIdx} planCats={planCats} dark={dark} showBalances={showBalances} t={t}/>
        </div>

      </div>
    </div>
  );
}

// ─── Main Export ───────────────────────────────────────────────────────────────
export function AdminPlanTab({ D, activeAgents, selectedCompanyIds, showBalances, t }: Props) {
  const [sortBy,     setSortBy]     = useState<SortKey>('pct');
  const [showModal,  setShowModal]  = useState(false);
  const [showTarix,  setShowTarix]  = useState(false);
  const [statPage,   setStatPage]   = useState<{ agent: AgentRow; agentIdx: number } | null>(null);
  const [isMobile,   setIsMobile]   = useState(false);
  const [planCats,   setPlanCats]   = useState<PlanCat[]>(DEFAULT_PLAN_CATS);
  const [backendPlans, setBackendPlans] = useState<Map<string, StoredBackendPlan>>(new Map());
  const [planAgents, setPlanAgents] = useState<AgentRow[]>([]);
  const [agentsReady, setAgentsReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const companyIdParam = useMemo(
    () => (selectedCompanyIds.size > 0 ? Array.from(selectedCompanyIds).join(',') : undefined),
    [selectedCompanyIds],
  );

  const agents = agentsReady ? planAgents : activeAgents.filter(a => !!a.distributorId);

  const reloadAgents = useCallback(async () => {
    if (!hasApiToken()) {
      setPlanAgents([]);
      setAgentsReady(false);
      return;
    }
    try {
      const companyId = selectedCompanyIds.size === 1 ? [...selectedCompanyIds][0] : undefined;
      const distributors = await api.getDistributors(companyId);
      const filtered = distributors.filter(d => {
        if (!d.user) return false;
        if (d.user.isActive === false) return false;
        if (isDeliveryPosition(d.position)) return false;
        if (selectedCompanyIds.size > 0 && d.companyId && !selectedCompanyIds.has(d.companyId)) return false;
        return true;
      });
      setPlanAgents(filtered.map(distributorToAgentRow));
      setAgentsReady(true);
    } catch {
      setPlanAgents([]);
      setAgentsReady(false);
    }
  }, [selectedCompanyIds]);

  const reloadPlans = useCallback(async () => {
    if (!hasApiToken()) return;
    setLoading(true);
    setError(null);
    try {
      const { year, month } = getTashkentYearMonth();
      const next = addCalendarMonth(year, month, 1);
      const base = { companyId: companyIdParam };
      const [current, nextMonth] = await Promise.all([
        api.listAgentPlans({ ...base, year, month }),
        api.listAgentPlans({ ...base, year: next.year, month: next.month }),
      ]);
      setBackendPlans(mergePlanMaps(current, nextMonth));
    } catch (e) {
      setError(e instanceof Error ? e.message : (t.planLoadError || 'Rejalarni yuklab bo‘lmadi'));
    } finally {
      setLoading(false);
    }
  }, [companyIdParam, t.planLoadError]);

  useEffect(() => {
    fetchPlanCategories().then(setPlanCats);
  }, []);

  useEffect(() => {
    reloadAgents();
  }, [reloadAgents]);

  useEffect(() => {
    reloadPlans();
  }, [reloadPlans]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 700);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const som    = t.som || "so'm";
  const txt    = D ? '#e5e7eb' : '#111827';
  const sub    = D ? '#6b7280' : '#9ca3af';
  const divClr = D ? '#1e1e1e' : '#f0f0f0';
  const rowBg  = D ? '#0f0f0f' : '#ffffff';
  const infoB  = D ? '#161616' : '#f8fafc';
  const unitOf = (u?: PlanUnit) => planUnitLabel(u || 'som', t);

  const allData = useMemo(() =>
    agents.map((a) => {
      const bp = a.distributorId ? backendPlans.get(a.distributorId) : undefined;
      return {
        agent: a,
        data: bp ? planDataFromBackend(bp) : emptyPlanData(planCats),
      };
    }),
    [agents, planCats, backendPlans]
  );

  const sorted = useMemo(() => {
    const arr = [...allData];
    if (sortBy === 'pct')  arr.sort((a, b) => b.data.donePct - a.data.donePct);
    if (sortBy === 'sum')  arr.sort((a, b) => b.data.doneSum - a.data.doneSum);
    if (sortBy === 'name') arr.sort((a, b) => a.agent.name.localeCompare(b.agent.name));
    return arr;
  }, [allData, sortBy]);

  const totalPlan  = allData.reduce((s, x) => s + x.data.planSum, 0);
  const totalDone  = allData.reduce((s, x) => s + x.data.doneSum, 0);
  const overallPct = totalPlan > 0 ? Math.round((totalDone / totalPlan) * 100) : 0;
  const doneCount  = allData.filter(x => x.data.donePct >= 80).length;

  function pctColor(p: number) {
    if (p >= 75) return '#10b981';
    if (p >= 45) return '#f59e0b';
    return '#ef4444';
  }

  async function handleSave(agent: AgentRow, entry: PlanEntry) {
    if (!agent.distributorId) {
      setError(t.planNoDistributor || 'Agent profili topilmadi — qayta urinib ko‘ring');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const categoryNames = Object.fromEntries(planCats.map(c => [c.key, c.name]));
      await api.upsertAgentPlan({
        distributorId: agent.distributorId,
        monthType: entry.monthType,
        total: entry.total,
        unit: entry.unit,
        categories: entry.cats,
        categoryNames,
        products: entry.products.length > 0 ? entry.products : undefined,
      });
      await reloadPlans();
    } catch (e) {
      setError(e instanceof Error ? e.message : (t.planSaveError || 'Plan saqlanmadi'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: '100%', minWidth: 0, overflowX: 'hidden' }}>

      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 12,
          background: D ? '#3f1d1d' : '#fef2f2', border: `1px solid ${D ? '#7f1d1d' : '#fecaca'}`,
          color: D ? '#fca5a5' : '#b91c1c', fontSize: 13, fontWeight: 600,
        }}>
          <AlertCircle size={16} />
          <span style={{ flex: 1 }}>{error}</span>
          <button
            onClick={() => { setError(null); reloadAgents(); reloadPlans(); }}
            style={{ border: 'none', background: 'transparent', color: 'inherit', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}
          >
            {t.retry || 'Qayta'}
          </button>
        </div>
      )}

      {(loading || saving) && (
        <div style={{ fontSize: 12, color: sub, fontWeight: 600 }}>
          {saving ? (t.planSaving || 'Plan saqlanmoqda...') : (t.planLoading || 'Yuklanmoqda...')}
        </div>
      )}

      {/* Top stats + button */}
      <div style={{
        display: 'flex', flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'stretch' : 'flex-end',
        justifyContent: 'space-between', gap: isMobile ? 14 : 0,
      }}>
        <div style={{ display: 'flex', gap: isMobile ? 20 : 36, flexWrap: 'wrap' }}>
          {[
            { label: t.planTotalAgents || 'Jami agentlar',   value: `${allData.length} ta`, color: txt                },
            { label: t.planCompleted   || 'Plan bajardilar', value: `${doneCount} ta`,      color: '#10b981'          },
            { label: t.planOverall     || 'Umumiy bajarish', value: `${overallPct}%`,       color: pctColor(overallPct) },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontSize: 11, color: sub, marginBottom: 4, fontWeight: 500 }}>{s.label}</div>
              <div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: s.color, letterSpacing: -1 }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: isMobile ? 'row' : 'column', gap: 8, alignItems: isMobile ? 'stretch' : 'flex-end' }}>
          <button
            onClick={() => setShowModal(true)}
            disabled={saving || agents.length === 0}
            style={{
              flex: isMobile ? 1 : undefined,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '11px 20px', borderRadius: 14, border: 'none',
              background: '#6366f1', color: '#fff',
              fontSize: 14, fontWeight: 700, cursor: saving || agents.length === 0 ? 'not-allowed' : 'pointer',
              opacity: saving || agents.length === 0 ? 0.6 : 1,
              boxShadow: '0 4px 16px rgba(99,102,241,0.35)',
              transition: 'opacity 0.15s', whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { if (!saving && agents.length > 0) e.currentTarget.style.opacity = '0.88'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = saving || agents.length === 0 ? '0.6' : '1'; }}
          >
            <Plus size={16}/>
            {t.planSetBtn || "Plan qo'yish"}
          </button>

          <button
            onClick={() => setShowTarix(true)}
            style={{
              flex: isMobile ? 1 : undefined,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '9px 18px', borderRadius: 12,
              border: `1px solid ${divClr}`,
              background: 'transparent', color: sub,
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.15s', whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#6366f1';
              e.currentTarget.style.color = '#6366f1';
              e.currentTarget.style.background = D ? '#111' : '#f0f4ff';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = divClr;
              e.currentTarget.style.color = sub;
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <BarChart2 size={14}/>
            {t.planHistoryBtn || 'Tarix statistika'}
          </button>
        </div>
      </div>

      {/* Title + sort */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: txt }}>
          {t.planAgents || 'Agentlar'}{' '}
          <span style={{ fontSize: 12, fontWeight: 500, color: sub }}>{sorted.length} ta</span>
        </div>
        <div style={{ position: 'relative' }}>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortKey)}
            style={{
              padding: '6px 28px 6px 12px', borderRadius: 10,
              border: `1px solid ${divClr}`,
              background: D ? '#1a1a1a' : '#f9fafb',
              color: D ? '#9ca3af' : '#6b7280',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              outline: 'none', appearance: 'none',
            }}
          >
            <option value="pct">{t.planSortPct || "% bo'yicha"}</option>
            <option value="sum">{t.planSortSum || "Summa bo'yicha"}</option>
            <option value="name">{t.planSortName || "Ism bo'yicha"}</option>
          </select>
          <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: sub, pointerEvents: 'none' }}>▾</span>
        </div>
      </div>

      {/* Agent rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {sorted.map(({ agent, data }, i) => {
          const pct      = data.donePct;
          const color    = pctColor(pct);
          const initials = agent.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
          const hasPlan  = !!(agent.distributorId && backendPlans.has(agent.distributorId));
          const agentIdx = allData.findIndex(x => x.agent.id === agent.id);
          const uLbl     = unitOf(data.unit);

          return (
            <div
              key={agent.id}
              onClick={() => setStatPage({ agent, agentIdx })}
              style={{
                background: rowBg, borderRadius: 18, border: `1px solid ${divClr}`,
                padding: isMobile ? '16px' : '20px 22px', display: 'flex', flexDirection: 'column', gap: 0,
                cursor: 'pointer', transition: 'border-color 0.18s, box-shadow 0.18s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#6366f140';
                e.currentTarget.style.boxShadow   = D ? '0 0 0 1px #6366f122' : '0 2px 16px rgba(99,102,241,0.10)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = divClr;
                e.currentTarget.style.boxShadow   = 'none';
              }}
            >
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 14 : 24, alignItems: 'stretch' }}>

                {/* LEFT */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 24, flexShrink: 0, textAlign: 'center', fontSize: i < 3 ? 18 : 12, fontWeight: 700, lineHeight: 1, color: i < 3 ? (['#f59e0b','#9ca3af','#cd7c3f'] as string[])[i] : sub }}>
                      {i < 3 ? MEDALS[i] : i + 1}
                    </div>
                    <div style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0, background: color + '1a', border: `1.5px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color }}>
                      {initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: txt, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{agent.name}</div>
                      <div style={{ fontSize: 11, color: sub, marginTop: 1 }}>
                        {t.planReja || 'Reja'}: {showBalances ? fmt(data.planSum) + ' ' + uLbl : '••••'}
                        {hasPlan && (
                          <span style={{ marginLeft: 8, color: '#6366f1', fontWeight: 700 }}>
                            · {data.monthKind === 'next'
                              ? (t.planNextMonth || 'keyingi oy')
                              : (t.planAssigned || 'Plan belgilangan')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6, marginBottom: 5 }}>
                      <span style={{ fontSize: 11, color: sub, flexShrink: 0 }}>{t.planOverall || 'Umumiy bajarish'}</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color, textAlign: 'right', minWidth: 0 }}>
                        {pct}%{!isMobile && showBalances ? ` · ${fmt(data.doneSum)} / ${fmt(data.planSum)}` : ''}
                      </span>
                    </div>
                    <div style={{ height: 7, borderRadius: 6, background: D ? '#1e1e1e' : '#f1f5f9', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 6, background: color, width: `${Math.min(pct, 100)}%`, transition: 'width 0.65s cubic-bezier(.4,0,.2,1)' }} />
                    </div>
                    {isMobile && showBalances && (
                      <div style={{ fontSize: 10, color: sub, marginTop: 3, textAlign: 'right' }}>
                        {fmt(data.doneSum)} / {fmt(data.planSum)}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ flex: 1, background: infoB, borderRadius: 10, padding: '7px 10px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? 2 : 0 }}>
                      <span style={{ fontSize: 11, color: sub }}>{t.planDone || 'Bajarildi'}</span>
                      <span style={{ fontSize: isMobile ? 11 : 12, fontWeight: 800, color: '#10b981' }}>{showBalances ? fmt(data.doneSum) + ' ' + uLbl : '••••'}</span>
                    </div>
                    <div style={{ flex: 1, background: infoB, borderRadius: 10, padding: '7px 10px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? 2 : 0 }}>
                      <span style={{ fontSize: 11, color: sub }}>{t.planRemaining || 'Qoldi'}</span>
                      <span style={{ fontSize: isMobile ? 11 : 12, fontWeight: 800, color: '#f59e0b' }}>{showBalances ? fmt(data.remaining) + ' ' + uLbl : '••••'}</span>
                    </div>
                  </div>
                </div>

                {/* RIGHT: donut + categories */}
                <div style={{
                  flexShrink: 0,
                  width: isMobile ? '100%' : 300,
                  display: 'flex',
                  flexDirection: isMobile ? 'row' : 'column',
                  alignItems: isMobile ? 'flex-start' : 'center',
                  gap: isMobile ? 12 : 16,
                  borderLeft: isMobile ? 'none' : `1px solid ${divClr}`,
                  borderTop: isMobile ? `1px solid ${divClr}` : 'none',
                  paddingLeft: isMobile ? 0 : 28,
                  paddingTop: isMobile ? 14 : 0,
                }}>
                  <div style={{ flexShrink: 0 }}>
                    <MultiDonut cats={data.cats} pct={pct} dark={D} size={isMobile ? 90 : 140} stroke={isMobile ? 11 : 16} />
                  </div>
                  <div style={{ flex: 1, width: isMobile ? 'auto' : '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {data.cats.map(c => (
                      <div key={c.key}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isMobile ? 3 : 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 9, height: 9, borderRadius: 3, background: c.color, flexShrink: 0 }} />
                            <span style={{ fontSize: isMobile ? 12 : 14, fontWeight: 700, color: txt }}>{c.name}</span>
                          </div>
                          <span style={{ fontSize: isMobile ? 12 : 15, fontWeight: 900, color: c.color }}>{c.pct}%</span>
                        </div>
                        <MiniBar pct={c.pct} color={c.color} dark={D} />
                        {showBalances && !isMobile && (
                          <div style={{ fontSize: 10, color: sub, textAlign: 'right', marginTop: 2 }}>
                            {fmt(c.done)} / {fmt(c.plan)} {uLbl}
                          </div>
                        )}
                        {!!c.products?.length && (
                          <div style={{ marginTop: 6, paddingLeft: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {c.products.map(p => (
                              <div key={p.productId} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                                <span style={{ fontSize: 10, color: sub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.productName}</span>
                                <span style={{ fontSize: 10, fontWeight: 700, color: c.color, flexShrink: 0 }}>
                                  {p.pct}%{showBalances ? ` · ${fmt(p.done)}/${fmt(p.plan)}` : ''}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* Plan modal */}
      {showModal && (
        <PlanModal
          agents={agents}
          planCats={planCats}
          dark={D}
          t={t}
          companyId={selectedCompanyIds.size === 1 ? [...selectedCompanyIds][0] : undefined}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}

      {/* Tarix stat full page */}
      {showTarix && (
        <TarixStatPage
          allData={allData}
          planCats={planCats}
          dark={D}
          showBalances={showBalances}
          t={t}
          onClose={() => setShowTarix(false)}
          onAgentClick={(a, idx) => setStatPage({ agent: a, agentIdx: idx })}
        />
      )}

      {/* Agent stat full page */}
      {statPage && (
        <AgentStatPage
          agent={statPage.agent}
          agentIdx={statPage.agentIdx}
          planCats={planCats}
          planData={allData.find(x => x.agent.id === statPage.agent.id)?.data ?? emptyPlanData(planCats)}
          dark={D}
          showBalances={showBalances}
          t={t}
          onClose={() => setStatPage(null)}
        />
      )}
    </div>
  );
}
