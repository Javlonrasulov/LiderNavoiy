import { useState, useRef, useEffect } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────
interface DataPoint { [key: string]: any }
interface Series { key: string; name: string; color: string; dotted?: boolean }

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  label: string;
  items: { name: string; color: string; value: number }[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(n: number) {
  const a = Math.abs(n);
  if (a >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + ' mlrd';
  if (a >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + ' mln';
  if (a >= 1_000) return (n / 1_000).toFixed(0) + ' ming';
  return n.toFixed(0);
}

// ─── Smooth Path Helper ──────────────────────────────────────────────────────
function smoothCurve(pts: [number, number][], tension = 0.35): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M${pts[0][0]},${pts[0][1]}`;
  if (pts.length === 2) return `M${pts[0][0]},${pts[0][1]} L${pts[1][0]},${pts[1][1]}`;
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const cp1x = p1[0] + (p2[0] - p0[0]) * tension;
    const cp1y = p1[1] + (p2[1] - p0[1]) * tension;
    const cp2x = p2[0] - (p3[0] - p1[0]) * tension;
    const cp2y = p2[1] - (p3[1] - p1[1]) * tension;
    d += ` C${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2[0]},${p2[1]}`;
  }
  return d;
}

// ─── Shared Tooltip ───────────────────────────────────────────────────────────
function ChartTooltip({ tip, dark }: { tip: TooltipState; dark: boolean }) {
  if (!tip.visible) return null;
  return (
    <div
      className={`absolute z-50 pointer-events-none px-3 py-2 rounded-xl shadow-xl border text-xs
        ${dark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-800'}`}
      style={{ left: tip.x + 14, top: tip.y, transform: 'translateY(-50%)' }}
    >
      <p className="font-semibold mb-1">{tip.label}</p>
      {tip.items.map((it, i) => (
        <p key={i} style={{ color: it.color }}>{it.name}: {fmt(it.value)}</p>
      ))}
    </div>
  );
}

// ─── MiniLineChart ────────────────────────────────────────────────────────────
interface LineChartProps {
  data: DataPoint[];
  labelKey: string;
  series: Series[];
  dark: boolean;
  showDots?: boolean;
  height?: number;
  smooth?: boolean;
}

export function MiniLineChart({
  data, labelKey, series, dark,
  showDots = false, height = 220, smooth = true,
}: LineChartProps) {
  const [tip, setTip] = useState<TooltipState>({ visible: false, x: 0, y: 0, label: '', items: [] });
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [W, setW] = useState(600);
  const containerRef = useRef<HTMLDivElement>(null);

  // ResizeObserver — haqiqiy kenglikni o'lchaydi
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const cw = entries[0].contentRect.width;
      if (cw > 0) setW(cw);
    });
    ro.observe(el);
    if (el.clientWidth > 0) setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const H = height;
  const padT = 20, padB = 30;
  const h = H - padT - padB;

  const allVals = series.flatMap(s => data.map(d => Number(d[s.key]) || 0));
  const maxV = Math.max(...allVals, 1);
  const minV = Math.min(0, ...allVals);
  const range = maxV - minV || 1;

  const xStep = data.length > 1 ? W / (data.length - 1) : W;
  const scaleX = (i: number) => i * xStep;
  const scaleY = (v: number) => padT + h - ((v - minV) / range) * h;

  const gridColor = dark ? '#1f2937' : '#f0f1f3';
  const labelColor = dark ? '#6b7280' : '#9ca3af';
  const gridLines = 4;

  return (
    <div ref={containerRef} className="relative w-full" style={{ height }}>
      <svg
        width={W}
        height={H}
        style={{ display: 'block', overflow: 'visible', width: '100%' }}
        onMouseLeave={() => { setTip(t => ({ ...t, visible: false })); setHoverIdx(null); }}
      >
        {/* Grid lines — chap chekkadan o'ng chekkagacha */}
        {Array.from({ length: gridLines }).map((_, i) => {
          const y = padT + (h / (gridLines - 1)) * i;
          return (
            <line key={`grid-${i}`}
              x1={0} y1={y} x2={W} y2={y}
              stroke={gridColor} strokeWidth={1}
            />
          );
        })}

        {/* X Axis labels */}
        {data.map((d, i) => (
          <text
            key={`xlabel-${i}`}
            x={scaleX(i)}
            y={H - 6}
            textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'}
            fontSize={11}
            fill={hoverIdx === i ? (dark ? '#e5e7eb' : '#374151') : labelColor}
            style={{ transition: 'fill 0.15s' }}
          >
            {d[labelKey]}
          </text>
        ))}

        {/* Lines */}
        {series.map(s => {
          const pts: [number, number][] = data.map((d, i) => [scaleX(i), scaleY(Number(d[s.key]) || 0)]);
          return smooth ? (
            <path
              key={`line-${s.key}`}
              d={smoothCurve(pts)}
              fill="none"
              stroke={s.color}
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ) : (
            <polyline
              key={`line-${s.key}`}
              points={pts.map(p => p.join(',')).join(' ')}
              fill="none"
              stroke={s.color}
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          );
        })}

        {/* Dots — showDots yoqilganda yoki hover paytida */}
        {series.map(s =>
          data.map((d, i) => {
            const cx = scaleX(i);
            const cy = scaleY(Number(d[s.key]) || 0);
            const isHovered = hoverIdx === i;
            if (!showDots && !isHovered) return null;
            return (
              <g key={`dot-${s.key}-${i}`}>
                {/* Vertikal yo'naltiruvchi chiziq (nuqtadan label ga) */}
                <line
                  x1={cx} y1={cy + 7}
                  x2={cx} y2={H - padB + 2}
                  stroke={s.color}
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  opacity={isHovered ? 0.7 : 0.4}
                />
                {/* Glow halqa */}
                <circle cx={cx} cy={cy} r={isHovered ? 9 : 6} fill={s.color} opacity={0.12} />
                {/* Asosiy nuqta */}
                <circle
                  cx={cx} cy={cy}
                  r={isHovered ? 5.5 : 4}
                  fill={s.color}
                  stroke={dark ? '#0a0a0a' : '#ffffff'}
                  strokeWidth={2.5}
                />
              </g>
            );
          })
        )}

        {/* Hover zones */}
        {data.map((d, i) => {
          const cx = scaleX(i);
          const zoneW = xStep;
          const zoneX = i === 0 ? 0 : cx - zoneW / 2;
          return (
            <rect
              key={`hover-${i}`}
              x={zoneX}
              y={0}
              width={i === 0 || i === data.length - 1 ? zoneW / 2 : zoneW}
              height={H}
              fill="transparent"
              style={{ cursor: 'crosshair' }}
              onMouseEnter={() => {
                setHoverIdx(i);
                setTip({
                  visible: true,
                  x: cx,
                  y: scaleY(Number(d[series[0]?.key]) || 0),
                  label: String(d[labelKey]),
                  items: series.map(s => ({ name: s.name, color: s.color, value: Number(d[s.key]) || 0 })),
                });
              }}
            />
          );
        })}
      </svg>
      <ChartTooltip tip={tip} dark={dark} />
    </div>
  );
}

// ─── MiniBarChart ─────────────────────────────────────────────────────────────
interface BarChartProps {
  data: DataPoint[];
  labelKey: string;
  series: { key: string; name: string; color: string | ((d: DataPoint) => string) }[];
  dark: boolean;
  barSize?: number;
  barGap?: number;
  showGrid?: boolean;
  showLabels?: boolean;
  height?: number;
}

export function MiniBarChart({
  data, labelKey, series, dark,
  barSize, barGap = 4, showGrid = false, showLabels = false, height = 180,
}: BarChartProps) {
  const [tip, setTip] = useState<TooltipState>({ visible: false, x: 0, y: 0, label: '', items: [] });
  const [W, setW] = useState(560);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const cw = entries[0].contentRect.width;
      if (cw > 0) setW(cw);
    });
    ro.observe(el);
    if (el.clientWidth > 0) setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const H = height;
  const padL = 0, padR = 0, padT = showLabels ? 22 : 16, padB = 28;
  const w = W - padL - padR;
  const h = H - padT - padB;
  const n = data.length;
  const ns = series.length;

  const groupW = w / n;
  const bW = barSize ?? Math.max(8, Math.floor(groupW / ns) - barGap - 2);
  const totalGroupW = ns * bW + (ns - 1) * barGap;

  const allVals = series.flatMap(s => data.map(d => Number(d[s.key]) || 0));
  const maxV = Math.max(...allVals, 1);

  const scaleY = (v: number) => padT + h - (v / maxV) * h;
  const barH  = (v: number) => (v / maxV) * h;
  const groupX = (i: number) => padL + i * groupW + (groupW - totalGroupW) / 2;
  const barX   = (gi: number, si: number) => groupX(gi) + si * (bW + barGap);

  const gridColor  = dark ? '#1f2937' : '#f0f1f3';
  const labelColor = dark ? '#6b7280' : '#9ca3af';
  const gridLines  = 4;
  const radius     = 4;

  function roundedRect(x: number, y: number, bw: number, bh: number, r: number) {
    if (bh < r) r = bh;
    return `M${x + r},${y} H${x + bw - r} Q${x + bw},${y} ${x + bw},${y + r} V${y + bh} H${x} V${y + r} Q${x},${y} ${x + r},${y}`;
  }

  return (
    <div ref={containerRef} className="relative w-full" style={{ height }}>
      <svg
        width={W}
        height={H}
        style={{ display: 'block', overflow: 'visible', width: '100%' }}
        onMouseLeave={() => setTip(t => ({ ...t, visible: false }))}
      >
        {showGrid && Array.from({ length: gridLines }).map((_, i) => {
          const y = padT + (h / (gridLines - 1)) * i;
          return <line key={`grid-${i}`} x1={padL} y1={y} x2={W - padR} y2={y} stroke={gridColor} strokeWidth={1} />;
        })}

        {data.map((d, gi) =>
          series.map((s, si) => {
            const val = Number(d[s.key]) || 0;
            const bh  = barH(val);
            const by  = scaleY(val);
            const bx  = barX(gi, si);
            const fill = typeof s.color === 'function' ? s.color(d) : s.color;
            return (
              <g key={`bar-${s.key}-${gi}`}>
                <path
                  d={roundedRect(bx, by, bW, bh, radius)}
                  fill={fill}
                />
                {showLabels && val > 0 && (
                  <text
                    x={bx + bW / 2}
                    y={by - 3}
                    textAnchor="middle"
                    fontSize={9}
                    fontWeight="600"
                    fill={fill}
                    opacity={0.9}
                  >
                    {val}
                  </text>
                )}
              </g>
            );
          })
        )}

        {data.map((d, i) => (
          <text
            key={`xlabel-${i}`}
            x={groupX(i) + totalGroupW / 2}
            y={H - 6}
            textAnchor="middle"
            fontSize={11}
            fill={labelColor}
          >
            {d[labelKey]}
          </text>
        ))}

        {data.map((d, i) => (
          <rect
            key={`hover-${i}`}
            x={padL + i * groupW}
            y={padT}
            width={groupW}
            height={h}
            fill="transparent"
            onMouseEnter={() => {
              setTip({
                visible: true,
                x: groupX(i) + totalGroupW / 2,
                y: padT + h / 2,
                label: String(d[labelKey]),
                items: series.map(s => ({
                  name: s.name,
                  color: typeof s.color === 'function' ? s.color(d) : s.color,
                  value: Number(d[s.key]) || 0,
                })),
              });
            }}
          />
        ))}
      </svg>
      <ChartTooltip tip={tip} dark={dark} />
    </div>
  );
}

// ─── MiniDonutChart ───────────────────────────────────────────────────────────
export interface DonutSlice { name: string; value: number; color: string; }
interface DonutProps {
  data: DonutSlice[];
  size?: number;
  innerRadius?: number;
  outerRadius?: number;
  dark?: boolean;
}
export function MiniDonutChart({ data, size = 150, innerRadius = 40, outerRadius = 65, dark = false }: DonutProps) {
  const [hovIdx, setHovIdx] = useState<number | null>(null);
  const cx = size / 2, cy = size / 2;
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <svg width={size} height={size} />;

  let angle = -Math.PI / 2;
  const slices = data.map((d, i) => {
    const sweep = (d.value / total) * 2 * Math.PI;
    const a1 = angle, a2 = angle + sweep;
    angle = a2;
    const r1 = innerRadius, r2 = hovIdx === i ? outerRadius + 4 : outerRadius;
    const x1 = cx + r2 * Math.cos(a1), y1 = cy + r2 * Math.sin(a1);
    const x2 = cx + r2 * Math.cos(a2), y2 = cy + r2 * Math.sin(a2);
    const x3 = cx + r1 * Math.cos(a2), y3 = cy + r1 * Math.sin(a2);
    const x4 = cx + r1 * Math.cos(a1), y4 = cy + r1 * Math.sin(a1);
    const large = sweep > Math.PI ? 1 : 0;
    const path = `M${x1},${y1} A${r2},${r2} 0 ${large},1 ${x2},${y2} L${x3},${y3} A${r1},${r1} 0 ${large},0 ${x4},${y4} Z`;
    return { ...d, path, sweep };
  });

  const gap = 3;
  return (
    <svg width={size} height={size} style={{ overflow: 'visible' }}>
      {slices.map((s, i) => (
        <path
          key={i}
          d={s.path}
          fill={s.color}
          opacity={hovIdx === null || hovIdx === i ? 1 : 0.55}
          style={{ cursor: 'pointer', transition: 'opacity .15s, d .15s' }}
          onMouseEnter={() => setHovIdx(i)}
          onMouseLeave={() => setHovIdx(null)}
        >
          <title>{s.name}: {((s.value / total) * 100).toFixed(1)}%</title>
        </path>
      ))}
    </svg>
  );
}