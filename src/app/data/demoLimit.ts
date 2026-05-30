/** Demo rejimida har bir ro'yxatdagi elementlar soni */
export const DEMO_LIMIT = 2;

export function demo<T>(items: readonly T[]): T[] {
  return items.slice(0, DEMO_LIMIT);
}

export function demoRec<T>(record: Record<string, T[]>): Record<string, T[]> {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [key, value.slice(0, DEMO_LIMIT)]),
  );
}

export function demoRecKeys<T>(record: Record<string, T>): Record<string, T> {
  return Object.fromEntries(
    Object.keys(record).slice(0, DEMO_LIMIT).map(key => [key, record[key]]),
  );
}
