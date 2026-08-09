import type { Client } from '../api/types'

export type SimilarityFieldKey =
  | 'name'
  | 'fullName'
  | 'phone'
  | 'inn'
  | 'address'
  | 'territory'
  | 'lineCode'

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
  address?: string
  territory?: string
  lineCode?: string
}

const WEIGHTS: Record<SimilarityFieldKey, number> = {
  name: 25,
  fullName: 15,
  phone: 20,
  inn: 20,
  address: 10,
  territory: 5,
  lineCode: 5,
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

function addressScore(a: string, b: string): number {
  if (!a || !b) return 0
  if (a === b) return 100
  if (a.includes(b) || b.includes(a)) return 50
  const ta = a.split(' ').filter(t => t.length >= 2)
  const tb = new Set(b.split(' ').filter(t => t.length >= 2))
  if (ta.length === 0 || tb.size === 0) return 0
  let overlap = 0
  for (const t of ta) if (tb.has(t)) overlap += 1
  const ratio = overlap / Math.max(ta.length, tb.size)
  if (ratio >= 0.8) return 100
  if (ratio >= 0.4) return 50
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
  add('address', input.address, existing.address ?? undefined, addressScore)
  add('territory', input.territory, existing.territory ?? undefined, textFieldScore)
  add('lineCode', input.lineCode, existing.lineCode ?? undefined, (a, b) => (a && b && a === b ? 100 : 0))

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
