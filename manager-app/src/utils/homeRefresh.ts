import type { AdminDashboard } from '../api/types'
import type { Translations } from '../i18n'
import { formatMoney } from '../theme'
import type { Lang } from '../i18n'

export type HomeRefreshSnapshot = {
  sales: number
  payments: number
  debt: number
  plan: number
  planPct: number
  onlineCount: number
  mapCount: number
  topAgentsSales: number
  staffCount: number
  clientCount: number
  productCount: number
}

export function snapshotFromDashboard(
  data: AdminDashboard,
  extras?: { staffCount?: number; clientCount?: number; productCount?: number },
): HomeRefreshSnapshot {
  const locs = data.employeeLocations ?? []
  return {
    sales: data.kpi?.sales ?? 0,
    payments: data.kpi?.payments ?? 0,
    debt: data.kpi?.debt ?? 0,
    plan: data.kpi?.plan ?? 0,
    planPct: data.kpi?.planPct ?? 0,
    onlineCount: locs.filter(e => e.online).length,
    mapCount: locs.filter(e => e.lat != null && e.lng != null).length,
    topAgentsSales: (data.topAgents ?? []).reduce((s, a) => s + (a.sales || 0), 0),
    staffCount: extras?.staffCount ?? 0,
    clientCount: extras?.clientCount ?? 0,
    productCount: extras?.productCount ?? 0,
  }
}

function moneyDelta(lang: Lang, label: string, before: number, after: number): string | null {
  const d = after - before
  if (Math.abs(d) < 0.5) return null
  const sign = d > 0 ? '+' : '−'
  return `${label}: ${sign}${formatMoney(Math.abs(d), lang)}`
}

/** Agent ilovasidagi refreshAndDetectChanges — manager uchun */
export function buildHomeRefreshUpdates(
  before: HomeRefreshSnapshot | null,
  after: HomeRefreshSnapshot,
  tr: Translations,
  lang: Lang,
): string[] {
  if (!before) return [tr.refreshFirstDone]

  const updates: string[] = []

  const salesLine = moneyDelta(lang, tr.sales, before.sales, after.sales)
  if (salesLine) updates.push(salesLine)

  const payLine = moneyDelta(lang, tr.payments, before.payments, after.payments)
  if (payLine) updates.push(payLine)

  const debtLine = moneyDelta(lang, tr.debt, before.debt, after.debt)
  if (debtLine) updates.push(debtLine)

  const planLine = moneyDelta(lang, tr.plan, before.plan, after.plan)
  if (planLine) updates.push(planLine)

  if (Math.abs(after.planPct - before.planPct) >= 0.5) {
    const d = after.planPct - before.planPct
    const sign = d > 0 ? '+' : '−'
    updates.push(`${tr.planPct}: ${sign}${Math.abs(d).toFixed(1)}%`)
  }

  if (after.onlineCount !== before.onlineCount) {
    const d = after.onlineCount - before.onlineCount
    updates.push(
      d > 0
        ? tr.refreshOnlineUp.replace('{n}', String(d))
        : tr.refreshOnlineDown.replace('{n}', String(Math.abs(d))),
    )
  }

  if (after.mapCount > before.mapCount) {
    updates.push(tr.refreshMapUp.replace('{n}', String(after.mapCount - before.mapCount)))
  }

  if (after.staffCount > before.staffCount) {
    updates.push(tr.refreshStaffUp.replace('{n}', String(after.staffCount - before.staffCount)))
  }

  if (after.clientCount > before.clientCount) {
    updates.push(tr.refreshClientsUp.replace('{n}', String(after.clientCount - before.clientCount)))
  }

  if (after.productCount > before.productCount) {
    updates.push(tr.refreshProductsUp.replace('{n}', String(after.productCount - before.productCount)))
  }

  if (after.topAgentsSales > before.topAgentsSales + 0.5) {
    updates.push(tr.refreshTopAgents)
  }

  if (updates.length === 0) updates.push(tr.refreshNoChanges)
  return updates
}
