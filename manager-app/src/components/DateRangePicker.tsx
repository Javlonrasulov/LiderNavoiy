import { useEffect, useRef, useState } from 'react'
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, X } from '../icons'
import type { Lang, Translations } from '../i18n'
import { theme } from '../theme'

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function todayYmd() {
  const n = new Date()
  return toDateStr(n.getFullYear(), n.getMonth(), n.getDate())
}

function fmtShort(dateStr: string) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${d}-${m}-${y}`
}

interface Cell {
  dateStr: string
  day: number
  isCurrentMonth: boolean
}

function buildCells(year: number, month: number): Cell[] {
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrev = new Date(year, month, 0).getDate()
  const cells: Cell[] = []

  for (let i = firstDow - 1; i >= 0; i--) {
    const d = daysInPrev - i
    const [py, pm] = month === 0 ? [year - 1, 11] : [year, month - 1]
    cells.push({ dateStr: toDateStr(py, pm, d), day: d, isCurrentMonth: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ dateStr: toDateStr(year, month, d), day: d, isCurrentMonth: true })
  }
  let nd = 1
  while (cells.length < 42) {
    const [ny, nm] = month === 11 ? [year + 1, 0] : [year, month + 1]
    cells.push({ dateStr: toDateStr(ny, nm, nd), day: nd, isCurrentMonth: false })
    nd += 1
  }
  return cells
}

const DAY_HEADERS: Record<Lang, string[]> = {
  uzc: ['Дш', 'Се', 'Чо', 'Па', 'Жу', 'Ша', 'Як'],
  uzl: ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'],
  ru: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
}

const MONTH_NAMES: Record<Lang, string[]> = {
  uzc: ['Январ', 'Феврал', 'Март', 'Апрел', 'Май', 'Июн', 'Июл', 'Август', 'Сентябр', 'Октябр', 'Ноябр', 'Декабр'],
  uzl: ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'],
  ru: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
}

interface Props {
  from: string
  to: string
  onChange: (from: string, to: string) => void
  dark: boolean
  lang: Lang
  tr: Translations
  onClear?: () => void
}

/** Bitta kalendardan sana oralig‘ini tanlash (admin DateRangePicker uslubi) */
export default function DateRangePicker({
  from,
  to,
  onChange,
  dark,
  lang,
  tr,
  onClear,
}: Props) {
  const c = theme(dark)
  const dayHeaders = DAY_HEADERS[lang] ?? DAY_HEADERS.uzl
  const monthNames = MONTH_NAMES[lang] ?? MONTH_NAMES.uzl
  const maxDateStr = todayYmd()

  const [open, setOpen] = useState(false)
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth())
  const [pickPhase, setPickPhase] = useState<'idle' | 'end'>('idle')
  const [tempFrom, setTempFrom] = useState('')
  const [hoverDate, setHoverDate] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setPickPhase('idle')
        setHoverDate('')
      }
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [])

  const cappedTempFrom = tempFrom && tempFrom > maxDateStr ? maxDateStr : tempFrom
  const cappedHover = hoverDate && hoverDate > maxDateStr ? maxDateStr : hoverDate
  const rangeFrom = pickPhase === 'end' ? cappedTempFrom : from
  const rangeTo = pickPhase === 'end' ? (cappedHover || cappedTempFrom) : to
  const [rangeStart, rangeEnd] = rangeFrom <= rangeTo
    ? [rangeFrom, rangeTo]
    : [rangeTo, rangeFrom]

  const handleDayClick = (dateStr: string) => {
    if (dateStr > maxDateStr) return
    if (pickPhase === 'idle') {
      setTempFrom(dateStr)
      setPickPhase('end')
      setHoverDate(dateStr)
    } else {
      const end = dateStr > maxDateStr ? maxDateStr : dateStr
      const start = tempFrom > maxDateStr ? maxDateStr : tempFrom
      const [a, b] = end >= start ? [start, end] : [end, start]
      onChange(a, b)
      setPickPhase('idle')
      setHoverDate('')
      setOpen(false)
    }
  }

  const handleClear = () => {
    if (onClear) {
      onClear()
    } else {
      const today = todayYmd()
      onChange(toDateStr(new Date().getFullYear(), new Date().getMonth(), 1), today)
    }
    setPickPhase('idle')
    setHoverDate('')
    setTempFrom('')
  }

  const handleToday = () => {
    const today = todayYmd()
    const n = new Date()
    setViewYear(n.getFullYear())
    setViewMonth(n.getMonth())
    onChange(today, today)
    setPickPhase('idle')
    setHoverDate('')
    setOpen(false)
  }

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear(y => y - 1)
      setViewMonth(11)
    } else {
      setViewMonth(m => m - 1)
    }
  }

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewYear(y => y + 1)
      setViewMonth(0)
    } else {
      setViewMonth(m => m + 1)
    }
  }

  const now = new Date()
  const atOrBeyondCurrentMonth =
    viewYear > now.getFullYear() || (viewYear === now.getFullYear() && viewMonth >= now.getMonth())

  const cells = buildCells(viewYear, viewMonth)
  const monthLabel = `${monthNames[viewMonth]} ${viewYear}`
  const hasRange = !!(from && to)
  const triggerLabel = hasRange && from !== to
    ? `${fmtShort(from)} — ${fmtShort(to)}`
    : hasRange
      ? fmtShort(from)
      : tr.statDateRange

  return (
    <div ref={ref} style={{ position: 'relative', marginTop: 10 }}>
      <button
        type="button"
        onClick={() => {
          setOpen(o => !o)
          setPickPhase('idle')
        }}
        style={{
          width: '100%', height: 44, borderRadius: 14, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px',
          border: `1px solid ${hasRange ? 'rgba(108,92,231,0.45)' : c.border}`,
          background: hasRange
            ? (dark ? 'rgba(108,92,231,0.18)' : 'rgba(108,92,231,0.08)')
            : c.card,
          color: hasRange ? c.primary : c.text,
        }}
      >
        <Calendar size={16} color={hasRange ? c.primary : c.mutedText} />
        <span style={{ flex: 1, textAlign: 'left', fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {triggerLabel}
        </span>
        {hasRange ? (
          <span
            role="button"
            tabIndex={0}
            onClick={e => {
              e.stopPropagation()
              handleClear()
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation()
                handleClear()
              }
            }}
            style={{ display: 'flex', alignItems: 'center' }}
          >
            <X size={14} color={c.primary} />
          </span>
        ) : (
          <ChevronDown size={14} color={c.mutedText} />
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 8, zIndex: 90,
          borderRadius: 18, overflow: 'hidden',
          background: c.card,
          border: `1px solid ${c.border}`,
          boxShadow: dark ? '0 16px 40px rgba(0,0,0,0.45)' : '0 16px 40px rgba(15,23,42,0.14)',
        }}>
          <div style={{ padding: 14 }}>
            <p style={{
              fontSize: 10, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase',
              color: c.mutedText, marginBottom: 10, paddingLeft: 2,
            }}>
              {tr.statDateRange}
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <button
                type="button"
                onClick={prevMonth}
                style={{
                  width: 32, height: 32, borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: c.muted, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <ChevronLeft size={16} color={c.mutedText} />
              </button>
              <span style={{ fontSize: 14, fontWeight: 700, color: c.text }}>{monthLabel}</span>
              <button
                type="button"
                disabled={atOrBeyondCurrentMonth}
                onClick={() => { if (!atOrBeyondCurrentMonth) nextMonth() }}
                style={{
                  width: 32, height: 32, borderRadius: 10, border: 'none',
                  cursor: atOrBeyondCurrentMonth ? 'not-allowed' : 'pointer',
                  opacity: atOrBeyondCurrentMonth ? 0.35 : 1,
                  background: c.muted, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <ChevronRight size={16} color={c.mutedText} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
              {dayHeaders.map(d => (
                <div key={d} style={{
                  height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: c.mutedText,
                }}>
                  {d}
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {cells.map(cell => {
                const isFuture = cell.dateStr > maxDateStr
                const isToday = cell.dateStr === maxDateStr
                const isStart = cell.dateStr === rangeStart && rangeStart !== ''
                const isEnd = cell.dateStr === rangeEnd && rangeEnd !== ''
                const isSingle = isStart && isEnd
                const isInRange = !isSingle && !!rangeStart && !!rangeEnd
                  && cell.dateStr > rangeStart && cell.dateStr < rangeEnd
                const isRangeEdge = isStart || isEnd

                let cellBg = 'transparent'
                if (isInRange) cellBg = dark ? 'rgba(108,92,231,0.18)' : 'rgba(108,92,231,0.1)'
                if (isStart && !isSingle) {
                  cellBg = dark
                    ? 'linear-gradient(to right, transparent, rgba(108,92,231,0.18))'
                    : 'linear-gradient(to right, transparent, rgba(108,92,231,0.1))'
                }
                if (isEnd && !isSingle) {
                  cellBg = dark
                    ? 'linear-gradient(to left, transparent, rgba(108,92,231,0.18))'
                    : 'linear-gradient(to left, transparent, rgba(108,92,231,0.1))'
                }

                let dayBg = 'transparent'
                let dayColor = cell.isCurrentMonth ? c.text : c.mutedText
                let dayBorder = 'none'
                if (isRangeEdge || isSingle) {
                  dayBg = c.primary
                  dayColor = '#fff'
                } else if (isFuture) {
                  dayColor = c.mutedText
                } else if (isToday) {
                  dayBorder = `2px solid ${c.primary}`
                  dayColor = c.primary
                }

                return (
                  <div
                    key={cell.dateStr}
                    onClick={() => { if (!isFuture) handleDayClick(cell.dateStr) }}
                    onMouseEnter={() => {
                      if (pickPhase !== 'end') return
                      setHoverDate(cell.dateStr > maxDateStr ? maxDateStr : cell.dateStr)
                    }}
                    onMouseLeave={() => pickPhase === 'end' && setHoverDate('')}
                    style={{
                      height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: cellBg,
                      cursor: isFuture ? 'not-allowed' : 'pointer',
                      opacity: isFuture ? 0.4 : 1,
                      userSelect: 'none',
                    }}
                  >
                    <div style={{
                      width: 30, height: 30, borderRadius: 99,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700,
                      background: dayBg, color: dayColor, border: dayBorder,
                    }}>
                      {cell.day}
                    </div>
                  </div>
                )
              })}
            </div>

            {pickPhase === 'end' && (
              <p style={{ textAlign: 'center', marginTop: 10, fontSize: 11, fontWeight: 700, color: c.primary }}>
                {tr.statPickEnd}
              </p>
            )}
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', borderTop: `1px solid ${c.border}`,
          }}>
            <button
              type="button"
              onClick={handleClear}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: c.mutedText }}
            >
              {tr.trackClear}
            </button>
            <button
              type="button"
              onClick={handleToday}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: c.primary }}
            >
              {tr.trackToday}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
