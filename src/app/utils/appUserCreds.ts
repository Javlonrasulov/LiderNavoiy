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

import type { AppUserRecord, Distributor } from '../api/client';
import type { SotrudnikRow } from '../data/adminData';

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
  isOnline?: boolean;
}

export function isDeliveryHint(text?: string | null): boolean {
  if (!text) return false;
  const p = text.toLowerCase();
  return (
    p.includes('delivery') ||
    p.includes('dostav') ||
    p.includes('yetkaz') ||
    p.includes('haydov') ||
    p.includes('shofyor') ||
    p.includes('водитель') ||
    p.includes('достав') ||
    p.includes('курьер')
  );
}

export function isOfficeHint(text?: string | null): boolean {
  if (!text) return false;
  const p = text.toLowerCase();
  return p.includes('office') || p.includes('ofis') || p.includes('офис');
}

/** Canonical display role stored in admin user rows (language-neutral Latin). */
export function mapBackendRoleToDisplay(
  role: string,
  position?: string | null,
  username?: string | null,
): string {
  if (role === 'manager') {
    if (isOfficeHint(position)) return 'Ofis xodimi';
    return 'Menedjer';
  }
  if (isDeliveryHint(position) || isDeliveryHint(username)) {
    return 'Dostavkachi/Shofyor';
  }
  return 'Savdo agenti';
}

export function mapAdminRoleToPosition(role: string): string {
  if (role.includes('Dostav') || role.includes('Shofyor') || role.includes('Yetkaz')) {
    return 'delivery';
  }
  if (role.includes('Ofis')) return 'office';
  if (role.includes('Menedjer')) return 'manager';
  return 'salesAgent';
}

export function formatLastActive(
  app: Pick<AppUserRecord, 'isOnline' | 'lastActiveAt' | 'lastLoginAt'>,
  t?: Record<string, string>,
): string {
  if (app.isOnline) return t?.userLastActOnline || 'Hozir online';
  const at = app.lastActiveAt || app.lastLoginAt;
  if (!at) return '';

  const diffMs = Date.now() - new Date(at).getTime();
  if (diffMs < 0) return t?.userLastActJustNow || 'Hozirgina';

  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return t?.userLastActJustNow || 'Hozirgina';
  if (mins < 60) return `${mins} ${t?.userLastActMinAgo || 'daqiqa oldin'}`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ${t?.userLastActHourAgo || 'soat oldin'}`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ${t?.userLastActDayAgo || 'kun oldin'}`;

  return new Date(at).toLocaleString();
}

export function appUserToRow(
  app: AppUserRecord,
  localId: number,
  t?: Record<string, string>,
): AppUserListRow {
  return {
    id: localId,
    code: String(localId).padStart(4, '0'),
    name: app.fullName,
    tg: '',
    lastAct: formatLastActive(app, t),
    role: mapBackendRoleToDisplay(app.role, app.position, app.username),
    status: app.isActive ? 'open' : 'closed',
    org: '',
    emp: app.fullName.length > 14 ? `${app.fullName.slice(0, 13)}...` : app.fullName,
    onTrade: app.username,
    backendUserId: app.id,
    dirs: '',
    acceptPay: true,
    consig: false,
    gps: true,
    isOnline: app.isOnline,
  };
}

const SOTR_DEPT_KEYS: Record<string, string> = {
  '': 'empDeptNone',
  sales: 'sotrDeptSales',
  delivery: 'sotrDeptDelivery',
  salesDept: 'sotrDeptSalesDept',
  office: 'sotrDeptOffice',
  cash: 'sotrDeptCash',
  warehouse: 'sotrDeptWarehouse',
  accounting: 'sotrDeptAccounting',
};

const SOTR_POS_KEYS: Record<string, string> = {
  director: 'sotrPosDirector',
  salesAgent: 'sotrPosSalesAgent',
  delivery: 'sotrPosDelivery',
  deptHead: 'sotrPosDeptHead',
  chef: 'sotrPosChef',
  cashier: 'sotrPosCashier',
  warehouse: 'sotrPosWarehouse',
  operator: 'sotrPosOperator',
  accountant: 'sotrPosAccountant',
  promoter: 'sotrPosPromoter',
  manager: 'sotrPosManager',
};

export function translateSotrDept(key: string | undefined, t: Record<string, string>): string {
  if (!key) return '';
  const labelKey = SOTR_DEPT_KEYS[key];
  return labelKey ? (t[labelKey] || key) : key;
}

export function translateSotrPos(key: string | undefined, t: Record<string, string>): string {
  if (!key) return '';
  const labelKey = SOTR_POS_KEYS[key];
  return labelKey ? (t[labelKey] || key) : key;
}

export function getSotrDeptOptions(t: Record<string, string>) {
  return Object.entries(SOTR_DEPT_KEYS).map(([value, labelKey]) => ({
    value,
    label: value === '' ? (t.empDeptNone || '— tanlanmagan —') : (t[labelKey] || value),
  }));
}

export function getSotrPosOptions(t: Record<string, string>) {
  return Object.keys(SOTR_POS_KEYS).map(value => ({
    value,
    label: t[SOTR_POS_KEYS[value]] || value,
  }));
}

export function sotrudnikDeptLabel(emp: SotrudnikRow, t: Record<string, string>): string {
  return translateSotrDept(emp.deptKey, t) || emp.department;
}

export function sotrudnikPosLabel(emp: SotrudnikRow, t: Record<string, string>): string {
  return translateSotrPos(emp.posKey, t) || emp.position;
}

export function appUserToSotrudnikRow(
  app: AppUserRecord,
  distributor: Distributor | undefined,
  index: number,
  _t: Record<string, string>,
): SotrudnikRow {
  const posKey = mapBackendRoleToPosKey(app.role, app.position ?? distributor?.position, app.username);
  const deptKey =
    posKey === 'delivery' ? 'delivery' :
    posKey === 'salesAgent' ? 'sales' :
    'office';

  return {
    tabel: index,
    name: app.fullName,
    department: '',
    position: '',
    deptKey,
    posKey,
    phone: distributor?.phone || '',
    orgId: distributor?.companyId || 'boran',
    backendUserId: app.id,
    distributorId: distributor?.id,
    username: app.username,
  };
}

export function mapPosKeyToBackend(posKey?: string): 'distributor' | 'manager' | 'admin' {
  if (posKey === 'manager') return 'manager';
  if (posKey === 'director') return 'admin';
  return 'distributor';
}

export function mapBackendRoleToPosKey(
  role: string,
  position?: string | null,
  username?: string | null,
): string {
  if (role === 'manager') return 'manager';
  if (role === 'admin') return 'director';
  if (isDeliveryHint(position) || isDeliveryHint(username)) return 'delivery';
  return 'salesAgent';
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
