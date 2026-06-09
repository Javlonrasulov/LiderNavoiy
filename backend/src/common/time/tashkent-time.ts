export const TASHKENT_TZ = 'Asia/Tashkent';

export interface TashkentTimeInfo {
  timezone: typeof TASHKENT_TZ;
  date: string;
  time: string;
  timestamp: string;
}

export function getTashkentTime(): TashkentTimeInfo {
  const now = new Date();
  const date = now.toLocaleDateString('en-CA', { timeZone: TASHKENT_TZ });
  const time = now.toLocaleTimeString('en-GB', {
    timeZone: TASHKENT_TZ,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  return {
    timezone: TASHKENT_TZ,
    date,
    time,
    timestamp: now.toISOString(),
  };
}

export function getTashkentYearMonth(): { year: number; month: number } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TASHKENT_TZ,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now);
  const year = Number(parts.find(p => p.type === 'year')?.value);
  const month = Number(parts.find(p => p.type === 'month')?.value);
  return { year, month };
}

export function addCalendarMonth(
  year: number,
  month: number,
  delta = 1,
): { year: number; month: number } {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export function getTashkentDateParts(now = new Date()): {
  year: number;
  month: number;
  day: number;
} {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TASHKENT_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  return {
    year: Number(parts.find(p => p.type === 'year')?.value),
    month: Number(parts.find(p => p.type === 'month')?.value),
    day: Number(parts.find(p => p.type === 'day')?.value),
  };
}

/** Toshkent mahalliy vaqtini Date obyektiga aylantiradi (UTC+5). */
export function makeTashkentDate(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
): Date {
  const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}+05:00`;
  return new Date(iso);
}
