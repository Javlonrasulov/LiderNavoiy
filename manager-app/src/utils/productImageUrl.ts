import { API_BASE_URL } from '../api/config'

function apiOrigin(): string {
  const fromApi = API_BASE_URL.replace(/\/api\/v\d+\/?$/, '').replace(/\/$/, '')
  if (fromApi.startsWith('http://') || fromApi.startsWith('https://')) return fromApi
  if (typeof window !== 'undefined') return window.location.origin
  return 'https://lider-navoiy.uz'
}

/** DB dagi relative path (/uploads/...) ni to‘liq URL ga aylantiradi */
export function resolveProductImageUrl(url: string | null | undefined): string | null {
  if (!url) return null
  if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  const path = url.startsWith('/') ? url : `/${url}`
  return `${apiOrigin()}${path}`
}
