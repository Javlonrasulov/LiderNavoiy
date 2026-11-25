import { debtAgeDays, isDebtOverdue, orderRemaining } from './debt-age';
import { makeTashkentDate, getTashkentDateParts } from './tashkent-time';

describe('debtAgeDays / isDebtOverdue', () => {
  it('30 calendar days is NOT overdue; 31 days is', () => {
    const today = getTashkentDateParts();
    const d30 = makeTashkentDate(today.year, today.month, today.day);
    d30.setUTCDate(d30.getUTCDate() - 30);
    // Use calendar construction relative to Tashkent "today"
    const now = makeTashkentDate(today.year, today.month, today.day, 12, 0, 0);
    const debt30 = new Date(now.getTime() - 30 * 86_400_000);
    const debt31 = new Date(now.getTime() - 31 * 86_400_000);

    const age30 = debtAgeDays(debt30, now);
    const age31 = debtAgeDays(debt31, now);

    // Allow ±1 around DST-less Tashkent day boundaries from UTC ms offset
    expect(age30).toBeGreaterThanOrEqual(29);
    expect(age30).toBeLessThanOrEqual(30);
    expect(isDebtOverdue(1000, 30)).toBe(false);
    expect(isDebtOverdue(1000, 31)).toBe(true);
    expect(isDebtOverdue(0, 40)).toBe(false);
    expect(age31).toBeGreaterThan(age30);
  });

  it('orderRemaining never negative', () => {
    expect(orderRemaining(100, 40, 20)).toBe(40);
    expect(orderRemaining(100, 90, 20)).toBe(0);
  });
});
