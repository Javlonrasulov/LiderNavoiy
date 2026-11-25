import { getTashkentDateParts } from './tashkent-time';

/** Qarz yoshi: Toshkent kalendar kunlari (qarz sanasi → bugun). */
export function debtAgeDays(debtAt: Date | string | null | undefined, now = new Date()): number {
  if (!debtAt) return 0;
  const d = typeof debtAt === 'string' ? new Date(debtAt) : debtAt;
  if (Number.isNaN(d.getTime())) return 0;
  const start = getTashkentDateParts(d);
  const end = getTashkentDateParts(now);
  const a = Date.UTC(start.year, start.month - 1, start.day);
  const b = Date.UTC(end.year, end.month - 1, end.day);
  return Math.max(0, Math.floor((b - a) / 86_400_000));
}

/**
 * Xavf: qoldiq > 0 va yosh > 30 (31-kundan).
 * 30-kunlik qarz ogohlantirishni yoqmaydi.
 */
export const DEBT_OVERDUE_AFTER_DAYS = 30;

export function isDebtOverdue(remaining: number, ageDays: number): boolean {
  return remaining > 0 && ageDays > DEBT_OVERDUE_AFTER_DAYS;
}

export function orderRemaining(
  totalAmount: number | string | null | undefined,
  paidAmount: number | string | null | undefined,
  returnedAmount: number | string | null | undefined,
): number {
  const total = Number(totalAmount) || 0;
  const paid = Number(paidAmount) || 0;
  const returned = Number(returnedAmount) || 0;
  return Math.max(0, total - returned - paid);
}

export function orderDebtDate(
  deliveredAt: Date | string | null | undefined,
  createdAt: Date | string | null | undefined,
): Date | null {
  const raw = deliveredAt ?? createdAt;
  if (!raw) return null;
  const d = typeof raw === 'string' ? new Date(raw) : raw;
  return Number.isNaN(d.getTime()) ? null : d;
}
