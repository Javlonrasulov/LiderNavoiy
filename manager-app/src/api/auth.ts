import { api, clearSession, saveSession } from './client'
import type { AuthResponse, AuthUser } from './types'

export async function login(username: string, password: string): Promise<AuthResponse> {
  const res = await api<AuthResponse>('auth/login', {
    auth: false,
    method: 'POST',
    body: JSON.stringify({
      username: username.trim(),
      password,
      device: { id: 'manager-web', brand: 'Lider', model: 'Manager', os: 'Android' },
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

export function isManagerRole(user: AuthUser | null | undefined): boolean {
  return user?.role === 'admin' || user?.role === 'manager'
}
