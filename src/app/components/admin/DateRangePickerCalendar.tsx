import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTashkentToday } from '../../hooks/useTashkentToday';

interface Props {
  start: string;
  end: string;
  onChange: (start: string, end: string) => void;
  labelFrom: string;
  labelTo: string;
  D: boolean;
  sub: string;
  markedDates?: Set<string>;
  t: Record<string, string>;
}

function parseDate(d: string): Date | null {
  if (!d) return null;
  const [y, m, dd] = d.split('-').map(Number);
  return new Date(y, m - 1, dd);
}

function toStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function fmtDisplay(d: string) {
  return d ? d.split('-').reverse().join('-') : '—';
}

function weekStart(d: Date): Date {
  const dow = (d.getDay() + 6) % 7;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - dow);
}

function monthStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function DateRangePickerCalendar({
  start,
  end,
  onChange,
  labelFrom,
  labelTo,
  D,
  sub,
  markedDates,
  t,
}: Props) {
  const { todayStr, today } = useTashkentToday();

  const [viewDate, setViewDate] = useState<Date>(() => {
    const d = parseDate(start);
    if (d) return new Date(d.getFullYear(), d.getMonth(), 1);
    return new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  });
  const [open, setOpen] = useState(false);
  const [pickStart, setPickStart] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setPickStart(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const months = (t.zatCalMonths || 'Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec').split(',');
  const days = (t.zatCalDays || 'Mo,Tu,We,Th,Fr,Sa,Su').split(',');

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

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const rangeStart = pickStart ?? start;
  const rangeEnd = pickStart ? pickStart : end;
  const lo = rangeStart <= rangeEnd ? rangeStart : rangeEnd;
  const hi = rangeStart <= rangeEnd ? rangeEnd : rangeStart;

  const handleOpen = () => {
    setOpen(v => {
      if (!v) setPickStart(null);
      return !v;
    });
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
    setOpen(false);
  };

  const applyPreset = (preset: 'today' | 'week' | 'month') => {
    if (!today || !todayStr) return;
    const end = todayStr;
    let from: string;
    if (preset === 'today') {
      from = end;
    } else if (preset === 'week') {
      from = toStr(weekStart(today));
    } else {
      from = toStr(monthStart(today));
    }
    onChange(from, end);
    setPickStart(null);
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setOpen(false);
  };

  const presetBtn = (preset: 'today' | 'week' | 'month', label: string) => (
    <button
      key={preset}
      disabled={!todayStr}
      onClick={() => applyPreset(preset)}
      className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-colors disabled:opacity-40
        ${D
          ? 'bg-white/[0.06] text-gray-200 hover:bg-indigo-500/25 hover:text-indigo-300'
          : 'bg-gray-100 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'
        }`}
    >
      {label}
    </button>
  );

  const hint = pickStart
    ? (t.calSelectEnd || labelTo)
    : (t.calSelectStart || labelFrom);

  return (
    <div ref={containerRef} className="relative flex-shrink-0">
      <button
        onClick={handleOpen}
        className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 transition-colors ${
          D
            ? `border-gray-700 bg-[#1a1a1a] hover:border-gray-600 ${open ? 'border-indigo-500' : ''}`
            : `border-gray-200 bg-white hover:border-gray-300 ${open ? 'border-indigo-400' : ''}`
        }`}
      >
        <span className={`text-xs font-medium ${sub}`}>{labelFrom.replace(/^📅\s*/, '')}</span>
        <span className={`text-sm font-semibold tabular-nums ${D ? 'text-white' : 'text-gray-900'}`}>
          {fmtDisplay(start)}
        </span>
        <span className={`text-xs ${sub}`}>—</span>
        <span className={`text-xs font-medium ${sub}`}>{labelTo.replace(/^📅\s*/, '')}</span>
        <span className={`text-sm font-semibold tabular-nums ${D ? 'text-white' : 'text-gray-900'}`}>
          {fmtDisplay(end)}
        </span>
      </button>

      {open && (
        <div
          className={`absolute z-50 top-full mt-2 left-0 rounded-2xl shadow-2xl border overflow-hidden select-none
            ${D ? 'bg-[#1c1c1e] border-gray-700' : 'bg-white border-gray-200'}`}
          style={{ width: 280 }}
        >
          <div className={`mx-3 mt-3 mb-2 rounded-xl px-3 py-2 text-center text-sm font-medium
            ${D ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-50 text-indigo-600'}`}>
            {hint}
          </div>

          <div className="flex items-center justify-between px-3 pb-3">
            <button
              onClick={prevMonth}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors
                ${D ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}
            >
              <ChevronLeft size={16} />
            </button>
            <span className={`text-sm font-bold ${D ? 'text-white' : 'text-gray-900'}`}>
              {months[month]} {year}
            </span>
            <button
              onClick={nextMonth}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors
                ${D ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 px-3 pb-1">
            {days.map(d => (
              <div key={d} className={`text-center text-[11px] font-semibold py-1 ${sub}`}>
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 px-3 pb-2">
            {cells.map((day, idx) => {
              if (!day) return <div key={`e-${idx}`} />;
              const dateStr = toStr(new Date(year, month, day));
              const inRange = !pickStart && dateStr >= lo && dateStr <= hi;
              const isStart = dateStr === lo;
              const isEnd = dateStr === hi;
              const isEdge = isStart || isEnd;
              const tod = todayStr === dateStr;
              const data = markedDates?.has(dateStr);
              const picking = pickStart === dateStr;

              return (
                <button
                  key={day}
                  onClick={() => handleSelect(day)}
                  className={`relative flex flex-col items-center justify-center w-9 h-9 mx-auto text-sm transition-colors
                    ${isEdge || picking
                      ? 'bg-indigo-500 text-white font-bold rounded-xl z-10'
                      : inRange
                        ? D
                          ? 'bg-indigo-500/20 text-indigo-200 rounded-none'
                          : 'bg-indigo-100 text-indigo-700 rounded-none'
                        : tod
                          ? D ? 'text-indigo-300 font-bold rounded-xl' : 'text-indigo-600 font-bold rounded-xl'
                          : D
                            ? 'text-gray-200 hover:bg-gray-700 rounded-xl'
                            : 'text-gray-800 hover:bg-gray-100 rounded-xl'
                    }`}
                >
                  <span>{day}</span>
                  {data && (
                    <span className={`absolute bottom-0.5 w-1 h-1 rounded-full ${isEdge || picking ? 'bg-white/70' : 'bg-emerald-500'}`} />
                  )}
                  {!data && tod && !isEdge && !picking && !inRange && (
                    <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-indigo-400" />
                  )}
                </button>
              );
            })}
          </div>

          <div className={`flex items-center gap-1.5 px-3 pb-2.5 border-t ${D ? 'border-gray-700' : 'border-gray-100'}`}>
            {presetBtn('today', t.calToday || 'Bugun')}
            {presetBtn('week', t.calWeek || 'Hafta')}
            {presetBtn('month', t.calMonth || 'Oy')}
          </div>

          <div className={`flex items-center gap-4 px-4 py-2.5 border-t text-[11px] ${D ? 'border-gray-700' : 'border-gray-100'} ${sub}`}>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
              {t.calSelected || 'Tanlangan'}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              {t.calHasData || "Ma'lumot bor"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
