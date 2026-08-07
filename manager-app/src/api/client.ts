import { Capacitor, CapacitorHttp } from '@capacitor/core'
import { API_BASE_URL } from './config'
import type { AuthResponse } from './types'

const TOKEN_KEY = 'lm-access'
const REFRESH_KEY = 'lm-refresh'
const USER_KEY = 'lm-user'

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
  constructor(status: number, message: string) {
    super(message)
    this.status = status
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
  const j = data as { message?: string | string[]; error?: string }
  if (Array.isArray(j.message)) return j.message.join(', ')
  if (typeof j.message === 'string') return j.message
  if (typeof j.error === 'string') return j.error
  return fallback
}

async function refreshTokens(): Promise<string | null> {
  const refresh = localStorage.getItem(REFRESH_KEY)
  if (!refresh) return null
  try {
    const h = new Headers({ 'Content-Type': 'application/json' })
    const r = await rawRequest(
      `${API_BASE_URL}auth/refresh`,
      'POST',
      h,
      JSON.stringify({ refreshToken: refresh }),
    )
    if (r.status < 200 || r.status >= 300) return null
    const data = r.data as AuthResponse
    saveSession(data)
    return data.accessToken
  } catch {
    return null
  }
}

export async function api<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const { auth = true, headers, body, method = 'GET' } = options
  const h = new Headers(headers)
  if (!h.has('Content-Type') && body) h.set('Content-Type', 'application/json')
  if (auth) {
    const token = getAccessToken()
    if (token) h.set('Authorization', `Bearer ${token}`)
  }

  const url = `${API_BASE_URL}${path.replace(/^\//, '')}`
  const bodyStr = typeof body === 'string' ? body : body != null ? JSON.stringify(body) : undefined

  let res = await rawRequest(url, String(method).toUpperCase(), h, bodyStr)

  if (res.status === 401 && auth) {
    const next = await refreshTokens()
    if (next) {
      h.set('Authorization', `Bearer ${next}`)
      res = await rawRequest(url, String(method).toUpperCase(), h, bodyStr)
    }
  }

  if (res.status < 200 || res.status >= 300) {
    throw new ApiError(res.status, errorMessage(res.data, `HTTP ${res.status}`))
  }

  if (res.status === 204) return undefined as T
  return res.data as T
}
