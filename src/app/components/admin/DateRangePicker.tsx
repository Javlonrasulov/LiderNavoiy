import { useEffect, useRef, useState } from 'react';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react';
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

const LABELS: Record<Lang, { clear: string; today: string; pickEnd: string; title: string; selected: string; hasData: string }> = {
  cy: { clear: 'Тозалаш', today: 'Бугун', pickEnd: 'Гача санани танланг...', title: 'Сана оралиғи', selected: 'Танланган', hasData: 'Маълумот бор' },
  uz: { clear: "O'chirish", today: 'Bugun', pickEnd: 'Gacha sanani tanlang...', title: 'Sana oralig\'i', selected: 'Tanlangan', hasData: "Ma'lumot bor" },
  ru: { clear: 'Очистить', today: 'Сегодня', pickEnd: 'Выберите конечную дату...', title: 'Период', selected: 'Выбрано', hasData: 'Есть данные' },
};

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function todayYmd() {
  const n = new Date();
  return toDateStr(n.getFullYear(), n.getMonth(), n.getDate());
}

function fmtShort(dateStr: string) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}-${m}-${y}`;
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
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  D: boolean;
  /** Dropdown opens upward when true */
  dropUp?: boolean;
  /** Navbar-style compact trigger (not full width) */
  compact?: boolean;
  /** Dates with activity (green dots under day) */
  hasDataDates?: Record<string, boolean>;
  /** Called when visible month changes (for loading dots) */
  onViewMonthChange?: (year: number, month: number) => void;
  /** Optional clear handler; default resets to month-start → today */
  onClear?: () => void;
}

/** LiderPlast navbar uslubidagi bitta kalendar — diapazon tanlash */
export function DateRangePicker({
  from,
  to,
  onChange,
  D,
  dropUp = false,
  compact = false,
  hasDataDates,
  onViewMonthChange,
  onClear,
}: Props) {
  const { lang } = useLang();
  const labels = LABELS[lang] ?? LABELS.uz;
  const dayHeaders = DAY_HEADERS[lang] ?? DAY_HEADERS.uz;
  const monthNames = MONTH_NAMES[lang] ?? MONTH_NAMES.uz;

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const [pickPhase, setPickPhase] = useState<'idle' | 'end'>('idle');
  const [tempFrom, setTempFrom] = useState('');
  const [hoverDate, setHoverDate] = useState('');

  const ref = useRef<HTMLDivElement>(null);
  const maxDateStr = todayYmd();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setPickPhase('idle');
        setHoverDate('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    onViewMonthChange?.(viewYear, viewMonth);
  }, [viewYear, viewMonth, onViewMonthChange]);

  const cappedTempFrom = tempFrom && tempFrom > maxDateStr ? maxDateStr : tempFrom;
  const cappedHover = hoverDate && hoverDate > maxDateStr ? maxDateStr : hoverDate;
  const rangeFrom = pickPhase === 'end' ? cappedTempFrom : from;
  const rangeTo = pickPhase === 'end' ? (cappedHover || cappedTempFrom) : to;
  const [rangeStart, rangeEnd] = rangeFrom <= rangeTo
    ? [rangeFrom, rangeTo]
    : [rangeTo, rangeFrom];

  const handleDayClick = (dateStr: string) => {
    if (dateStr > maxDateStr) return;
    if (pickPhase === 'idle') {
      setTempFrom(dateStr);
      setPickPhase('end');
      setHoverDate(dateStr);
    } else {
      const end = dateStr > maxDateStr ? maxDateStr : dateStr;
      const start = tempFrom > maxDateStr ? maxDateStr : tempFrom;
      const [a, b] = end >= start ? [start, end] : [end, start];
      onChange(a, b);
      setPickPhase('idle');
      setHoverDate('');
      setOpen(false);
    }
  };

  const handleClear = () => {
    if (onClear) {
      onClear();
    } else {
      const today = todayYmd();
      const monthStart = toDateStr(new Date().getFullYear(), new Date().getMonth(), 1);
      onChange(monthStart, today);
    }
    setPickPhase('idle');
    setHoverDate('');
    setTempFrom('');
  };

  const handleToday = () => {
    const today = todayYmd();
    const n = new Date();
    setViewYear(n.getFullYear());
    setViewMonth(n.getMonth());
    onChange(today, today);
    setPickPhase('idle');
    setHoverDate('');
    setOpen(false);
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const now = new Date();
  const atOrBeyondCurrentMonth =
    viewYear > now.getFullYear() || (viewYear === now.getFullYear() && viewMonth >= now.getMonth());

  const cells = buildCells(viewYear, viewMonth);
  const monthLabel = `${monthNames[viewMonth]} ${viewYear}`;

  const hasRange = !!(from && to);
  let triggerLabel = labels.title;
  if (hasRange && from !== to) {
    triggerLabel = `${fmtShort(from)} — ${fmtShort(to)}`;
  } else if (hasRange) {
    triggerLabel = fmtShort(from);
  }

  const panelBg = D ? 'bg-[#161616] border-gray-700' : 'bg-white border-slate-200';
  const muted = D ? 'text-gray-500' : 'text-slate-400';
  const textMain = D ? 'text-white' : 'text-slate-800';
  const showDots = !!hasDataDates;

  return (
    <div className={`relative ${compact ? '' : 'mt-2'}`} ref={ref}>
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setPickPhase('idle'); }}
        className={`flex shrink-0 items-center gap-1.5 sm:gap-2 rounded-xl text-sm border transition-all select-none
          ${compact ? 'h-9 px-2.5 sm:px-3.5' : 'w-full h-10 px-3'}
          ${hasRange
            ? D
              ? 'bg-indigo-900/30 border-indigo-600 text-indigo-300'
              : 'bg-indigo-50 border-indigo-300 text-indigo-700'
            : D
              ? 'bg-[#1a1a1a] border-gray-700 text-gray-300 hover:border-gray-600'
              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
          }`}
      >
        <Calendar size={15} className={hasRange ? 'text-indigo-500' : muted} />
        <span className={`${compact ? 'max-w-[160px]' : 'flex-1 text-left'} font-medium truncate`}>
          {triggerLabel}
        </span>
        {hasRange ? (
          <X
            size={13}
            className="text-indigo-400 hover:text-indigo-600 flex-shrink-0 ml-0.5"
            onClick={e => { e.stopPropagation(); handleClear(); }}
          />
        ) : (
          <ChevronDown size={13} className={muted} />
        )}
      </button>

      {open && (
        <div
          className={`absolute z-[80] ${panelBg} border rounded-2xl shadow-2xl overflow-hidden
            ${compact
              ? 'left-0 w-[min(20rem,calc(100vw-1rem))] max-w-[calc(100vw-1rem)]'
              : 'left-0 right-0 w-full'
            }
            ${dropUp ? 'bottom-full mb-2' : 'top-full mt-2'}`}
        >
          <div className="p-3">
            <p className={`${muted} text-[10px] font-bold uppercase tracking-widest mb-2.5 px-1`}>
              {labels.title}
            </p>

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
                onClick={() => { if (!atOrBeyondCurrentMonth) nextMonth(); }}
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
                const isFuture = cell.dateStr > maxDateStr;
                const isToday = cell.dateStr === maxDateStr;
                const isStart = cell.dateStr === rangeStart && rangeStart !== '';
                const isEnd = cell.dateStr === rangeEnd && rangeEnd !== '';
                const isSingle = isStart && isEnd;
                const isInRange = !isSingle && rangeStart && rangeEnd
                  && cell.dateStr > rangeStart && cell.dateStr < rangeEnd;
                const isRangeEdge = isStart || isEnd;
                const isStartEdge = isStart && !isSingle;
                const isEndEdge = isEnd && !isSingle;
                const hasData = !!(hasDataDates && hasDataDates[cell.dateStr]);

                let cellClass = `relative ${showDots ? 'h-10' : 'h-9'} w-full flex flex-col items-center justify-center text-xs transition-colors select-none ${
                  isFuture ? 'cursor-not-allowed' : 'cursor-pointer'
                } `;
                let innerClass = 'relative z-10 w-7 h-7 flex items-center justify-center rounded-full transition-all ';

                if (isInRange) {
                  cellClass += D ? 'bg-indigo-900/20 ' : 'bg-indigo-50 ';
                }
                if (isStartEdge) {
                  cellClass += D
                    ? 'bg-gradient-to-r from-transparent to-indigo-900/20 '
                    : 'bg-gradient-to-r from-transparent to-indigo-50 ';
                }
                if (isEndEdge) {
                  cellClass += D
                    ? 'bg-gradient-to-l from-transparent to-indigo-900/20 '
                    : 'bg-gradient-to-l from-transparent to-indigo-50 ';
                }

                if (isRangeEdge || isSingle) {
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
                    className={cellClass}
                    onClick={() => { if (!isFuture) handleDayClick(cell.dateStr); }}
                    onMouseEnter={() => {
                      if (pickPhase !== 'end') return;
                      setHoverDate(cell.dateStr > maxDateStr ? maxDateStr : cell.dateStr);
                    }}
                    onMouseLeave={() => pickPhase === 'end' && setHoverDate('')}
                  >
                    <div className={innerClass}>{cell.day}</div>
                    {showDots && hasData && !isFuture && (
                      <div className="mt-0.5 flex items-center justify-center">
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ring-1 ${
                            isRangeEdge || isSingle
                              ? 'bg-white ring-indigo-600'
                              : `bg-emerald-500 ${D ? 'ring-[#161616]' : 'ring-white'}`
                          }`}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {pickPhase === 'end' && (
              <p className="text-indigo-500 text-[11px] text-center mt-2 animate-pulse">
                {labels.pickEnd}
              </p>
            )}

            {showDots && (
              <div className={`mt-2.5 pt-2 border-t flex items-center justify-center gap-3 ${D ? 'border-gray-800' : 'border-slate-100'}`}>
                <span className={`inline-flex items-center gap-1 text-[10px] ${muted}`}>
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-600" />
                  {labels.selected}
                </span>
                <span className={`inline-flex items-center gap-1 text-[10px] ${muted}`}>
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                  {labels.hasData}
                </span>
              </div>
            )}
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
