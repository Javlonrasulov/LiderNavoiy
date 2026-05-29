import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  value: string;           // 'YYYY-MM-DD'
  onChange: (val: string) => void;
  label: string;           // e.g. "📅 Boshlang'ich sanani tanlang"
  D: boolean;
  sub: string;
  markedDates?: Set<string>;
  t: Record<string, string>;
}

const TODAY = '2026-03-10';

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

export function DatePickerCalendar({ value, onChange, label, D, sub, markedDates, t }: Props) {
  const today = parseDate(TODAY)!;
  const selected = parseDate(value);

  const [viewDate, setViewDate] = useState<Date>(() => {
    const d = parseDate(value) || today;
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const months = (t.zatCalMonths || 'Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec').split(',');
  const days   = (t.zatCalDays   || 'Mo,Tu,We,Th,Fr,Sa,Su').split(',');

  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // build calendar grid (Mon-first)
  const firstDay = new Date(year, month, 1);
  const startDow = (firstDay.getDay() + 6) % 7; // 0=Mon
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const handleSelect = (day: number) => {
    const d = toStr(new Date(year, month, day));
    onChange(d);
    setOpen(false);
  };

  const displayVal = value
    ? value.split('-').reverse().join('.')
    : '—';

  const isSelected = (day: number) =>
    selected &&
    selected.getFullYear() === year &&
    selected.getMonth() === month &&
    selected.getDate() === day;

  const isToday = (day: number) =>
    today.getFullYear() === year &&
    today.getMonth() === month &&
    today.getDate() === day;

  const hasData = (day: number) =>
    markedDates?.has(toStr(new Date(year, month, day)));

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 transition-colors ${
          D
            ? `border-gray-700 bg-[#1a1a1a] hover:border-gray-600 ${open ? 'border-indigo-500' : ''}`
            : `border-gray-200 bg-white hover:border-gray-300 ${open ? 'border-indigo-400' : ''}`
        }`}
      >
        <span className={`text-xs font-medium ${sub}`}>{label.replace(/^📅\s*/, '')}</span>
        <span className={`text-sm font-semibold tabular-nums ${D ? 'text-white' : 'text-gray-900'}`}>
          {displayVal}
        </span>
      </button>

      {/* Popup */}
      {open && (
        <div
          className={`absolute z-50 top-full mt-2 left-0 rounded-2xl shadow-2xl border overflow-hidden select-none
            ${D ? 'bg-[#1c1c1e] border-gray-700' : 'bg-white border-gray-200'}`}
          style={{ width: 280 }}
        >
          {/* "Select date" label */}
          <div className={`mx-3 mt-3 mb-2 rounded-xl px-3 py-2 text-center text-sm font-medium
            ${D ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-50 text-indigo-600'}`}>
            {label}
          </div>

          {/* Month/Year navigation */}
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

          {/* Day headers */}
          <div className="grid grid-cols-7 px-3 pb-1">
            {days.map(d => (
              <div key={d} className={`text-center text-[11px] font-semibold py-1 ${sub}`}>
                {d}
              </div>
            ))}
          </div>

          {/* Date grid */}
          <div className="grid grid-cols-7 px-3 pb-2">
            {cells.map((day, idx) => {
              if (!day) return <div key={`e-${idx}`} />;
              const sel  = isSelected(day);
              const tod  = isToday(day);
              const data = hasData(day);
              return (
                <button
                  key={day}
                  onClick={() => handleSelect(day)}
                  className={`relative flex flex-col items-center justify-center w-9 h-9 mx-auto rounded-xl text-sm transition-colors
                    ${sel
                      ? 'bg-indigo-500 text-white font-bold'
                      : tod
                        ? D ? 'text-indigo-300 font-bold' : 'text-indigo-600 font-bold'
                        : D
                          ? 'text-gray-200 hover:bg-gray-700'
                          : 'text-gray-800 hover:bg-gray-100'
                    }`}
                >
                  <span>{day}</span>
                  {/* dot */}
                  {data && (
                    <span className={`absolute bottom-0.5 w-1 h-1 rounded-full ${sel ? 'bg-white/70' : 'bg-emerald-500'}`} />
                  )}
                  {!data && tod && !sel && (
                    <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-indigo-400" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
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
