import { Capacitor, CapacitorHttp } from '@capacitor/core'
import { API_BASE_URL } from './config'
import { resolveLoginDevice } from '../utils/deviceInfo'
import type { AuthResponse } from './types'

const TOKEN_KEY = 'lm-access'
const REFRESH_KEY = 'lm-refresh'
const USER_KEY = 'lm-user'

/** Parallel 401: bitta refresh — qolganlari shu Promise ni kutadi */
let refreshInFlight: Promise<RefreshResult> | null = null
let unauthorizedEmitted = false

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function getStoredUser(): AuthResponse['user'] | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveSession(res: AuthResponse) {
  unauthorizedEmitted = false
  localStorage.setItem(TOKEN_KEY, res.accessToken)
  localStorage.setItem(REFRESH_KEY, res.refreshToken)
  localStorage.setItem(USER_KEY, JSON.stringify(res.user))
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_KEY)
  localStorage.removeItem(USER_KEY)
}

export class ApiError extends Error {
  status: number
  code?: string
  constructor(status: number, message: string, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

export function isSessionExpiredError(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 401 || err.code === 'SESSION_EXPIRED')
}

export function resetSessionExpiredGuard(): void {
  unauthorizedEmitted = false
}

/** Foydalanuvchi o‘zi chiqmoqda — "sessiya tugadi" oynasi chiqmasin */
export function markIntentionalLogout(): void {
  unauthorizedEmitted = true
}

function emitSessionExpired(): void {
  if (unauthorizedEmitted) return
  unauthorizedEmitted = true
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('lider:manager-session-expired'))
  }
}

type HttpResult = {
  status: number
  data: unknown
}

function headersToRecord(h: Headers): Record<string, string> {
  const out: Record<string, string> = {}
  h.forEach((v, k) => {
    out[k] = v
  })
  return out
}

async function rawRequest(
  url: string,
  method: string,
  headers: Headers,
  body?: string,
): Promise<HttpResult> {
  if (Capacitor.isNativePlatform()) {
    const res = await CapacitorHttp.request({
      url,
      method,
      headers: headersToRecord(headers),
      data: body ? JSON.parse(body) : undefined,
      connectTimeout: 25_000,
      readTimeout: 25_000,
    })
    return { status: res.status, data: res.data }
  }

  const res = await fetch(url, { method, headers, body })
  let data: unknown = null
  const text = await res.text()
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }
  return { status: res.status, data }
}

function errorMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== 'object') return fallback
  const j = data as {
    message?: string | string[]
    error?: string
    code?: string
    activeDevice?: string | null
  }
  const code = typeof j.code === 'string' ? j.code : null
  const msg = Array.isArray(j.message)
    ? j.message.join(', ')
    : typeof j.message === 'string'
      ? j.message
      : typeof j.error === 'string'
        ? j.error
        : null
  if (code === 'SESSION_ACTIVE' || msg === 'SESSION_ACTIVE') {
    const device = typeof j.activeDevice === 'string' ? j.activeDevice.trim() : ''
    return device ? `SESSION_ACTIVE:${device}` : 'SESSION_ACTIVE'
  }
  if (msg) return msg
  return fallback
}

/**
 * token — yangi access token; rejected = server sessiyani rad etdi (qayta login),
 * rejected=false esa vaqtinchalik xato (internet yo‘q, server 5xx) — sessiya saqlanadi.
 */
type RefreshResult = { token: string | null; rejected: boolean }

async function doRefreshOnce(): Promise<RefreshResult> {
  const refresh = localStorage.getItem(REFRESH_KEY)
  if (!refresh) return { token: null, rejected: true }
  try {
    const h = new Headers({ 'Content-Type': 'application/json' })
    const device = await resolveLoginDevice().catch(() => undefined)
    const r = await rawRequest(
      `${API_BASE_URL}auth/refresh`,
      'POST',
      h,
      JSON.stringify({ refreshToken: refresh, device }),
    )
    if (r.status === 401 || r.status === 403) return { token: null, rejected: true }
    if (r.status < 200 || r.status >= 300) return { token: null, rejected: false }
    const data = r.data as AuthResponse
    if (!data?.accessToken || !data?.refreshToken) return { token: null, rejected: false }
    saveSession(data)
    return { token: data.accessToken, rejected: false }
  } catch {
    // Tarmoq uzilishi — foydalanuvchini tizimdan chiqarmaymiz
    return { token: null, rejected: false }
  }
}

/** Bitta parallel refresh — rotation conflict yo‘q */
async function refreshTokens(): Promise<RefreshResult> {
  if (refreshInFlight) return refreshInFlight
  refreshInFlight = doRefreshOnce().finally(() => {
    refreshInFlight = null
  })
  return refreshInFlight
}

/** Access token muddati (sekundlarda) — o‘qib bo‘lmasa null */
function accessTokenExpiry(token: string): number | null {
  try {
    const part = token.split('.')[1]
    if (!part) return null
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'))
    const payload = JSON.parse(json) as { exp?: number }
    return typeof payload.exp === 'number' ? payload.exp : null
  } catch {
    return null
  }
}

/**
 * Ilova ochilganda saqlangan sessiya haqiqiyligini jimgina tekshiradi.
 * Yaroqsiz bo‘lsa — hech qanday ogohlantirishsiz login ekraniga qaytariladi.
 */
export async function validateStoredSession(): Promise<boolean> {
  if (!hasStoredSession()) return false
  const prev = unauthorizedEmitted
  unauthorizedEmitted = true
  try {
    await api('notifications/unread-count')
    unauthorizedEmitted = prev
    return true
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      clearSession()
      return false
    }
    // Tarmoq/server xatosi — sessiyani o‘chirmaymiz
    unauthorizedEmitted = prev
    return true
  }
}

/** WebSocket ulanishlari uchun: har safar yangi access token */
export async function getFreshAccessToken(): Promise<string | null> {
  return ensureFreshAccessToken()
}

/** Muddati tugashiga oz qolgan tokenni oldindan yangilaymiz — 401 kutmaymiz */
async function ensureFreshAccessToken(): Promise<string | null> {
  const token = getAccessToken()
  if (!token) return null
  const exp = accessTokenExpiry(token)
  if (exp === null) return token
  const secondsLeft = exp - Math.floor(Date.now() / 1000)
  if (secondsLeft > 120) return token
  const res = await refreshTokens()
  return res.token ?? token
}

/** Saqlangan sessiya bormi — login qilinmagan holatda "sessiya tugadi" chiqmasin */
function hasStoredSession(): boolean {
  return !!localStorage.getItem(TOKEN_KEY) || !!localStorage.getItem(REFRESH_KEY)
}

function forceSessionExpired(hadSession: boolean): never {
  clearSession()
  // Login qilinmagan bo‘lsa bu oddiy 401 — foydalanuvchiga ogohlantirish kerak emas
  if (hadSession) emitSessionExpired()
  throw new ApiError(401, 'Unauthorized', hadSession ? 'SESSION_EXPIRED' : undefined)
}

export async function api<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const { auth = true, headers, body, method = 'GET' } = options
  const h = new Headers(headers)
  if (!h.has('Content-Type') && body) h.set('Content-Type', 'application/json')
  const hadSession = auth && hasStoredSession()
  if (auth) {
    const token = await ensureFreshAccessToken()
    if (token) h.set('Authorization', `Bearer ${token}`)
  }

  const url = `${API_BASE_URL}${path.replace(/^\//, '')}`
  const bodyStr = typeof body === 'string' ? body : body != null ? JSON.stringify(body) : undefined

  let res = await rawRequest(url, String(method).toUpperCase(), h, bodyStr)

  if (res.status === 401 && auth) {
    const next = await refreshTokens()
    if (next.token) {
      h.set('Authorization', `Bearer ${next.token}`)
      res = await rawRequest(url, String(method).toUpperCase(), h, bodyStr)
    } else if (next.rejected) {
      // Server/Redis vaqtinchalik nosozligi bo‘lishi mumkin — bir marta qayta urinamiz
      await new Promise(r => setTimeout(r, 1500))
      const retry = await refreshTokens()
      if (retry.token) {
        h.set('Authorization', `Bearer ${retry.token}`)
        res = await rawRequest(url, String(method).toUpperCase(), h, bodyStr)
      } else if (retry.rejected) {
        forceSessionExpired(hadSession)
      } else {
        throw new ApiError(0, 'network_error')
      }
    } else {
      throw new ApiError(0, 'network_error')
    }
  }

  if (res.status === 401 && auth) {
    forceSessionExpired(hadSession)
  }

  if (res.status < 200 || res.status >= 300) {
    throw new ApiError(res.status, errorMessage(res.data, `HTTP ${res.status}`))
  }

  if (res.status === 204) return undefined as T
  return res.data as T
}
