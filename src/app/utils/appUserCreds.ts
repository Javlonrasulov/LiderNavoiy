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

export function mapAdminRoleToBackend(role: string): 'distributor' | 'manager' | 'admin' {
  if (role.includes('Menedjer') || role.includes('Ofis')) return 'manager';
  return 'distributor';
}
