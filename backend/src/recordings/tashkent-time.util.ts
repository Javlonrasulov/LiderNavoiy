/** Asia/Tashkent (+05:00) kun chegaralari */

const TZ_OFFSET_MS = 5 * 60 * 60 * 1000;

export function tashkentDayBounds(day: 'today' | 'yesterday', now = new Date()): {
  from: Date;
  to: Date;
  dayKey: string;
} {
  const local = new Date(now.getTime() + TZ_OFFSET_MS);
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth();
  const d = local.getUTCDate();
  const startLocalUtc = Date.UTC(y, m, d) - TZ_OFFSET_MS;
  const dayStart =
    day === 'today' ? startLocalUtc : startLocalUtc - 24 * 60 * 60 * 1000;
  const dayEnd = dayStart + 24 * 60 * 60 * 1000 - 1;
  const keyDate = new Date(dayStart + TZ_OFFSET_MS);
  const dayKey = keyDate.toISOString().slice(0, 10);
  return { from: new Date(dayStart), to: new Date(dayEnd), dayKey };
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function recordingExpiresAt(startedAt: Date): Date {
  return addDays(startedAt, 7);
}

export function isWithinAgentRecordingWindow(startedAt: Date, now = new Date()): boolean {
  const today = tashkentDayBounds('today', now);
  const yesterday = tashkentDayBounds('yesterday', now);
  const t = startedAt.getTime();
  return (
    (t >= today.from.getTime() && t <= today.to.getTime()) ||
    (t >= yesterday.from.getTime() && t <= yesterday.to.getTime())
  );
}
