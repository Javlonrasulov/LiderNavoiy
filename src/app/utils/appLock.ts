const STORAGE_PREFIX = 'lider_app_lock_v1_';
const LOCKED_PREFIX = 'lider_app_locked_';

export type AppLockRecord = {
  hash: string;
  salt: string;
};

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

function lockedKey(userId: string) {
  return `${LOCKED_PREFIX}${userId}`;
}

function randomSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hashPasscode(code: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${code}`);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

export function readAppLock(userId: string): AppLockRecord | null {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppLockRecord;
    if (!parsed?.hash || !parsed?.salt) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveAppLock(userId: string, code: string): Promise<void> {
  const salt = randomSalt();
  const hash = await hashPasscode(code, salt);
  localStorage.setItem(storageKey(userId), JSON.stringify({ hash, salt } satisfies AppLockRecord));
}

export function clearAppLock(userId: string): void {
  try {
    localStorage.removeItem(storageKey(userId));
    sessionStorage.removeItem(lockedKey(userId));
  } catch {
    /* ignore */
  }
}

export async function verifyAppLock(userId: string, code: string): Promise<boolean> {
  const rec = readAppLock(userId);
  if (!rec) return false;
  const hash = await hashPasscode(code, rec.salt);
  return hash === rec.hash;
}

export function readLocked(userId: string): boolean {
  try {
    return sessionStorage.getItem(lockedKey(userId)) === '1';
  } catch {
    return false;
  }
}

export function writeLocked(userId: string, locked: boolean): void {
  try {
    if (locked) sessionStorage.setItem(lockedKey(userId), '1');
    else sessionStorage.removeItem(lockedKey(userId));
  } catch {
    /* ignore */
  }
}

export const APP_LOCK_MIN_LEN = 4;
export const APP_LOCK_MAX_LEN = 32;
