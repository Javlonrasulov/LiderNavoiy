import type { PositionAppAccess } from '../api/client';

/** Backend role: manager ilova → manager; qolganlari → distributor (agent APK) */
export function appAccessToBackendRole(
  access: PositionAppAccess,
): 'distributor' | 'manager' {
  return access === 'manager' ? 'manager' : 'distributor';
}

/** Backend position — delivery uchun isDelivery marker saqlanadi */
export function positionPayloadForAccess(
  name: string,
  access: PositionAppAccess,
): string {
  const trimmed = name.trim();
  if (access !== 'delivery') return trimmed;
  const lower = trimmed.toLowerCase();
  if (
    lower.includes('delivery') ||
    lower.includes('yetkaz') ||
    lower.includes('dostav') ||
    lower.includes('haydov') ||
    lower.includes('kuryer')
  ) {
    return trimmed;
  }
  return `${trimmed} · delivery`;
}

export function appAccessToPosKey(access: PositionAppAccess): string {
  if (access === 'manager') return 'manager';
  if (access === 'delivery') return 'delivery';
  return 'salesAgent';
}
