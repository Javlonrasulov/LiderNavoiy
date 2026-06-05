const CREDS_KEY = 'crm_app_user_passwords';

export function getStoredAppPassword(username: string): string {
  if (!username || typeof localStorage === 'undefined') return '';
  try {
    const map = JSON.parse(localStorage.getItem(CREDS_KEY) || '{}') as Record<string, string>;
    return map[username] || '';
  } catch {
    return '';
  }
}

export function storeAppPassword(username: string, password: string) {
  if (!username || !password || typeof localStorage === 'undefined') return;
  try {
    const map = JSON.parse(localStorage.getItem(CREDS_KEY) || '{}') as Record<string, string>;
    map[username] = password;
    localStorage.setItem(CREDS_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export function removeStoredAppPassword(username: string) {
  if (!username || typeof localStorage === 'undefined') return;
  try {
    const map = JSON.parse(localStorage.getItem(CREDS_KEY) || '{}') as Record<string, string>;
    delete map[username];
    localStorage.setItem(CREDS_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

import type { AppUserRecord } from '../api/client';

export interface AppUserListRow {
  id: number;
  code: string;
  name: string;
  tg: string;
  lastAct: string;
  role: string;
  status: 'open' | 'closed';
  org: string;
  emp: string;
  onTrade: string;
  backendUserId?: string;
  dirs: string;
  acceptPay: boolean;
  consig: boolean;
  gps: boolean;
}

export function mapBackendRoleToDisplay(role: string): string {
  if (role === 'manager') return 'Menedjer';
  return 'Savdo agenti';
}

export function appUserToRow(app: AppUserRecord, localId: number): AppUserListRow {
  return {
    id: localId,
    code: String(localId).padStart(4, '0'),
    name: app.fullName,
    tg: '',
    lastAct: '',
    role: mapBackendRoleToDisplay(app.role),
    status: app.isActive ? 'open' : 'closed',
    org: '',
    emp: app.fullName.length > 14 ? `${app.fullName.slice(0, 13)}...` : app.fullName,
    onTrade: app.username,
    backendUserId: app.id,
    dirs: '',
    acceptPay: true,
    consig: false,
    gps: true,
  };
}

export function mapAdminRoleToBackend(role: string): 'distributor' | 'manager' | 'admin' {
  if (role.includes('Menedjer') || role.includes('Ofis')) return 'manager';
  return 'distributor';
}

/** NestJS / API xabarlarini admin tiliga tarjima qiladi */
export function translateApiError(message: string, t: Record<string, string>): string {
  const raw = (message || '').trim();
  if (!raw) return t.userErrSaveFailed || 'Saqlashda xatolik';

  const lower = raw.toLowerCase();

  if (lower.includes('username already exists')) {
    return t.userErrUsernameExists || raw;
  }
  if (lower.includes('user not found')) {
    return t.userErrNotFound || raw;
  }
  if (lower.includes('invalid credentials')) {
    return t.userErrInvalidCredentials || raw;
  }
  if (lower.includes('admin panelga kirish') || lower.includes('backend bilan')) {
    return t.userErrAdminLoginRequired || raw;
  }
  if (lower.includes('apk uchun parol') || lower.includes('parol kiriting')) {
    return t.userErrPasswordRequired || raw;
  }

  return raw;
}
