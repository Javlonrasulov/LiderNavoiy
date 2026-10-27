import type { PositionAppAccess } from '../api/client';

/** `appUserCreds.isDeliveryHint` bilan bir xil (aylanma importsiz). */
const DELIVERY_HINTS = [
  'delivery', 'dostav', 'yetkaz', 'haydov', 'shofyor', 'kuryer',
  'водитель', 'достав', 'курьер',
];

function hasDeliveryHint(text?: string | null): boolean {
  const p = (text ?? '').toLowerCase();
  return DELIVERY_HINTS.some(h => p.includes(h));
}

const DELIVERY_SUFFIX = ' · delivery';
const AGENT_DELIVERY_SUFFIX = ' · agent+delivery';

/** Lavozim nomidan backend markerlarini olib tashlaydi (ro‘yxatda ko‘rsatish uchun). */
export function stripPositionMarker(position: string): string {
  return position
    .replace(/\s*·\s*agent\+delivery\s*$/i, '')
    .replace(/\s*·\s*delivery\s*$/i, '')
    .trim();
}

/** Lavozim matnida agent+dostavchik markeri bormi */
export function isAgentDeliveryPosition(position?: string | null): boolean {
  return (position ?? '').toLowerCase().includes('agent+delivery');
}

/** Agentlar ro‘yxatida ko‘rinadimi: sof dostavchik emas yoki agent+dostavchik. */
export function isAgentStaff(position?: string | null, username?: string | null): boolean {
  if (isAgentDeliveryPosition(position)) return true;
  return !hasDeliveryHint(position) && !hasDeliveryHint(username);
}

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
  const trimmed = stripPositionMarker(name);
  if (access === 'agent_delivery') return `${trimmed}${AGENT_DELIVERY_SUFFIX}`;
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
  return `${trimmed}${DELIVERY_SUFFIX}`;
}

export function appAccessToPosKey(access: PositionAppAccess): string {
  if (access === 'manager') return 'manager';
  if (access === 'delivery' || access === 'agent_delivery') return 'delivery';
  return 'salesAgent';
}
