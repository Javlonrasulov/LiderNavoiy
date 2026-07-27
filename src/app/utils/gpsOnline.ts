/** GPS "jonli" deb hisoblanadigan maksimal yosh (backend Redis TTL bilan bir xil — 3 daqiqa). */
export const GPS_ONLINE_MAX_AGE_MS = 180_000;

/** Sticky DB isOnline emas — faqat oxirgi GPS yangiligi. */
export function isGpsLiveOnline(
  lastLocationAt: string | Date | null | undefined,
  maxAgeMs = GPS_ONLINE_MAX_AGE_MS,
): boolean {
  if (!lastLocationAt) return false;
  const t = lastLocationAt instanceof Date ? lastLocationAt.getTime() : new Date(lastLocationAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= maxAgeMs;
}
