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

export async function login(username: string, password: string): Promise<AuthResponse> {
  const res = await api<AuthResponse>('auth/login', {
    auth: false,
    method: 'POST',
    body: JSON.stringify({
      username: username.trim(),
      password,
      device: {
        id: managerDeviceId(),
        brand: 'Lider',
        model: 'Manager',
        os: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 60) : 'Web',
      },
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
