export type PlanUnit = 'som' | 'kg' | 'ton' | 'dona';

export const PLAN_UNITS: { id: PlanUnit; label: string; labelCyr: string }[] = [
  { id: 'som', label: "so'm", labelCyr: 'сўм' },
  { id: 'kg', label: 'kg', labelCyr: 'кг' },
  { id: 'ton', label: 'tonna', labelCyr: 'тонна' },
  { id: 'dona', label: 'dona', labelCyr: 'дона' },
];

export function planUnitLabel(unit: PlanUnit | string | undefined | null, t?: Record<string, string>): string {
  const u = (unit || 'som') as PlanUnit;
  if (u === 'kg') return t?.planUnitKg || 'kg';
  if (u === 'ton') return t?.planUnitTon || 'tonna';
  if (u === 'dona') return t?.planUnitDona || 'dona';
  return t?.som || "so'm";
}

export function normalizePlanUnit(raw?: string | null): PlanUnit {
  const u = (raw || 'som').trim().toLowerCase();
  if (u === 'kg' || u === 'ton' || u === 'dona' || u === 'som') return u;
  return 'som';
}
