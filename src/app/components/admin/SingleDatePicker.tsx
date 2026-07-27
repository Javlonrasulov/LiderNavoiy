import { useEffect, useRef, useState } from 'react';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLang, type Lang } from '../LangContext';

const DAY_HEADERS: Record<Lang, string[]> = {
  cy: ['Дш', 'Се', 'Чо', 'Па', 'Жу', 'Ша', 'Як'],
  uz: ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'],
  ru: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
};

const MONTH_NAMES: Record<Lang, string[]> = {
  cy: ['Январ', 'Феврал', 'Март', 'Апрел', 'Май', 'Июн', 'Июл', 'Август', 'Сентябр', 'Октябр', 'Ноябр', 'Декабр'],
  uz: ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'],
  ru: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
};

const LABELS: Record<Lang, { clear: string; today: string }> = {
  cy: { clear: 'Тозалаш', today: 'Бугун' },
  uz: { clear: "O'chirish", today: 'Bugun' },
  ru: { clear: 'Очистить', today: 'Сегодня' },
};

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function todayYmd() {
  const n = new Date();
  return toDateStr(n.getFullYear(), n.getMonth(), n.getDate());
}

function fmtDisplay(dateStr: string) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}.${m}.${y}`;
}

interface Cell { dateStr: string; day: number; isCurrentMonth: boolean }

function buildCells(year: number, month: number): Cell[] {
  const firstDow = ((new Date(year, month, 1).getDay() + 6) % 7);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();
  const cells: Cell[] = [];

  for (let i = firstDow - 1; i >= 0; i--) {
    const d = daysInPrev - i;
    const [py, pm] = month === 0 ? [year - 1, 11] : [year, month - 1];
    cells.push({ dateStr: toDateStr(py, pm, d), day: d, isCurrentMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ dateStr: toDateStr(year, month, d), day: d, isCurrentMonth: true });
  }
  let nd = 1;
  while (cells.length < 42) {
    const [ny, nm] = month === 11 ? [year + 1, 0] : [year, month + 1];
    cells.push({ dateStr: toDateStr(ny, nm, nd++), day: nd - 1, isCurrentMonth: false });
  }
  return cells;
}

interface Props {
  value: string;
  onChange: (date: string) => void;
  D?: boolean;
  max?: string;
  onClear?: () => void;
  className?: string;
}

/** LiderPlast navbar / SingleDatePicker uslubidagi bitta sana tanlovchi */
export function SingleDatePicker({ value, onChange, D = false, max, onClear, className = '' }: Props) {
  const { lang } = useLang();
  const labels = LABELS[lang] ?? LABELS.uz;
  const dayHeaders = DAY_HEADERS[lang] ?? DAY_HEADERS.uz;
  const monthNames = MONTH_NAMES[lang] ?? MONTH_NAMES.uz;

  const maxDate = max || todayYmd();
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => {
    if (value) return parseInt(value.split('-')[0], 10);
    return new Date().getFullYear();
  });
  const [viewMonth, setViewMonth] = useState(() => {
    if (value) return parseInt(value.split('-')[1], 10) - 1;
    return new Date().getMonth();
  });

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!value || !open) return;
    const [y, m] = value.split('-').map(Number);
    setViewYear(y);
    setViewMonth(m - 1);
  }, [value, open]);

  const now = new Date();
  const atOrBeyondCurrentMonth =
    viewYear > now.getFullYear() || (viewYear === now.getFullYear() && viewMonth >= now.getMonth());

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (atOrBeyondCurrentMonth) return;
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const handleDayClick = (dateStr: string) => {
    if (dateStr > maxDate) return;
    onChange(dateStr);
    setOpen(false);
  };

  const handleToday = () => {
    const today = todayYmd();
    const n = new Date();
    setViewYear(n.getFullYear());
    setViewMonth(n.getMonth());
    onChange(today);
    setOpen(false);
  };

  const handleClear = () => {
    if (onClear) onClear();
    else onChange(todayYmd());
    setOpen(false);
  };

  const cells = buildCells(viewYear, viewMonth);
  const monthLabel = `${monthNames[viewMonth]} ${viewYear}`;
  const hasValue = !!value;

  const panelBg = D ? 'bg-[#161616] border-gray-700' : 'bg-white border-slate-200';
  const muted = D ? 'text-gray-500' : 'text-slate-400';
  const textMain = D ? 'text-white' : 'text-slate-800';

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`flex shrink-0 items-center gap-1.5 sm:gap-2 h-9 px-2.5 sm:px-3.5 rounded-xl text-sm border transition-all select-none min-w-[130px] sm:min-w-[150px]
          ${hasValue
            ? D
              ? 'bg-indigo-900/30 border-indigo-600 text-indigo-300'
              : 'bg-indigo-50 border-indigo-300 text-indigo-700'
            : D
              ? 'bg-[#1a1a1a] border-gray-700 text-gray-300 hover:border-gray-600'
              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
          }`}
      >
        <Calendar size={15} className={hasValue ? 'text-indigo-500 flex-shrink-0' : `${muted} flex-shrink-0`} />
        <span className="flex-1 text-left font-medium truncate tabular-nums">
          {value ? fmtDisplay(value) : '—'}
        </span>
        <ChevronDown
          size={13}
          className={`${muted} flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          className={`absolute left-0 top-full z-[90] mt-2 w-[min(18rem,calc(100vw-1rem))] ${panelBg} border rounded-2xl shadow-2xl overflow-hidden`}
        >
          <div className="p-3">
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={prevMonth}
                className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${muted}
                  ${D ? 'hover:bg-gray-800' : 'hover:bg-slate-100'}`}
              >
                <ChevronLeft size={16} />
              </button>
              <span className={`${textMain} text-sm font-semibold select-none`}>{monthLabel}</span>
              <button
                type="button"
                disabled={atOrBeyondCurrentMonth}
                onClick={nextMonth}
                className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${muted}
                  ${atOrBeyondCurrentMonth
                    ? 'opacity-30 cursor-not-allowed'
                    : D ? 'hover:bg-gray-800' : 'hover:bg-slate-100'
                  }`}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="grid grid-cols-7 mb-1">
              {dayHeaders.map(d => (
                <div key={d} className={`h-7 flex items-center justify-center text-[11px] font-semibold ${muted}`}>
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {cells.map(cell => {
                const isFuture = cell.dateStr > maxDate;
                const isToday = cell.dateStr === todayYmd();
                const isSelected = cell.dateStr === value;

                let innerClass = `w-7 h-7 flex items-center justify-center rounded-full text-xs transition-all ${
                  isFuture ? 'cursor-not-allowed' : 'cursor-pointer'
                } `;

                if (isSelected) {
                  innerClass += 'bg-indigo-600 text-white shadow-md shadow-indigo-300/40 ';
                } else if (isFuture) {
                  innerClass += D ? 'text-gray-700 opacity-40 ' : 'text-slate-300 opacity-40 ';
                } else if (isToday) {
                  innerClass += 'border-2 border-indigo-400 text-indigo-500 ';
                } else if (cell.isCurrentMonth) {
                  innerClass += D
                    ? 'text-gray-300 hover:bg-gray-800 '
                    : 'text-slate-700 hover:bg-slate-100 ';
                } else {
                  innerClass += D
                    ? 'text-gray-600 hover:bg-gray-800/50 '
                    : 'text-slate-300 hover:bg-slate-50 ';
                }

                return (
                  <div
                    key={cell.dateStr}
                    className="h-8 flex items-center justify-center"
                    onClick={() => { if (!isFuture) handleDayClick(cell.dateStr); }}
                  >
                    <div className={innerClass}>{cell.day}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={`flex items-center justify-between px-4 py-3 border-t ${D ? 'border-gray-800' : 'border-slate-100'}`}>
            <button
              type="button"
              onClick={handleClear}
              className={`text-sm font-medium transition-colors ${muted} hover:text-red-500`}
            >
              {labels.clear}
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="text-sm text-indigo-500 hover:text-indigo-700 font-medium transition-colors"
            >
              {labels.today}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
