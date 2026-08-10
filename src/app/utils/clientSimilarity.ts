import type { BackendClient } from '../api/client';

export type SimilarityFieldKey =
  | 'name'
  | 'fullName'
  | 'phone'
  | 'inn'
  | 'territory';

export type SimilarityFieldScore = {
  key: SimilarityFieldKey;
  pct: number;
  weight: number;
};

export type SimilarityMatch = {
  client: BackendClient;
  overallPct: number;
  fields: SimilarityFieldScore[];
};

export type SimilarityCandidate = {
  name: string;
  fullName?: string;
  phone?: string;
  inn?: string;
  territory?: string;
};

const WEIGHTS: Record<SimilarityFieldKey, number> = {
  name: 30,
  fullName: 20,
  phone: 25,
  inn: 20,
  territory: 5,
};

export const SIMILARITY_DIALOG_THRESHOLD = 20;

export const SIMILARITY_FIELD_LABELS: Record<SimilarityFieldKey, string> = {
  name: 'Nomi',
  fullName: "To'liq nomi",
  phone: 'Telefon',
  inn: 'INN',
  territory: 'Hudud',
};

export function normalizeText(raw?: string | null): string {
  return (raw || '')
    .toLowerCase()
    .replace(/[ʼ'`´]/g, "'")
    .replace(/[^\p{L}\p{N}\s+]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function digitsOnly(raw?: string | null): string {
  return (raw || '').replace(/\D/g, '');
}

/** Mijoz kodi faqat raqam */
export function normalizeClientCode(raw?: string | number | null): string {
  if (raw == null) return '';
  const s = String(raw).trim();
  if (!s) return '';
  // Excel ba'zan 2001.0 beradi
  if (/^\d+(\.0+)?$/.test(s)) return s.replace(/\.0+$/, '');
  return digitsOnly(s);
}

export function isNumericClientCode(raw?: string | null): boolean {
  const c = normalizeClientCode(raw);
  return c.length > 0 && /^\d+$/.test(c);
}

function textFieldScore(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 100;
  if (a.includes(b) || b.includes(a)) return 50;
  const ta = new Set(a.split(' ').filter((t) => t.length >= 2));
  const tb = new Set(b.split(' ').filter((t) => t.length >= 2));
  if (ta.size === 0 || tb.size === 0) return 0;
  let overlap = 0;
  for (const t of ta) if (tb.has(t)) overlap += 1;
  const ratio = overlap / Math.max(ta.size, tb.size);
  if (ratio >= 0.6) return 50;
  return 0;
}

function scoreAgainst(input: SimilarityCandidate, existing: BackendClient): SimilarityMatch {
  const fields: SimilarityFieldScore[] = [];

  const add = (
    key: SimilarityFieldKey,
    inputVal: string | undefined,
    existingVal: string | undefined,
    scoreFn: (a: string, b: string) => number,
  ) => {
    const a = key === 'phone' || key === 'inn' ? digitsOnly(inputVal) : normalizeText(inputVal);
    const b = key === 'phone' || key === 'inn' ? digitsOnly(existingVal) : normalizeText(existingVal);
    if (!a || !b) return;
    fields.push({ key, pct: scoreFn(a, b), weight: WEIGHTS[key] });
  };

  add('name', input.name, existing.name ?? undefined, textFieldScore);
  add('fullName', input.fullName, existing.fullName ?? undefined, textFieldScore);
  add('phone', input.phone, existing.phone ?? undefined, (a, b) => (a && b && a === b ? 100 : 0));
  add('inn', input.inn, existing.inn ?? undefined, (a, b) => (a && b && a === b ? 100 : 0));
  add('territory', input.territory, existing.territory ?? undefined, textFieldScore);

  const totalWeight = fields.reduce((s, f) => s + f.weight, 0);
  if (totalWeight <= 0) {
    return { client: existing, overallPct: 0, fields: [] };
  }
  const weighted = fields.reduce((s, f) => s + (f.pct / 100) * f.weight, 0);
  const overallPct = Math.round((weighted / totalWeight) * 100);
  return { client: existing, overallPct, fields };
}

export function findBestSimilarityMatch(
  input: SimilarityCandidate,
  clients: BackendClient[],
  opts?: { excludeClientId?: string; threshold?: number },
): SimilarityMatch | null {
  const threshold = opts?.threshold ?? SIMILARITY_DIALOG_THRESHOLD;
  let best: SimilarityMatch | null = null;
  for (const cl of clients) {
    if (opts?.excludeClientId && cl.id === opts.excludeClientId) continue;
    const match = scoreAgainst(input, cl);
    if (!best || match.overallPct > best.overallPct) best = match;
  }
  if (!best || best.overallPct < threshold) return null;
  return best;
}

/** INN to‘liq mos — «Baribir qo‘shish» taqiqlanadi */
export function hasExactInnCollision(match: SimilarityMatch | null | undefined): boolean {
  if (!match) return false;
  return match.fields.some((f) => f.key === 'inn' && f.pct >= 100);
}

export type SimilarityRiskLevel = 'red' | 'yellow' | 'green';

export function similarityRisk(pct: number): SimilarityRiskLevel {
  if (pct >= 70) return 'red';
  if (pct >= 40) return 'yellow';
  return 'green';
}

export function similarityRiskColors(
  risk: SimilarityRiskLevel,
  dark: boolean,
): { color: string; bg: string; border: string } {
  if (risk === 'red') {
    return dark
      ? { color: '#FCA5A5', bg: 'rgba(239,68,68,0.18)', border: 'rgba(239,68,68,0.45)' }
      : { color: '#DC2626', bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.35)' };
  }
  if (risk === 'yellow') {
    return dark
      ? { color: '#FCD34D', bg: 'rgba(245,158,11,0.18)', border: 'rgba(245,158,11,0.45)' }
      : { color: '#D97706', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)' };
  }
  return dark
    ? { color: '#6EE7B7', bg: 'rgba(16,185,129,0.18)', border: 'rgba(16,185,129,0.45)' }
    : { color: '#059669', bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.30)' };
}

/** Excel "02 - Нурата" → { code: "02", name: "Нурата" } */
export function parseLineLabel(raw: string): { code: string; name: string } {
  const s = (raw || '').trim();
  if (!s) return { code: '', name: '' };
  const m = /^(\d+)\s*[-–—.:]\s*(.+)$/.exec(s);
  if (m) return { code: m[1], name: m[2].trim() };
  if (/^\d+$/.test(s)) return { code: s, name: s };
  return { code: '', name: s };
}

export function parseGpsCell(raw: string): { lat: number | null; lng: number | null } {
  const s = (raw || '').trim().replace(/\s+/g, '');
  if (!s) return { lat: null, lng: null };
  const parts = s.split(/[,;]/);
  if (parts.length < 2) return { lat: null, lng: null };
  const lat = Number(parts[0].replace(',', '.'));
  const lng = Number(parts[1].replace(',', '.'));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { lat: null, lng: null };
  return { lat, lng };
}

export function parseActiveStatus(raw: string): boolean {
  const s = (raw || '').trim().toLowerCase();
  if (!s) return true;
  if (/неактив|nofaol|inactive|отключ|o'ch|ochiril/.test(s)) return false;
  if (/актив|faol|active/.test(s)) return true;
  return true;
}
