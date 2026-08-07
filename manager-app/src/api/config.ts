/** Production API — same as agent/client apps */
export const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/?$/, '/') ||
  'https://lider-navoiy.uz/api/v1/'

/** Socket.IO origin (namespace `/tracking` ulanadi) */
export function resolveWsBase(): string {
  const explicit = import.meta.env.VITE_WS_URL as string | undefined
  if (explicit) {
    return String(explicit)
      .replace(/\/$/, '')
      .replace(/\/tracking$/, '')
  }
  const fromApi = API_BASE_URL.replace(/\/api\/v\d+\/?$/, '').replace(/\/$/, '')
  if (fromApi.startsWith('http://') || fromApi.startsWith('https://')) return fromApi
  if (typeof window !== 'undefined') return window.location.origin
  return 'https://lider-navoiy.uz'
}

export const WS_BASE_URL = resolveWsBase()
