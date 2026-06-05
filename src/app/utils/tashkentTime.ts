import { api, type TashkentTimeInfo } from '../api/client';

const CACHE_MS = 60_000;
let cache: { data: TashkentTimeInfo; expires: number } | null = null;

/** Fallback: Toshkent vaqt zonasi (kompyuter soati emas, faqat zona). */
export function tashkentDateFallback(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' });
}

export async function fetchTashkentDate(): Promise<string> {
  const now = Date.now();
  if (cache && now < cache.expires) {
    return cache.data.date;
  }
  try {
    const data = await api.getTashkentTime();
    cache = { data, expires: now + CACHE_MS };
    return data.date;
  } catch {
    return tashkentDateFallback();
  }
}

export function parseYmd(d: string): Date {
  const [y, m, dd] = d.split('-').map(Number);
  return new Date(y, m - 1, dd);
}
