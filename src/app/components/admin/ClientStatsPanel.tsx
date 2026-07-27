import { useEffect, useMemo, useState } from 'react';
import {
  X, ChevronRight, ChevronLeft, TrendingUp, TrendingDown,
  BarChart3, Package, ShoppingCart, ArrowUpRight, Maximize2, Minimize2, Calendar,
} from 'lucide-react';
import type { ClientRow } from '../../data/adminData';
import {
  api,
  type ClientStatsCategory,
  type ClientStatsProduct,
  type ClientStatsResponse,
} from '../../api/client';
import { DateRangePicker } from './DateRangePicker';

type Period = 'hafta' | 'oy' | '6oy' | 'custom';
type BuyFilter = 'all' | 'top' | 'avg' | 'none';
type CategoryData = ClientStatsCategory;
type ProductData = ClientStatsProduct;

function fmtSom(n: number) {
  return n.toLocaleString('ru-RU') + " so'm";
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function monthStartIso() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

/* ── Monthly Trend SVG Chart ────────────────────────── */
function MonthlyTrendChart({
  data, D, sub,
}: {
  data: { label: string; value: number }[];
  D: boolean;
  sub: string;
}) {
  if (!data.length || data.every(d => d.value === 0)) {
    return (
      <div className={`px-4 py-8 text-center text-sm ${sub}`}>
        Oylik ma'lumot yo'q
      </div>
    );
  }

  const W = 600; const H = 140;
  const padL = 28; const padR = 28;
  const padT = 46;
  const padB = 22;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const maxV = Math.max(...data.map(d => d.value));
  const minV = Math.min(...data.map(d => d.value));
  const range = maxV - minV || 1;

  const pts = data.map((d, i) => ({
    x: padL + (data.length === 1 ? chartW / 2 : (i / (data.length - 1)) * chartW),
    y: padT + chartH - ((d.value - minV) / range) * chartH,
    ...d,
  }));

  const linePath = pts.map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`)).join(' ');
  const areaPath = `${linePath} L ${pts[pts.length - 1].x},${H - padB} L ${pts[0].x},${H - padB} Z`;

  const first = data[0].value || 1;
  const overallTrend = ((data[data.length - 1].value - data[0].value) / first) * 100;
  const trendUp = overallTrend >= 0;
  const accentColor = trendUp ? '#10b981' : '#ef4444';
  const gridColor = D ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const labelColor = D ? '#6b7280' : '#9ca3af';
  const gradId = `mg-${data.map(d => d.label).join('')}`;

  return (
    <div>
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <div className="flex items-center gap-1.5">
          {trendUp
            ? <TrendingUp size={12} className="text-emerald-400" />
            : <TrendingDown size={12} className="text-rose-400" />}
          <span className={`text-[10px] font-semibold uppercase tracking-wider ${sub}`}>
            Oylik trend
          </span>
        </div>
        <div className={`flex items-center gap-1 text-xs font-bold
          ${trendUp ? 'text-emerald-400' : 'text-rose-400'}`}>
          {trendUp ? '+' : ''}{overallTrend.toFixed(1)}%
          <span className={`text-[10px] font-normal ml-1 ${sub}`}>6 oy</span>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H, display: 'block' }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={accentColor} stopOpacity="0.20" />
            <stop offset="100%" stopColor={accentColor} stopOpacity="0"    />
          </linearGradient>
        </defs>

        {[0, 0.5, 1].map((t, i) => (
          <line key={i}
            x1={0} y1={padT + t * chartH}
            x2={W} y2={padT + t * chartH}
            stroke={gridColor} strokeWidth={1}
          />
        ))}

        <path d={areaPath} fill={`url(#${gradId})`} />
        <path d={linePath} fill="none" stroke={accentColor}
          strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />

        {pts.map((p, i) => {
          const prevVal  = i > 0 ? data[i - 1].value : null;
          const pct      = prevVal && prevVal > 0 ? ((p.value - prevVal) / prevVal) * 100 : null;
          const pctColor = pct === null ? labelColor : pct >= 0 ? '#10b981' : '#ef4444';
          const sumStr   = p.value >= 1_000_000
            ? `${(p.value / 1_000_000).toFixed(1)}M`
            : p.value >= 1_000
              ? `${(p.value / 1_000).toFixed(0)}K`
              : `${Math.round(p.value)}`;
          const pctStr   = pct !== null ? `${pct >= 0 ? '+' : ''}${pct.toFixed(0)}%` : '';
          const lx = Math.max(30, Math.min(W - 30, p.x));

          return (
            <g key={i}>
              <text x={lx} y={p.y - 18} textAnchor="middle"
                fontSize={10} fontWeight="bold" fill={accentColor}>
                {sumStr}
              </text>
              {pctStr && (
                <text x={lx} y={p.y - 6} textAnchor="middle"
                  fontSize={9} fill={pctColor}>
                  {pctStr}
                </text>
              )}
              <circle cx={p.x} cy={p.y} r={3.5}
                fill={D ? '#111111' : '#ffffff'}
                stroke={accentColor} strokeWidth={2}
              />
              <text x={p.x} y={H - 5} textAnchor="middle"
                fontSize={9} fill={labelColor}>
                {p.label}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="flex justify-between px-4 pb-2">
        <span className={`text-[9px] ${sub}`}>{fmtSom(minV)}</span>
        <span className={`text-[9px] ${sub}`}>{fmtSom(maxV)}</span>
      </div>
    </div>
  );
}

function DonutChart({ cats, D }: { cats: CategoryData[]; D: boolean }) {
  const r = 44; const cx = 56; const cy = 56;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  const segments = cats.map(c => {
    const dash = (c.share / 100) * circ;
    const gap  = circ - dash;
    const seg  = { ...c, dash, gap, offset };
    offset += dash;
    return seg;
  });
  return (
    <svg viewBox="0 0 112 112" className="w-full h-full" style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={D ? '#1f1f1f' : '#f3f4f6'} strokeWidth={14} />
      {segments.map(s => (
        <circle key={s.id} cx={cx} cy={cy} r={r} fill="none"
          stroke={s.color} strokeWidth={14}
          strokeDasharray={`${s.dash} ${s.gap}`}
          strokeDashoffset={-s.offset}
        />
      ))}
    </svg>
  );
}

function WeeklyBars({
  bars, color, D,
}: {
  bars: { label: string; value: number }[];
  color: string;
  D: boolean;
}) {
  if (!bars.length || bars.every(b => b.value === 0)) {
    return (
      <div className={`py-6 text-center text-xs ${D ? 'text-gray-500' : 'text-gray-400'}`}>
        Haftalik ma'lumot yo'q
      </div>
    );
  }
  const maxV = Math.max(...bars.map(b => b.value), 1);
  return (
    <svg viewBox="0 0 210 72" className="w-full" style={{ height: 72 }}>
      {bars.map((b, i) => {
        const h = (b.value / maxV) * 48;
        const x = 4 + i * 29;
        const y = 52 - h;
        const isToday = i === bars.length - 1;
        return (
          <g key={i}>
            <rect x={x} y={y} width={20} height={Math.max(h, 2)} rx={5}
              fill={color} opacity={isToday ? 1 : 0.35} />
            <text x={x + 10} y={68} textAnchor="middle"
              fontSize={9} fill={D ? '#6b7280' : '#9ca3af'}>
              {b.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: color + '22' }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

interface Props {
  client: ClientRow;
  D: boolean;
  sub: string;
  text: string;
  onClose: () => void;
  t: Record<string, string>;
}

export function ClientStatsPanel({ client, D, sub, text: _text, onClose, t }: Props) {
  const [period, setPeriod] = useState<Period>('oy');
  const [buyFilter, setBuyFilter] = useState<BuyFilter>('all');
  const [selectedCat, setSelectedCat] = useState<CategoryData | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [customFrom, setCustomFrom] = useState(monthStartIso());
  const [customTo, setCustomTo] = useState(todayIso());
  const [stats, setStats] = useState<ClientStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSelectedCat(null);

    const params: { period: Period; from?: string; to?: string } = { period };
    if (period === 'custom') {
      params.from = customFrom;
      params.to = customTo;
    }

    api.getClientStats(client.id, params)
      .then(data => {
        if (!cancelled) setStats(data);
      })
      .catch(e => {
        if (!cancelled) {
          setStats(null);
          setError(e instanceof Error ? e.message : String(e));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [client.id, period, customFrom, customTo]);

  const categories = stats?.categories ?? [];
  const monthlyTrend = stats?.monthlyTrend ?? [];
  const totalSum = stats?.totalSum ?? 0;
  const totalKg = stats?.totalKg ?? 0;

  const products = useMemo(
    () => selectedCat?.products ?? [],
    [selectedCat],
  );

  const filteredProducts = products.filter(p =>
    buyFilter === 'all' ? true :
    buyFilter === 'top'  ? p.buyLevel === 'top'  :
    buyFilter === 'avg'  ? p.buyLevel === 'avg'  :
    p.buyLevel === 'none',
  );

  // Keep selectedCat in sync with refreshed stats
  useEffect(() => {
    if (!selectedCat || !stats) return;
    const fresh = stats.categories.find(c => c.id === selectedCat.id);
    if (fresh) setSelectedCat(fresh);
    else setSelectedCat(null);
  }, [stats]); // eslint-disable-line react-hooks/exhaustive-deps

  const bg   = D ? 'bg-[#111111]'    : 'bg-white';
  const hdr  = D ? 'bg-[#0d0d0d]'   : 'bg-gray-50';
  const bd   = D ? 'border-gray-800' : 'border-gray-200';
  const card2 = D ? 'bg-[#1a1a1a] border-gray-800' : 'bg-gray-50 border-gray-200';

  const PERIODS: { key: Period; label: string }[] = [
    { key: 'hafta', label: t.statHafta  ?? 'Oxirgi hafta' },
    { key: 'oy',    label: t.statOy     ?? 'Oxirgi oy'    },
    { key: '6oy',   label: t.stat6Oy    ?? 'Oxirgi 6 oy'  },
    { key: 'custom',label: t.statCustom ?? 'Sana'         },
  ];

  const BUY_FILTERS: { key: BuyFilter; label: string }[] = [
    { key: 'all',  label: t.statAll  ?? 'Barchasi'     },
    { key: 'top',  label: t.statTop  ?? "Ko'p olgan"   },
    { key: 'avg',  label: t.statAvg  ?? "O'rtacha"     },
    { key: 'none', label: t.statNone ?? 'Olmaganlari'  },
  ];

  const panelCls = fullscreen
    ? `fixed inset-0 z-[302] flex flex-col ${bg}`
    : `relative flex flex-col ${bg} rounded-2xl shadow-2xl border ${bd} w-full`;

  const maxH = fullscreen ? '100vh' : 'min(88vh, 700px)';
  const maxW = fullscreen ? '100vw' : 'min(520px, 96vw)';

  return (
    <>
      <div
        className="fixed inset-0 z-[301]"
        style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.55)' }}
        onClick={onClose}
      />

      <div
        className={`fixed inset-0 z-[302] flex items-center justify-center ${fullscreen ? 'p-0' : 'p-4'}`}
        onClick={onClose}
      >
        <div
          className={panelCls}
          style={{ maxWidth: maxW, width: '100%', maxHeight: maxH, height: fullscreen ? '100vh' : 'auto' }}
          onClick={e => e.stopPropagation()}
        >
          <div className={`flex-shrink-0 px-5 pt-4 pb-3 border-b ${bd} ${hdr} rounded-t-2xl`}>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-3 min-w-0">
                {selectedCat ? (
                  <button
                    onClick={() => setSelectedCat(null)}
                    className={`w-8 h-8 flex items-center justify-center rounded-xl transition-colors flex-shrink-0
                      ${D ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
                  >
                    <ChevronLeft size={15} />
                  </button>
                ) : (
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
                    ${D ? 'bg-indigo-600/25' : 'bg-indigo-100'}`}>
                    <BarChart3 size={16} className={D ? 'text-indigo-400' : 'text-indigo-600'} />
                  </div>
                )}
                <div className="min-w-0">
                  <p className={`text-sm font-bold truncate ${D ? 'text-white' : 'text-gray-900'}`}>
                    {selectedCat ? selectedCat.icon + ' ' + selectedCat.name : client.name}
                  </p>
                  <p className={`text-xs ${sub}`}>
                    {selectedCat ? (t.statProdAnalysis ?? 'Mahsulot tahlili') : (t.statTitle ?? 'Statistika')}
                    {client.agent ? ` · ${client.agent}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => setFullscreen(v => !v)}
                  className={`w-8 h-8 flex items-center justify-center rounded-xl transition-colors
                    ${D ? 'bg-gray-800 hover:bg-gray-700 text-gray-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-500'}`}
                >
                  {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                </button>
                <button
                  onClick={onClose}
                  className={`w-8 h-8 flex items-center justify-center rounded-xl transition-colors
                    ${D ? 'bg-gray-800 hover:bg-gray-700 text-gray-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-500'}`}
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className={`flex items-center gap-1 p-1 rounded-xl border
              ${D ? 'bg-[#1a1a1a] border-gray-800' : 'bg-gray-100 border-gray-200'}`}>
              {PERIODS.map(p => (
                <button
                  key={p.key}
                  onClick={() => setPeriod(p.key)}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap
                    ${period === p.key
                      ? D ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40' : 'bg-white text-indigo-700 shadow-sm'
                      : `${sub} hover:opacity-80`}`}
                >
                  {p.key === 'custom' && <Calendar size={10} />}
                  {p.label}
                </button>
              ))}
            </div>

            {period === 'custom' && (
              <DateRangePicker
                from={customFrom}
                to={customTo}
                onChange={(f, t2) => { setCustomFrom(f); setCustomTo(t2); }}
                D={D}
              />
            )}
          </div>

          <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
            {loading ? (
              <div className={`p-10 text-center text-sm ${sub}`}>Yuklanmoqda...</div>
            ) : error ? (
              <div className="p-6 text-center">
                <p className="text-sm text-rose-400 mb-2">{error}</p>
                <p className={`text-xs ${sub}`}>Buyurtmalar bo'yicha statistika yuklanmadi</p>
              </div>
            ) : !selectedCat ? (
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className={`rounded-2xl border ${card2} px-4 py-3`}>
                    <p className={`text-[10px] font-semibold uppercase tracking-wider ${sub} mb-1`}>
                      {t.statTotal ?? 'Jami savdo'}
                    </p>
                    <p className={`font-bold text-xl ${D ? 'text-white' : 'text-gray-900'}`}>
                      {totalSum.toLocaleString('ru-RU')}
                    </p>
                    <p className={`text-xs ${sub}`}>so'm</p>
                  </div>
                  <div className={`rounded-2xl border ${card2} px-4 py-3`}>
                    <p className={`text-[10px] font-semibold uppercase tracking-wider ${sub} mb-1`}>
                      {t.statWeight ?? "Jami og'irlik"}
                    </p>
                    <p className={`font-bold text-xl ${D ? 'text-white' : 'text-gray-900'}`}>
                      {totalKg.toLocaleString('ru-RU', { maximumFractionDigits: 1 })}
                    </p>
                    <p className={`text-xs ${sub}`}>kg</p>
                  </div>
                </div>

                <div className={`rounded-2xl border ${card2} p-4`}>
                  <p className={`text-xs font-semibold ${sub} mb-3`}>
                    {t.statCatShare ?? 'Kategoriya ulushi'}
                  </p>
                  {categories.length === 0 ? (
                    <p className={`text-sm py-4 text-center ${sub}`}>Bu davrda sotuv yo'q</p>
                  ) : (
                    <div className="flex items-center gap-5">
                      <div className="w-24 h-24 flex-shrink-0 relative">
                        <DonutChart cats={categories} D={D} />
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className={`text-[10px] font-semibold ${sub}`}>{t.statCats ?? 'kat.'}</span>
                          <span className={`text-lg font-bold ${D ? 'text-white' : 'text-gray-900'}`}>{categories.length}</span>
                        </div>
                      </div>
                      <div className="flex-1 space-y-2 min-w-0">
                        {categories.map(c => (
                          <div key={c.id} className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: c.color }} />
                            <span className={`text-xs truncate flex-1 ${sub}`}>{c.name}</span>
                            <span className={`text-xs font-bold tabular-nums ${D ? 'text-white' : 'text-gray-900'}`}>{c.share}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className={`rounded-2xl border ${card2} overflow-hidden`}>
                  <MonthlyTrendChart data={monthlyTrend} D={D} sub={sub} />
                </div>

                <div>
                  <p className={`text-[10px] font-semibold uppercase tracking-wider ${sub} mb-2`}>
                    {t.statCatDetail ?? 'Kategoriya tafsiloti'}
                  </p>
                  {categories.length === 0 ? (
                    <div className={`text-center py-8 text-sm rounded-2xl border ${bd} ${sub}`}>
                      Buyurtmalar topilmadi
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {categories.map((c, i) => {
                        const maxSum = categories[0].totalSum;
                        return (
                          <button
                            key={c.id}
                            onClick={() => setSelectedCat(c)}
                            className={`w-full rounded-2xl border px-4 py-3 text-left transition-all
                              ${D
                                ? 'border-gray-800 bg-[#1a1a1a] hover:border-indigo-500/40 hover:bg-[#222]'
                                : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30'}`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
                                  style={{ background: c.color + '22' }}>
                                  {c.icon}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <p className={`text-sm font-semibold truncate ${D ? 'text-white' : 'text-gray-900'}`}>{c.name}</p>
                                    <span className={`text-[10px] px-1.5 rounded-md font-semibold flex-shrink-0
                                      ${D ? 'bg-white/10 text-gray-400' : 'bg-gray-200 text-gray-500'}`}>
                                      #{i + 1}
                                    </span>
                                  </div>
                                  <p className={`text-[11px] ${sub}`}>
                                    {c.totalKg.toLocaleString('ru-RU', { maximumFractionDigits: 1 })} kg
                                    {' • '}
                                    {c.avgPrice.toLocaleString('ru-RU')} so'm/kg
                                  </p>
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0 ml-2">
                                <p className={`font-bold tabular-nums text-sm ${D ? 'text-white' : 'text-gray-900'}`}>
                                  {c.totalSum.toLocaleString('ru-RU')}
                                </p>
                                <div className={`flex items-center justify-end gap-0.5 text-[11px] font-semibold
                                  ${c.trend >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {c.trend >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                  {c.trend >= 0 ? '+' : ''}{c.trend}%
                                </div>
                              </div>
                            </div>
                            <MiniBar value={c.totalSum} max={maxSum} color={c.color} />
                            <div className="flex items-center justify-between mt-1.5">
                              <span className={`text-[10px] ${sub}`}>{c.share}% {t.statShare ?? 'ulush'}</span>
                              <div className={`flex items-center gap-0.5 text-[11px] font-semibold
                                ${D ? 'text-indigo-400' : 'text-indigo-600'}`}>
                                {t.statDetail ?? 'Batafsil'} <ChevronRight size={10} />
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-5 space-y-4">
                <div className={`rounded-2xl border px-4 py-3 flex items-center gap-3 ${card2}`}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
                    style={{ background: selectedCat.color + '22' }}>
                    {selectedCat.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm font-bold truncate ${D ? 'text-white' : 'text-gray-900'}`}>
                        {selectedCat.name}
                      </p>
                      <p className={`font-bold tabular-nums text-sm flex-shrink-0 ${D ? 'text-white' : 'text-gray-900'}`}>
                        {selectedCat.totalSum.toLocaleString('ru-RU')}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className={`text-[11px] ${sub}`}>
                        {selectedCat.totalKg.toLocaleString('ru-RU', { maximumFractionDigits: 1 })} kg
                      </span>
                      <span className={`text-[11px] ${sub}`}>
                        {selectedCat.avgPrice.toLocaleString('ru-RU')} so'm/kg
                      </span>
                      <span className={`text-[11px] font-semibold flex items-center gap-0.5
                        ${selectedCat.trend >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {selectedCat.trend >= 0 ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                        {selectedCat.trend >= 0 ? '+' : ''}{selectedCat.trend}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className={`rounded-2xl border ${card2} overflow-hidden`}>
                  <MonthlyTrendChart data={monthlyTrend} D={D} sub={sub} />
                </div>

                <div className={`rounded-2xl border ${card2} px-4 pt-3 pb-2`}>
                  <p className={`text-[10px] font-semibold uppercase tracking-wider ${sub} mb-2`}>
                    {t.statWeekly ?? 'Haftalik trend'}
                  </p>
                  <WeeklyBars bars={selectedCat.weekly} color={selectedCat.color} D={D} />
                </div>

                <div>
                  <p className={`text-[10px] font-semibold uppercase tracking-wider ${sub} mb-2`}>
                    {t.statFilter ?? 'Holat filtri'}
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {BUY_FILTERS.map(f => (
                      <button
                        key={f.key}
                        onClick={() => setBuyFilter(f.key)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all whitespace-nowrap
                          ${buyFilter === f.key
                            ? f.key === 'top'  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                            : f.key === 'avg'  ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                            : f.key === 'none' ? 'bg-rose-500/20 border-rose-500/50 text-rose-400'
                            :                   'bg-indigo-600 border-indigo-500 text-white'
                            : D ? 'bg-white/[0.04] border-gray-700 text-gray-400 hover:bg-white/[0.08]'
                                : 'bg-gray-100 border-gray-200 text-gray-500 hover:bg-gray-200'
                          }`}
                      >
                        {f.key === 'top'  && <ArrowUpRight size={10} />}
                        {f.key === 'avg'  && <ShoppingCart size={10} />}
                        {f.key === 'none' && <Package size={10} />}
                        {f.label}
                        {f.key !== 'all' && (
                          <span className="ml-0.5 text-[10px] opacity-70">
                            ({products.filter(p => p.buyLevel === f.key).length})
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className={`text-[10px] font-semibold uppercase tracking-wider ${sub} mb-2`}>
                    {t.statProducts ?? 'Mahsulotlar'} ({filteredProducts.length})
                  </p>
                  {filteredProducts.length === 0 ? (
                    <div className={`text-center py-10 text-sm ${sub} rounded-2xl border ${bd}`}>
                      {t.noResults ?? 'Natija topilmadi'}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredProducts.map(p => {
                        const maxQty = Math.max(...products.filter(x => x.buyLevel !== 'none').map(x => x.qty), 1);
                        return (
                          <div key={p.id}
                            className={`rounded-2xl border px-4 py-3 transition-all
                              ${p.buyLevel === 'none'
                                ? D ? 'border-gray-800/50 bg-[#111] opacity-55' : 'border-gray-200 bg-gray-50/60 opacity-55'
                                : D ? 'border-gray-800 bg-[#1a1a1a]' : 'border-gray-200 bg-white'}`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <div className="flex items-start gap-2 min-w-0">
                                <div className={`flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center mt-0.5
                                  ${p.buyLevel === 'top'  ? 'bg-emerald-500/20'
                                  : p.buyLevel === 'avg'  ? 'bg-amber-500/20'
                                  :                        D ? 'bg-gray-800' : 'bg-gray-200'}`}>
                                  {p.buyLevel === 'top'  && <ArrowUpRight size={10} className="text-emerald-400" />}
                                  {p.buyLevel === 'avg'  && <ShoppingCart size={10} className="text-amber-400" />}
                                  {p.buyLevel === 'none' && <Package size={10} className={sub} />}
                                </div>
                                <div className="min-w-0">
                                  <p className={`text-xs font-semibold leading-snug
                                    ${p.buyLevel === 'none' ? sub : D ? 'text-white' : 'text-gray-900'}`}>
                                    {p.name}
                                  </p>
                                  <p className={`text-[11px] ${sub}`}>
                                    {p.buyLevel === 'none'
                                      ? (t.statNotBought ?? 'Hali olinmagan')
                                      : `${p.qty.toLocaleString('ru-RU')} ${p.unit} · ${p.price.toLocaleString('ru-RU')} so'm/${p.unit}`}
                                  </p>
                                </div>
                              </div>
                              {p.buyLevel !== 'none' && (
                                <div className="text-right flex-shrink-0">
                                  <p className={`font-bold tabular-nums text-sm ${D ? 'text-white' : 'text-gray-900'}`}>
                                    {p.total.toLocaleString('ru-RU')}
                                  </p>
                                  <p className={`text-[11px] font-semibold flex items-center justify-end gap-0.5
                                    ${p.trend >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {p.trend >= 0 ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                                    {p.trend >= 0 ? '+' : ''}{p.trend}%
                                  </p>
                                </div>
                              )}
                              {p.buyLevel === 'none' && (
                                <span className={`text-[10px] px-2 py-0.5 rounded-full border flex-shrink-0
                                  ${D ? 'border-gray-700 text-gray-600' : 'border-gray-300 text-gray-400'}`}>
                                  0
                                </span>
                              )}
                            </div>
                            {p.buyLevel !== 'none' && (
                              <div className="w-full h-1 rounded-full overflow-hidden"
                                style={{ background: D ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                                <div className="h-full rounded-full"
                                  style={{ width: `${Math.min(100, (p.qty / maxQty) * 100)}%`, background: selectedCat.color }} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
