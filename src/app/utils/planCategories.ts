import { api } from '../api/client';

export type PlanCat = { key: string; name: string; color: string };

export const DEFAULT_PLAN_CATS: PlanCat[] = [
  { key: 'SHERIN', name: 'Sherin', color: '#10b981' },
  { key: 'TIM', name: 'TIM', color: '#f59e0b' },
  { key: 'SIR', name: 'Sir', color: '#3b82f6' },
];

const FALLBACK_COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#6366f1', '#ef4444', '#8b5cf6'];

function toKey(name: string): string {
  return name.trim().toUpperCase().replace(/\s+/g, '_');
}

export { toKey };

export async function fetchPlanCategories(): Promise<PlanCat[]> {
  if (typeof localStorage !== 'undefined' && !localStorage.getItem('api_access_token')) {
    return DEFAULT_PLAN_CATS;
  }

  try {
    const meta = await api.getProductCategoryMeta();
    if (meta.length > 0) {
      return meta.map(m => ({
        key: toKey(m.name),
        name: m.name,
        color: m.color || '#6366f1',
      }));
    }
  } catch {
    /* try product categories next */
  }

  try {
    const rows = await api.getProductCategories();
    if (rows.length > 0) {
      return rows.map((r, i) => ({
        key: toKey(r.category),
        name: r.category,
        color: FALLBACK_COLORS[i % FALLBACK_COLORS.length],
      }));
    }
  } catch {
    /* fallback below */
  }

  return DEFAULT_PLAN_CATS;
}

export function emptyCatAmounts(cats: PlanCat[]): Record<string, string> {
  return Object.fromEntries(cats.map(c => [c.key, '']));
}

export function sumCatAmounts(cats: PlanCat[], amounts: Record<string, string>): number {
  return cats.reduce((s, c) => {
    const cleaned = (amounts[c.key] || '').replace(/\s/g, '').replace(/,/g, '.').replace(/[^0-9.]/g, '');
    const n = parseFloat(cleaned);
    return s + (Number.isFinite(n) ? n : 0);
  }, 0);
}
