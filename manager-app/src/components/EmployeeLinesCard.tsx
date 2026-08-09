import { useEffect, useMemo, useState } from 'react'
import { GitBranch } from '../icons'
import { fetchLines } from '../api/manager'
import type { Distributor, EmployeeLocation } from '../api/types'
import type { Lang, Translations } from '../i18n'
import { theme } from '../theme'
import {
  WEEK_DAYS,
  linesByWeekday,
  resolveEmployeeLines,
  todayLineDay,
  weekdayFullLabels,
  weekdayLabels,
  type EmployeeLineAssignment,
} from '../utils/employeeLines'

interface Props {
  dark: boolean
  lang: Lang
  tr: Translations
  distributor: Distributor
  location?: EmployeeLocation
  /** Tanlangan tracking sanasi — shu kunni highlight qilish */
  selectedDate?: string
}

export default function EmployeeLinesCard({
  dark,
  lang,
  tr,
  distributor,
  location,
  selectedDate,
}: Props) {
  const c = theme(dark)
  const indigo = c.primary
  const gold = c.gold
  const [assignments, setAssignments] = useState<EmployeeLineAssignment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void (async () => {
      try {
        const companyId = distributor.companyId || undefined
        const lines = await fetchLines(companyId)
        if (cancelled) return
        setAssignments(
          resolveEmployeeLines(Array.isArray(lines) ? lines : [], distributor, location),
        )
      } catch {
        if (!cancelled) setAssignments([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [distributor, location])

  const byDay = useMemo(() => linesByWeekday(assignments), [assignments])
  const short = weekdayLabels(lang)
  const full = weekdayFullLabels(lang)
  const focusDay = todayLineDay(selectedDate)

  const todayLines = byDay[focusDay] ?? []

  return (
    <div
      style={{
        borderRadius: 16,
        border: `1px solid ${c.border}`,
        background: c.card,
        marginBottom: 12,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '14px 14px 12px',
          borderBottom: `1px solid ${c.border}`,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            background: `${indigo}18`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <GitBranch size={16} color={indigo} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: c.text }}>{tr.lineSectionTitle}</div>
          <div style={{ fontSize: 11, color: c.mutedText, marginTop: 2, fontWeight: 600 }}>
            {tr.lineSectionHint}
          </div>
        </div>
      </div>

      <div style={{ padding: 14 }}>
        {loading && (
          <p style={{ textAlign: 'center', color: c.mutedText, fontSize: 13, padding: 8 }}>
            {tr.loading}
          </p>
        )}

        {!loading && assignments.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '18px 12px',
              borderRadius: 14,
              background: c.muted,
              border: `1px dashed ${c.border}`,
            }}
          >
            <p style={{ fontSize: 13, fontWeight: 700, color: c.mutedText }}>{tr.lineNoSchedule}</p>
            <p style={{ fontSize: 11, color: c.mutedText, marginTop: 4 }}>{tr.lineNoScheduleHint}</p>
          </div>
        )}

        {!loading && assignments.length > 0 && (
          <>
            {/* Bugungi / tanlangan kun */}
            <div
              style={{
                marginBottom: 12,
                padding: '12px 14px',
                borderRadius: 14,
                background: dark ? 'rgba(108,92,231,0.12)' : 'rgba(108,92,231,0.08)',
                border: `1px solid ${indigo}44`,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: indigo, marginBottom: 6 }}>
                {full[focusDay]} · {tr.lineTodayFocus}
              </div>
              {todayLines.length === 0 ? (
                <div style={{ fontSize: 13, fontWeight: 700, color: c.mutedText }}>
                  {tr.lineRestDay}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {todayLines.map(a => (
                    <div
                      key={`${a.line.id}-${a.role}-today`}
                      style={{ display: 'flex', alignItems: 'center', gap: 10 }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          padding: '4px 8px',
                          borderRadius: 8,
                          background: a.role === 'delivery' ? `${gold}22` : `${indigo}22`,
                          color: a.role === 'delivery' ? gold : indigo,
                          flexShrink: 0,
                        }}
                      >
                        {a.line.code}
                      </span>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 800,
                            color: c.text,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {a.line.name}
                        </div>
                        <div style={{ fontSize: 11, color: c.mutedText, fontWeight: 600 }}>
                          {a.role === 'delivery' ? tr.delivery : tr.agents}
                          {a.line.clientCount != null ? ` · ${a.line.clientCount} TT` : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Haftalik jadval */}
            <div style={{ fontSize: 11, fontWeight: 800, color: c.mutedText, marginBottom: 8, letterSpacing: '0.04em' }}>
              {tr.lineWeekSchedule}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {WEEK_DAYS.map(day => {
                const rows = byDay[day] ?? []
                const isFocus = day === focusDay
                return (
                  <div
                    key={day}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 12px',
                      borderRadius: 12,
                      background: isFocus
                        ? dark ? 'rgba(108,92,231,0.14)' : 'rgba(108,92,231,0.08)'
                        : c.muted,
                      border: `1px solid ${isFocus ? indigo : c.border}`,
                    }}
                  >
                    <div
                      style={{
                        width: 42,
                        flexShrink: 0,
                        textAlign: 'center',
                      }}
                    >
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 900,
                          color: isFocus ? indigo : c.text,
                        }}
                      >
                        {short[day]}
                      </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {rows.length === 0 ? (
                        <span style={{ fontSize: 12, fontWeight: 600, color: c.mutedText }}>
                          {tr.lineRestDay}
                        </span>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {rows.map(a => (
                            <span
                              key={`${day}-${a.line.id}-${a.role}`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '4px 9px',
                                borderRadius: 99,
                                fontSize: 11,
                                fontWeight: 800,
                                background: a.role === 'delivery'
                                  ? dark ? 'rgba(230,150,60,0.2)' : 'rgba(230,150,60,0.14)'
                                  : dark ? 'rgba(108,92,231,0.22)' : 'rgba(108,92,231,0.12)',
                                color: a.role === 'delivery' ? gold : indigo,
                                maxWidth: '100%',
                              }}
                            >
                              <span>{a.line.code}</span>
                              <span
                                style={{
                                  fontWeight: 600,
                                  opacity: 0.9,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  maxWidth: 120,
                                }}
                              >
                                {a.line.name}
                              </span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Liniyalar ro‘yxati + kun chiplari */}
            <div style={{ fontSize: 11, fontWeight: 800, color: c.mutedText, margin: '14px 0 8px', letterSpacing: '0.04em' }}>
              {tr.lineAssignedLines}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {assignments.map(a => (
                <div
                  key={`${a.line.id}-${a.role}`}
                  style={{
                    padding: '12px 12px',
                    borderRadius: 14,
                    border: `1px solid ${c.border}`,
                    background: dark ? 'rgba(255,255,255,0.02)' : '#fafafa',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 900,
                        color: a.role === 'delivery' ? gold : indigo,
                      }}
                    >
                      {a.line.code}
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 800,
                        color: c.text,
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {a.line.name}
                    </span>
                    {a.line.clientCount != null && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: c.mutedText }}>
                        {a.line.clientCount} TT
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {WEEK_DAYS.map(day => {
                      const on = a.days.includes(day)
                      return (
                        <span
                          key={day}
                          style={{
                            width: 34,
                            height: 28,
                            borderRadius: 8,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 11,
                            fontWeight: 800,
                            background: on
                              ? a.role === 'delivery' ? gold : indigo
                              : c.muted,
                            color: on ? '#fff' : c.mutedText,
                            opacity: on ? 1 : 0.7,
                          }}
                        >
                          {short[day]}
                        </span>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
