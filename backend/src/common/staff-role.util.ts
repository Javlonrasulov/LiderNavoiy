/** Agent vs dostavkachi: ikkalasi ham role=distributor; farq position orqali. */
const DELIVERY_POSITION_MARKERS = [
  'delivery',
  'yetkaz',
  'kuryer',
  'dostav',
  'haydov',
] as const;

export function isDeliveryPosition(position: string | null | undefined): boolean {
  const p = (position ?? '').toLowerCase();
  return DELIVERY_POSITION_MARKERS.some((m) => p.includes(m));
}

export function detectStaffRole(
  position: string | null | undefined,
): 'agent' | 'delivery' {
  return isDeliveryPosition(position) ? 'delivery' : 'agent';
}
