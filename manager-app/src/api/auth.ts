import { api, clearSession, markIntentionalLogout, saveSession } from './client'
import { resolveLoginDevice } from '../utils/deviceInfo'
import type { AuthResponse, AuthUser } from './types'

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
  markIntentionalLogout()
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
