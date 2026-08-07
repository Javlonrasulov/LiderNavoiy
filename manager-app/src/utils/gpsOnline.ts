/** GPS "jonli" — backend Redis TTL bilan 5 daqiqa */
export const GPS_ONLINE_MAX_AGE_MS = 300_000

/** O‘zbekiston (+ chegara) — okean / Null Island / emulator GPS ni rad etish */
export function isInServiceArea(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    !(Math.abs(lat) < 0.05 && Math.abs(lng) < 0.05) &&
    lat >= 37.0 &&
    lat <= 45.8 &&
    lng >= 55.0 &&
    lng <= 73.5
  )
}
