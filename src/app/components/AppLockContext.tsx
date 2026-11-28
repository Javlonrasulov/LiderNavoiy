import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAdminAuth } from './AdminAuthContext';
import {
  APP_LOCK_MAX_LEN,
  APP_LOCK_MIN_LEN,
  clearAppLock,
  readAppLock,
  readLocked,
  saveAppLock,
  verifyAppLock,
  writeLocked,
} from '../utils/appLock';

interface AppLockContextType {
  hasPasscode: boolean;
  isLocked: boolean;
  lock: () => void;
  unlock: (code: string) => Promise<boolean>;
  setPasscode: (code: string) => Promise<void>;
  changePasscode: (current: string, next: string) => Promise<'ok' | 'bad_current'>;
  removePasscode: (current: string) => Promise<boolean>;
  minLen: number;
  maxLen: number;
}

const AppLockContext = createContext<AppLockContextType | undefined>(undefined);

export function AppLockProvider({ children }: { children: ReactNode }) {
  const { adminUser, isLoggedIn } = useAdminAuth();
  const userId = adminUser?.id
    || (() => {
      try { return localStorage.getItem('api_user_id') || ''; } catch { return ''; }
    })()
    || adminUser?.username
    || '';

  const [hasPasscode, setHasPasscode] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    if (!isLoggedIn || !userId) {
      setHasPasscode(false);
      setIsLocked(false);
      return;
    }
    const rec = readAppLock(userId);
    setHasPasscode(!!rec);
    setIsLocked(!!rec && readLocked(userId));
  }, [isLoggedIn, userId]);

  const lock = useCallback(() => {
    if (!userId || !readAppLock(userId)) return;
    writeLocked(userId, true);
    setIsLocked(true);
  }, [userId]);

  const unlock = useCallback(async (code: string) => {
    if (!userId) return false;
    const ok = await verifyAppLock(userId, code.trim());
    if (!ok) return false;
    writeLocked(userId, false);
    setIsLocked(false);
    return true;
  }, [userId]);

  const setPasscode = useCallback(async (code: string) => {
    if (!userId) return;
    await saveAppLock(userId, code.trim());
    setHasPasscode(true);
  }, [userId]);

  const changePasscode = useCallback(async (current: string, next: string) => {
    if (!userId) return 'bad_current' as const;
    const ok = await verifyAppLock(userId, current.trim());
    if (!ok) return 'bad_current' as const;
    await saveAppLock(userId, next.trim());
    setHasPasscode(true);
    return 'ok' as const;
  }, [userId]);

  const removePasscode = useCallback(async (current: string) => {
    if (!userId) return false;
    const ok = await verifyAppLock(userId, current.trim());
    if (!ok) return false;
    clearAppLock(userId);
    setHasPasscode(false);
    setIsLocked(false);
    return true;
  }, [userId]);

  const value = useMemo(
    () => ({
      hasPasscode,
      isLocked,
      lock,
      unlock,
      setPasscode,
      changePasscode,
      removePasscode,
      minLen: APP_LOCK_MIN_LEN,
      maxLen: APP_LOCK_MAX_LEN,
    }),
    [hasPasscode, isLocked, lock, unlock, setPasscode, changePasscode, removePasscode],
  );

  return <AppLockContext.Provider value={value}>{children}</AppLockContext.Provider>;
}

export function useAppLock() {
  const ctx = useContext(AppLockContext);
  if (!ctx) throw new Error('useAppLock must be used within AppLockProvider');
  return ctx;
}
