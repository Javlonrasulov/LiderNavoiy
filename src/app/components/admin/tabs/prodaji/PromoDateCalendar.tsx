import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type Props = {
  D: boolean;
  t: Record<string, string>;
  validFrom: string;
  validTo: string;
  onChange: (from: string, to: string) => void;
};

function toStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function parseDate(d: string): Date | null {
  if (!d) return null;
  const [y, m, dd] = d.split('-').map(Number);
  if (!y || !m || !dd) return null;
  return new Date(y, m - 1, dd);
}

function fmtDisplay(d: string) {
  if (!d) return '';
  const [y, m, dd] = d.split('-');
  return `${dd}-${m}-${y}`;
}

function startOfWeek(d: Date) {
  const dow = (d.getDay() + 6) % 7;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - dow);
}

/** Client APK kalendari uslubidagi bitta range picker */
export function PromoDateCalendar({ D, t, validFrom, validTo, onChange }: Props) {
  const today = useMemo(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  }, []);
  const todayStr = toStr(today);

  const [viewDate, setViewDate] = useState(() => {
    const d = parseDate(validFrom) || parseDate(validTo) || today;
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [pickStart, setPickStart] = useState<string | null>(null);

  const months = (t.zatCalMonths || 'Yan,Fev,Mar,Apr,May,Iyun,Iyul,Avg,Sen,Okt,Noy,Dek').split(',');
  const days = (t.zatCalDays || 'Du,Se,Ch,Pa,Ju,Sh,Ya').split(',');

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startDow = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const rangeStart = pickStart ?? validFrom;
  const rangeEnd = pickStart ? pickStart : validTo;
  const lo = rangeStart && rangeEnd
    ? (rangeStart <= rangeEnd ? rangeStart : rangeEnd)
    : rangeStart;
  const hi = rangeStart && rangeEnd
    ? (rangeStart <= rangeEnd ? rangeEnd : rangeStart)
    : rangeEnd;

  const card = D ? '#1c1c1e' : '#ffffff';
  const soft = D ? 'rgba(255,255,255,0.06)' : '#f3f4f6';
  const brd = D ? '#2a2a2e' : '#e5e7eb';
  const txt = D ? '#f2f2f7' : '#111827';
  const muted = D ? '#9ca3af' : '#6b7280';
  const indigo = '#6366f1';

  const applyPreset = (preset: 'today' | 'week' | 'month' | 'unlimited') => {
    if (preset === 'unlimited') {
      setPickStart(null);
      onChange('', '');
      return;
    }
    const end = todayStr;
    let from = end;
    if (preset === 'week') from = toStr(startOfWeek(today));
    if (preset === 'month') from = toStr(new Date(today.getFullYear(), today.getMonth(), 1));
    setPickStart(null);
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
    onChange(from, end);
  };

  const handleSelect = (day: number) => {
    const d = toStr(new Date(year, month, day));
    if (!pickStart) {
      setPickStart(d);
      return;
    }
    let from = pickStart;
    let to = d;
    if (to < from) [from, to] = [to, from];
    onChange(from, to);
    setPickStart(null);
  };

  const hasRange = !!(validFrom && validTo);
  const summary = hasRange
    ? `${fmtDisplay(validFrom)} — ${fmtDisplay(validTo)}`
    : (t.aksiyaUnlimited ?? 'Cheksiz (admin ochirmaguncha)');

  const presets: { key: 'today' | 'week' | 'month' | 'unlimited'; label: string }[] = [
    { key: 'today', label: t.calToday || 'Bugun' },
    { key: 'week', label: t.calWeek || 'Hafta' },
    { key: 'month', label: t.calMonth || 'Oy' },
    { key: 'unlimited', label: t.aksiyaUnlimitedShort || 'Cheksiz' },
  ];

  return (
    <div
      style={{
        borderRadius: 16,
        border: `1px solid ${brd}`,
        background: card,
        padding: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: muted, letterSpacing: 0.6, textTransform: 'uppercase' }}>
            {t.aksiyaPeriod ?? 'Aksiya muddati'}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: txt, marginTop: 2 }}>
            {summary}
          </div>
        </div>
        {hasRange && (
          <button
            type="button"
            onClick={() => applyPreset('unlimited')}
            style={{
              border: 'none', background: 'transparent', color: muted,
              fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            {t.aksiyaClearDates ?? 'Tozalash'}
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        {presets.map((p) => {
          const selected = p.key === 'unlimited' ? !hasRange : false;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => applyPreset(p.key)}
              style={{
                height: 36, borderRadius: 12, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: selected ? 'none' : `1px solid ${brd}`,
                background: selected
                  ? `linear-gradient(135deg, ${indigo}, #8b5cf6)`
                  : soft,
                color: selected ? '#fff' : txt,
              }}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <button
          type="button"
          onClick={() => setViewDate(new Date(year, month - 1, 1))}
          style={{
            width: 32, height: 32, borderRadius: 10, border: `1px solid ${brd}`,
            background: soft, color: muted, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <ChevronLeft size={16} />
        </button>
        <span style={{ fontSize: 14, fontWeight: 700, color: txt }}>
          {months[month]} {year}
        </span>
        <button
          type="button"
          onClick={() => setViewDate(new Date(year, month + 1, 1))}
          style={{
            width: 32, height: 32, borderRadius: 10, border: `1px solid ${brd}`,
            background: soft, color: muted, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
        {days.map((d) => (
          <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: muted, padding: '4px 0' }}>
            {d}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {cells.map((day, idx) => {
          if (!day) return <div key={`e-${idx}`} style={{ height: 34 }} />;
          const dateStr = toStr(new Date(year, month, day));
          const inRange = !!(lo && hi && !pickStart && dateStr >= lo && dateStr <= hi);
          const isStart = dateStr === lo;
          const isEnd = dateStr === hi;
          const isEdge = isStart || isEnd;
          const picking = pickStart === dateStr;
          const tod = todayStr === dateStr;

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => handleSelect(day)}
              style={{
                height: 34, borderRadius: isEdge || picking ? 10 : inRange ? 0 : 10,
                border: 'none', cursor: 'pointer', fontSize: 13,
                fontWeight: isEdge || picking || tod ? 700 : 500,
                background: isEdge || picking
                  ? indigo
                  : inRange
                    ? (D ? 'rgba(99,102,241,0.22)' : '#e0e7ff')
                    : 'transparent',
                color: isEdge || picking
                  ? '#fff'
                  : inRange
                    ? (D ? '#c7d2fe' : '#4338ca')
                    : tod
                      ? indigo
                      : txt,
              }}
            >
              {day}
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 10, fontSize: 11, color: muted, lineHeight: 1.4 }}>
        {pickStart
          ? (t.calSelectEnd || 'Tugash sanasini tanlang')
          : (t.aksiyaDateHint ?? 'Sana tanlamasangiz — aksiya admin ochirmaguncha turadi')}
      </div>
    </div>
  );
}
