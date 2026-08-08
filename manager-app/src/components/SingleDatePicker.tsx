import { useEffect, useRef, useState } from 'react'
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from '../icons'
import type { Lang, Translations } from '../i18n'
import { theme } from '../theme'

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function todayYmd() {
  const n = new Date()
  return toDateStr(n.getFullYear(), n.getMonth(), n.getDate())
}

function fmtDisplay(dateStr: string) {
  if (!dateStr) return '—'
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
  value: string
  onChange: (date: string) => void
  dark: boolean
  lang: Lang
  tr: Translations
  max?: string
  onClear?: () => void
}

/** Client APK / SingleDatePicker uslubidagi custom sana tanlovchi */
export default function SingleDatePicker({
  value,
  onChange,
  dark,
  lang,
  tr,
  max,
  onClear,
}: Props) {
  const c = theme(dark)
  const indigo = '#6366f1'
  const maxDate = max || todayYmd()
  const dayHeaders = DAY_HEADERS[lang] ?? DAY_HEADERS.uzl
  const monthNames = MONTH_NAMES[lang] ?? MONTH_NAMES.uzl

  const [open, setOpen] = useState(false)
  const [viewYear, setViewYear] = useState(() =>
    value ? parseInt(value.split('-')[0], 10) : new Date().getFullYear(),
  )
  const [viewMonth, setViewMonth] = useState(() =>
    value ? parseInt(value.split('-')[1], 10) - 1 : new Date().getMonth(),
  )
  const [panelPos, setPanelPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [])

  useEffect(() => {
    if (!value || !open) return
    const [y, m] = value.split('-').map(Number)
    setViewYear(y)
    setViewMonth(m - 1)
  }, [value, open])

  useEffect(() => {
    if (!open) {
      setPanelPos(null)
      return
    }
    const update = () => {
      const el = btnRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const width = Math.max(r.width, 280)
      let left = r.left
      if (left + width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - width - 8)
      setPanelPos({ top: r.bottom + 8, left, width })
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [open])

  const now = new Date()
  const atOrBeyondCurrentMonth =
    viewYear > now.getFullYear() ||
    (viewYear === now.getFullYear() && viewMonth >= now.getMonth())

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear(y => y - 1)
      setViewMonth(11)
    } else setViewMonth(m => m - 1)
  }

  const nextMonth = () => {
    if (atOrBeyondCurrentMonth) return
    if (viewMonth === 11) {
      setViewYear(y => y + 1)
      setViewMonth(0)
    } else setViewMonth(m => m + 1)
  }

  const handleDayClick = (dateStr: string) => {
    if (dateStr > maxDate) return
    onChange(dateStr)
    setOpen(false)
  }

  const handleToday = () => {
    const today = todayYmd()
    const n = new Date()
    setViewYear(n.getFullYear())
    setViewMonth(n.getMonth())
    onChange(today)
    setOpen(false)
  }

  const handleClear = () => {
    if (onClear) onClear()
    else onChange(todayYmd())
    setOpen(false)
  }

  const cells = buildCells(viewYear, viewMonth)
  const monthLabel = `${monthNames[viewMonth]} ${viewYear}`
  const hasValue = !!value
  const todayStr = todayYmd()

  return (
    <div ref={ref} style={{ position: 'relative', flex: 1, minWidth: 0 }}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          height: 36,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 10px',
          borderRadius: 12,
          border: `1.5px solid ${hasValue || open ? indigo : c.border}`,
          background: hasValue || open
            ? dark ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.08)'
            : c.muted,
          color: hasValue || open ? indigo : c.text,
          cursor: 'pointer',
          fontWeight: 700,
          fontSize: 13,
        }}
      >
        <Calendar size={15} color={hasValue || open ? indigo : c.mutedText} />
        <span style={{ flex: 1, textAlign: 'left', fontVariantNumeric: 'tabular-nums' }}>
          {fmtDisplay(value)}
        </span>
        <ChevronDown
          size={14}
          color={c.mutedText}
          style={{
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s',
          }}
        />
      </button>

      {open && panelPos && (
        <>
          <div
            role="presentation"
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 4000,
              background: 'rgba(0,0,0,0.25)',
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: panelPos.top,
              left: panelPos.left,
              width: panelPos.width,
              zIndex: 4001,
              borderRadius: 16,
              border: `1px solid ${c.border}`,
              background: dark ? '#161616' : '#ffffff',
              boxShadow: dark
                ? '0 16px 40px rgba(0,0,0,0.55)'
                : '0 16px 40px rgba(15,23,42,0.18)',
              overflow: 'hidden',
            }}
          >
          <div style={{ padding: 12 }}>
            <div
              style={{
                marginBottom: 10,
                borderRadius: 12,
                padding: '8px 12px',
                textAlign: 'center',
                fontSize: 13,
                fontWeight: 700,
                background: dark ? 'rgba(99,102,241,0.2)' : '#eef2ff',
                color: dark ? '#c7d2fe' : indigo,
              }}
            >
              {tr.trackPickDate}
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 10,
              }}
            >
              <button
                type="button"
                onClick={prevMonth}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  border: 'none',
                  background: dark ? '#1f1f1f' : '#f3f4f6',
                  color: c.mutedText,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ChevronLeft size={16} color={c.mutedText} />
              </button>
              <span style={{ fontSize: 14, fontWeight: 800, color: c.text }}>{monthLabel}</span>
              <button
                type="button"
                disabled={atOrBeyondCurrentMonth}
                onClick={nextMonth}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  border: 'none',
                  background: dark ? '#1f1f1f' : '#f3f4f6',
                  color: c.mutedText,
                  cursor: atOrBeyondCurrentMonth ? 'default' : 'pointer',
                  opacity: atOrBeyondCurrentMonth ? 0.35 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ChevronRight size={16} color={c.mutedText} />
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                marginBottom: 4,
              }}
            >
              {dayHeaders.map(d => (
                <div
                  key={d}
                  style={{
                    height: 28,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 700,
                    color: c.mutedText,
                  }}
                >
                  {d}
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {cells.map(cell => {
                const isFuture = cell.dateStr > maxDate
                const isToday = cell.dateStr === todayStr
                const isSelected = cell.dateStr === value

                let bg = 'transparent'
                let color = cell.isCurrentMonth ? c.text : c.mutedText
                let border = 'none'
                let weight: number = cell.isCurrentMonth ? 600 : 500

                if (isSelected) {
                  bg = indigo
                  color = '#fff'
                  weight = 800
                } else if (isFuture) {
                  color = dark ? '#4b5563' : '#d1d5db'
                  weight = 500
                } else if (isToday) {
                  border = `2px solid ${indigo}`
                  color = indigo
                  weight = 800
                }

                return (
                  <button
                    key={cell.dateStr}
                    type="button"
                    disabled={isFuture}
                    onClick={() => handleDayClick(cell.dateStr)}
                    style={{
                      height: 36,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: 'none',
                      background: 'transparent',
                      padding: 0,
                      cursor: isFuture ? 'default' : 'pointer',
                    }}
                  >
                    <span
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: weight,
                        background: bg,
                        color,
                        border,
                        opacity: isFuture ? 0.45 : 1,
                      }}
                    >
                      {cell.day}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 16px',
              borderTop: `1px solid ${c.border}`,
            }}
          >
            <button
              type="button"
              onClick={handleClear}
              style={{
                border: 'none',
                background: 'transparent',
                color: c.mutedText,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {tr.trackClear}
            </button>
            <button
              type="button"
              onClick={handleToday}
              style={{
                border: 'none',
                background: 'transparent',
                color: indigo,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {tr.trackToday}
            </button>
          </div>
          </div>
        </>
      )}
    </div>
  )
}
