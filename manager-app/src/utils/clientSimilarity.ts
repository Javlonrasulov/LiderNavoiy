import type { Client } from '../api/types'

export type SimilarityFieldKey =
  | 'name'
  | 'fullName'
  | 'phone'
  | 'inn'
  | 'territory'

export type SimilarityFieldScore = {
  key: SimilarityFieldKey
  /** 0–100 for this field alone */
  pct: number
  weight: number
}

export type SimilarityMatch = {
  client: Client
  /** Overall 0–100 */
  overallPct: number
  fields: SimilarityFieldScore[]
}

export type SimilarityCandidate = {
  name: string
  fullName?: string
  phone?: string
  inn?: string
  territory?: string
}

const WEIGHTS: Record<SimilarityFieldKey, number> = {
  name: 30,
  fullName: 20,
  phone: 25,
  inn: 20,
  territory: 5,
}

/** Dialog ochilishi uchun minimal umumiy foiz */
export const SIMILARITY_DIALOG_THRESHOLD = 20

export function normalizeText(raw?: string | null): string {
  return (raw || '')
    .toLowerCase()
    .replace(/[ʼ'`´]/g, "'")
    .replace(/[^\p{L}\p{N}\s+]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function digitsOnly(raw?: string | null): string {
  return (raw || '').replace(/\D/g, '')
}

function textFieldScore(a: string, b: string): number {
  if (!a || !b) return 0
  if (a === b) return 100
  if (a.includes(b) || b.includes(a)) return 50
  const ta = new Set(a.split(' ').filter(t => t.length >= 2))
  const tb = new Set(b.split(' ').filter(t => t.length >= 2))
  if (ta.size === 0 || tb.size === 0) return 0
  let overlap = 0
  for (const t of ta) if (tb.has(t)) overlap += 1
  const ratio = overlap / Math.max(ta.size, tb.size)
  if (ratio >= 0.6) return 50
  return 0
}

function scoreAgainst(input: SimilarityCandidate, existing: Client): SimilarityMatch {
  const fields: SimilarityFieldScore[] = []

  const add = (key: SimilarityFieldKey, inputVal: string | undefined, existingVal: string | undefined, scoreFn: (a: string, b: string) => number) => {
    const a = key === 'phone' || key === 'inn' ? digitsOnly(inputVal) : normalizeText(inputVal)
    const b = key === 'phone' || key === 'inn' ? digitsOnly(existingVal) : normalizeText(existingVal)
    if (!a || !b) return
    fields.push({ key, pct: scoreFn(a, b), weight: WEIGHTS[key] })
  }

  add('name', input.name, existing.name ?? undefined, textFieldScore)
  add('fullName', input.fullName, existing.fullName ?? undefined, textFieldScore)
  add('phone', input.phone, existing.phone ?? undefined, (a, b) => (a && b && a === b ? 100 : 0))
  add('inn', input.inn, existing.inn ?? undefined, (a, b) => (a && b && a === b ? 100 : 0))
  add('territory', input.territory, existing.territory ?? undefined, textFieldScore)

  const totalWeight = fields.reduce((s, f) => s + f.weight, 0)
  if (totalWeight <= 0) {
    return { client: existing, overallPct: 0, fields: [] }
  }
  const weighted = fields.reduce((s, f) => s + (f.pct / 100) * f.weight, 0)
  const overallPct = Math.round((weighted / totalWeight) * 100)
  return { client: existing, overallPct, fields }
}

/** Eng o‘xshash mijoz; agar threshold dan past bo‘lsa null */
export function findBestSimilarityMatch(
  input: SimilarityCandidate,
  clients: Client[],
  opts?: { excludeClientId?: string; threshold?: number },
): SimilarityMatch | null {
  const threshold = opts?.threshold ?? SIMILARITY_DIALOG_THRESHOLD
  let best: SimilarityMatch | null = null
  for (const cl of clients) {
    if (opts?.excludeClientId && cl.id === opts.excludeClientId) continue
    const match = scoreAgainst(input, cl)
    if (!best || match.overallPct > best.overallPct) best = match
  }
  if (!best || best.overallPct < threshold) return null
  return best
}

/** INN to‘liq mos — «Baribir qo‘shish» taqiqlanadi */
export function hasExactInnCollision(match: SimilarityMatch | null | undefined): boolean {
  if (!match) return false
  return match.fields.some((f) => f.key === 'inn' && f.pct >= 100)
}

export type ClientListSimilarity = {
  pct: number
  matchName: string
  matchId: string
}

/**
 * Ro‘yxatdagi har bir mijoz uchun eng o‘xshash boshqa mijoz.
 * Threshold dan past o‘xshashliklar map ga kiritilmaydi.
 */
export function buildClientSimilarityMap(
  clients: Client[],
  threshold = SIMILARITY_DIALOG_THRESHOLD,
): Map<string, ClientListSimilarity> {
  const out = new Map<string, ClientListSimilarity>()
  for (const cl of clients) {
    const input: SimilarityCandidate = {
      name: cl.name ?? '',
      fullName: cl.fullName ?? undefined,
      phone: cl.phone ?? undefined,
      inn: cl.inn ?? undefined,
      territory: cl.territory ?? undefined,
    }
    const match = findBestSimilarityMatch(input, clients, {
      excludeClientId: cl.id,
      threshold,
    })
    if (!match) continue
    out.set(cl.id, {
      pct: match.overallPct,
      matchName: match.client.name || match.client.fullName || '—',
      matchId: match.client.id,
    })
  }
  return out
}

export type SimilarityRiskLevel = 'red' | 'yellow' | 'green'

/** Umumiy o‘xshashlik foiziga qarab xavf darajasi */
export function similarityRisk(pct: number): SimilarityRiskLevel {
  if (pct >= 70) return 'red'
  if (pct >= 40) return 'yellow'
  return 'green'
}

export function similarityRiskColors(
  risk: SimilarityRiskLevel,
  dark: boolean,
): { color: string; bg: string; border: string } {
  if (risk === 'red') {
    return dark
      ? { color: '#FCA5A5', bg: 'rgba(239,68,68,0.18)', border: 'rgba(239,68,68,0.45)' }
      : { color: '#DC2626', bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.35)' }
  }
  if (risk === 'yellow') {
    return dark
      ? { color: '#FCD34D', bg: 'rgba(245,158,11,0.18)', border: 'rgba(245,158,11,0.45)' }
      : { color: '#D97706', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)' }
  }
  return dark
    ? { color: '#6EE7B7', bg: 'rgba(16,185,129,0.18)', border: 'rgba(16,185,129,0.45)' }
    : { color: '#059669', bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.30)' }
}
