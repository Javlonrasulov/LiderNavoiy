import { Capacitor } from '@capacitor/core'
import { Device } from '@capacitor/device'
import { api, clearSession, saveSession } from './client'
import type { AuthResponse, AuthUser } from './types'

const DEVICE_ID_KEY = 'lm-manager-device-id'

function managerDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY)
    if (!id) {
      id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `mgr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
      localStorage.setItem(DEVICE_ID_KEY, id)
    }
    return id
  } catch {
    return `mgr-fallback-${Date.now()}`
  }
}

/** User-Agent dan Android model (masalan SM-A515F) */
function parseUaDevice(ua: string): { brand: string; model: string; os: string } | null {
  const android = /Android\s+([\d.]+)/i.exec(ua)
  if (!android) return null
  const os = `Android ${android[1]}`
  // (; SM-A515F) yoki (; Samsung SM-A515F Build/...)
  const modelMatch = /Android[^;]*;\s*([^;)]+?)(?:\s+Build\/|;|\))/i.exec(ua)
  let raw = (modelMatch?.[1] || '').replace(/\s+wv$/i, '').trim()
  if (!raw || /^(Linux|U|Mobile)$/i.test(raw)) {
    return { brand: 'Android', model: 'Telefon', os }
  }
  // "Samsung SM-A515F" → brand + model
  const parts = raw.split(/\s+/)
  if (parts.length >= 2 && /^[A-Za-z]+$/.test(parts[0]) && !/^SM-/i.test(parts[0])) {
    return { brand: parts[0], model: parts.slice(1).join(' '), os }
  }
  // SM-A515F, Redmi Note 12, ...
  let brand = 'Android'
  if (/^SM-|^GT-|^S9|^S2|^SC-/i.test(raw)) brand = 'Samsung'
  else if (/^M2|^Redmi|^Mi |^POCO|^221|^220|^210/i.test(raw)) brand = 'Xiaomi'
  else if (/^CPH|^OPPO/i.test(raw)) brand = 'OPPO'
  else if (/^vivo|^V2/i.test(raw)) brand = 'vivo'
  else if (/^RMX|^realme/i.test(raw)) brand = 'realme'
  else if (/^Pixel/i.test(raw)) brand = 'Google'
  else if (/^Nokia/i.test(raw)) brand = 'Nokia'
  else if (/^Huawei|^ANE-|^MAR-/i.test(raw)) brand = 'Huawei'
  else if (/^Honor/i.test(raw)) brand = 'Honor'
  return { brand, model: raw, os }
}

async function resolveLoginDevice(): Promise<{
  id: string
  brand: string
  model: string
  os: string
}> {
  const id = managerDeviceId()
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''

  if (Capacitor.isNativePlatform()) {
    try {
      const info = await Device.getInfo()
      const brand = (info.manufacturer || '').trim() || 'Android'
      const model = (info.model || '').trim() || 'Telefon'
      const osName = info.operatingSystem === 'ios' ? 'iOS' : 'Android'
      const ver = (info.osVersion || '').trim()
      return {
        id,
        brand: brand.replace(/^./, c => c.toUpperCase()),
        model,
        os: ver ? `${osName} ${ver}` : osName,
      }
    } catch {
      /* fall through */
    }
  }

  const parsed = parseUaDevice(ua)
  if (parsed) return { id, ...parsed }

  return {
    id,
    brand: 'Web',
    model: 'Browser',
    os: 'Web',
  }
}

export async function login(username: string, password: string): Promise<AuthResponse> {
  const device = await resolveLoginDevice()
  const res = await api<AuthResponse>('auth/login', {
    auth: false,
    method: 'POST',
    body: JSON.stringify({
      username: username.trim(),
      password,
      device,
    }),
  })

  if (res.user.role !== 'admin' && res.user.role !== 'manager') {
    throw new Error('manager_only')
  }

  saveSession(res)
  return res
}

export async function logout() {
  try {
    await api('auth/logout', { method: 'POST' })
  } catch { /* ignore */ }
  clearSession()
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await api('auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  })
}

export function isManagerRole(user: AuthUser | null | undefined): boolean {
  return user?.role === 'admin' || user?.role === 'manager'
}
