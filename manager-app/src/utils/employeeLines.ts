import type { SalesLine } from '../api/manager'
import type { Distributor, EmployeeLocation } from '../api/types'
import type { Lang } from '../i18n'

export type LineRole = 'agent' | 'delivery'

export type EmployeeLineAssignment = {
  line: SalesLine
  role: LineRole
  days: number[]
}

/** 1=Du … 7=Yak */
export const WEEK_DAYS = [1, 2, 3, 4, 5, 6, 7] as const

function norm(s: string | null | undefined): string {
  return (s || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

export function isDeliveryRole(d: Distributor, loc?: EmployeeLocation): boolean {
  if (loc?.role === 'delivery') return true
  if (loc?.role === 'agent') return false
  const p = (d.position || '').toLowerCase()
  return (
    p.includes('dostav') ||
    p.includes('delivery') ||
    p.includes('yetkaz') ||
    p.includes('курьер') ||
    p.includes('kuryer') ||
    p.includes('haydov')
  )
}

export function distributorDisplayName(d: Distributor): string {
  return d.user?.fullName || d.fullName || d.name || ''
}

export function resolveEmployeeLines(
  lines: SalesLine[],
  distributor: Distributor,
  loc?: EmployeeLocation,
): EmployeeLineAssignment[] {
  const name = norm(distributorDisplayName(distributor))
  const code = (distributor.lineCode || '').trim()
  const asDelivery = isDeliveryRole(distributor, loc)
  const out: EmployeeLineAssignment[] = []

  for (const line of lines) {
    const agentMatch = name && norm(line.agentName) === name
    const deliveryMatch = name && norm(line.deliveryName) === name
    const codeMatch = !!code && line.code === code

    if (asDelivery) {
      if (deliveryMatch) {
        const days = Array.isArray(line.deliveryVisitDays) ? line.deliveryVisitDays : []
        out.push({ line, role: 'delivery', days: [...days].sort((a, b) => a - b) })
        continue
      }
      // Faqat kod bo‘yicha: delivery uchun ham ko‘rsatamiz
      if (codeMatch && !agentMatch) {
        const days = Array.isArray(line.deliveryVisitDays) && line.deliveryVisitDays.length
          ? line.deliveryVisitDays
          : Array.isArray(line.agentVisitDays) && line.agentVisitDays.length
            ? line.agentVisitDays
            : Array.isArray(line.visitDays) ? line.visitDays : []
        out.push({ line, role: 'delivery', days: [...days].sort((a, b) => a - b) })
      }
      continue
    }

    if (agentMatch || codeMatch) {
      const days = Array.isArray(line.agentVisitDays) && line.agentVisitDays.length
        ? line.agentVisitDays
        : Array.isArray(line.visitDays) ? line.visitDays : []
      out.push({ line, role: 'agent', days: [...days].sort((a, b) => a - b) })
    }
  }

  // Unique by line id
  const seen = new Set<string>()
  return out.filter(a => {
    if (seen.has(a.line.id)) return false
    seen.add(a.line.id)
    return true
  })
}

/** Kun → shu kungi liniyalar */
export function linesByWeekday(
  assignments: EmployeeLineAssignment[],
): Record<number, EmployeeLineAssignment[]> {
  const map: Record<number, EmployeeLineAssignment[]> = {
    1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [],
  }
  for (const a of assignments) {
    for (const d of a.days) {
      if (d >= 1 && d <= 7) map[d].push(a)
    }
  }
  return map
}

/** JS getDay(): 0=Sun → bizning 7; 1=Mon → 1 */
export function jsDayToLineDay(jsDay: number): number {
  return jsDay === 0 ? 7 : jsDay
}

export function todayLineDay(dateStr?: string): number {
  const d = dateStr ? new Date(dateStr + 'T12:00:00') : new Date()
  return jsDayToLineDay(d.getDay())
}

export function weekdayLabels(lang: Lang): Record<number, string> {
  if (lang === 'ru') {
    return { 1: 'Пн', 2: 'Вт', 3: 'Ср', 4: 'Чт', 5: 'Пт', 6: 'Сб', 7: 'Вс' }
  }
  if (lang === 'uzc') {
    return { 1: 'Ду', 2: 'Се', 3: 'Чо', 4: 'Па', 5: 'Жу', 6: 'Ша', 7: 'Як' }
  }
  return { 1: 'Du', 2: 'Se', 3: 'Ch', 4: 'Pa', 5: 'Ju', 6: 'Sh', 7: 'Ya' }
}

export function weekdayFullLabels(lang: Lang): Record<number, string> {
  if (lang === 'ru') {
    return {
      1: 'Понедельник', 2: 'Вторник', 3: 'Среда', 4: 'Четверг',
      5: 'Пятница', 6: 'Суббота', 7: 'Воскресенье',
    }
  }
  if (lang === 'uzc') {
    return {
      1: 'Душанба', 2: 'Сешанба', 3: 'Чоршанба', 4: 'Пайшанба',
      5: 'Жума', 6: 'Шанба', 7: 'Якшанба',
    }
  }
  return {
    1: 'Dushanba', 2: 'Seshanba', 3: 'Chorshanba', 4: 'Payshanba',
    5: 'Juma', 6: 'Shanba', 7: 'Yakshanba',
  }
}
