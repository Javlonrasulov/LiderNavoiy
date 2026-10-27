/** Agent vs dostavkachi: ikkalasi ham role=distributor; farq position orqali. */
const DELIVERY_POSITION_MARKERS = [
  'delivery',
  'yetkaz',
  'kuryer',
  'dostav',
  'haydov',
] as const;

/** Admin `positionPayloadForAccess` bilan bir xil: buyurtma oladi va yetkazadi. */
const AGENT_DELIVERY_MARKER = 'agent+delivery';

export function isDeliveryPosition(position: string | null | undefined): boolean {
  const p = (position ?? '').toLowerCase();
  return DELIVERY_POSITION_MARKERS.some((m) => p.includes(m));
}

export function isAgentDeliveryPosition(position: string | null | undefined): boolean {
  return (position ?? '').toLowerCase().includes(AGENT_DELIVERY_MARKER);
}

/** Buyurtma oluvchi (agent) — sof dostavchik emas. */
export function isAgentPosition(position: string | null | undefined): boolean {
  return !isDeliveryPosition(position) || isAgentDeliveryPosition(position);
}

/** Admin `positionPayloadForAccess` bilan bir xil: profil `position` matni. */
export function positionPayloadForAccess(
  name: string,
  access: 'agent' | 'delivery' | 'agent_delivery' | 'manager',
): string {
  const trimmed = name
    .replace(/\s*·\s*agent\+delivery\s*$/i, '')
    .replace(/\s*·\s*delivery\s*$/i, '')
    .trim();
  if (access === 'agent_delivery') return `${trimmed} · ${AGENT_DELIVERY_MARKER}`;
  if (access !== 'delivery' || isDeliveryPosition(trimmed)) return trimmed;
  return `${trimmed} · delivery`;
}

export function detectStaffRole(
  position: string | null | undefined,
): 'agent' | 'delivery' {
  return isDeliveryPosition(position) ? 'delivery' : 'agent';
}
