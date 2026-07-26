import L from 'leaflet';
import type { StoreMarkerStatus } from './storeTokens';
import type { StoreOnlineStatus } from './StoreMapMarker';

export type StoreLeafletIconOptions = {
  status?: StoreMarkerStatus;
  onlineStatus?: StoreOnlineStatus;
  selected?: boolean;
  size?: number;
  color?: string;
  dark?: boolean;
};

function strokeStoreSvg(iconPx: number, color: string): string {
  return `<svg width="${iconPx}" height="${iconPx}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M4.5 9.25h15" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
  <path d="M5.25 9.25 7.1 5.9a1.6 1.6 0 0 1 1.4-.85h7a1.6 1.6 0 0 1 1.4.85l1.85 3.35" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
  <path d="M6 9.25v9.1c0 .75.6 1.35 1.35 1.35h9.3c.75 0 1.35-.6 1.35-1.35v-9.1" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
  <rect x="7.6" y="11.2" width="4.2" height="3.8" rx="1" stroke="${color}" stroke-width="2"/>
  <path d="M14.2 19.7v-6.2c0-.55.45-1 1-1h1.9c.55 0 1 .45 1 1v6.2" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M16.85 15.35h.01" stroke="${color}" stroke-width="2.4" stroke-linecap="round"/>
</svg>`;
}

const ONLINE: Record<StoreOnlineStatus, string> = {
  active: '#22C55E',
  busy: '#EAB308',
  closed: '#EF4444',
};

/**
 * Leaflet DivIcon — glass disc + stroke store + soft droplet.
 * Never a yellow Google pin.
 */
export function createStoreLeafletIcon(opts: StoreLeafletIconOptions = {}): L.DivIcon {
  const size = opts.size ?? 48;
  const pointerH = 10;
  const h = size + pointerH - 2;
  const iconPx = Math.round(size * 0.55);
  const primary = opts.color ?? '#3B82F6';
  const selected = Boolean(opts.selected);
  const dark = Boolean(opts.dark);
  const online: StoreOnlineStatus =
    opts.onlineStatus ??
    (opts.status === 'closed' ? 'closed' : opts.status === 'approaching' ? 'busy' : 'active');

  const discBg = selected
    ? `linear-gradient(145deg, ${primary}, #6366F1)`
    : dark
      ? '#1E293B'
      : 'rgba(255,255,255,0.94)';
  const iconColor = selected || dark ? '#FFFFFF' : primary;
  const dropFill = selected ? primary : dark ? '#1E293B' : '#FFFFFF';
  const scale = selected ? 1.08 : 1;
  const glow = selected
    ? `<span style="position:absolute;left:50%;top:18%;width:${size * 0.92}px;height:${size * 0.92}px;transform:translateX(-50%);border-radius:999px;background:${primary};opacity:.35;filter:blur(24px);pointer-events:none;"></span>`
    : '';

  const html = `
<div class="lider-store-marker" style="width:${size}px;height:${h}px;transform:scale(${scale});transform-origin:bottom center;position:relative;display:flex;flex-direction:column;align-items:center;">
  ${glow}
  <div style="position:relative;width:${size}px;height:${size}px;border-radius:50%;background:${discBg};border:1px solid rgba(255,255,255,.4);box-shadow:0 12px 35px rgba(0,0,0,.18);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);">
    ${strokeStoreSvg(iconPx, iconColor)}
    <span style="position:absolute;top:3px;right:3px;width:8px;height:8px;border-radius:50%;background:${ONLINE[online]};box-shadow:0 0 0 2px #fff;"></span>
  </div>
  <svg width="14" height="${pointerH}" viewBox="0 0 14 10" style="margin-top:-2px;display:block;">
    <path d="M1.2 0h11.6c-1.4 2.4-3.9 6.2-5.2 8.2-.3.45-.9.45-1.2 0C5.1 6.2 2.6 2.4 1.2 0Z" fill="${dropFill}" fill-opacity="0.94"/>
  </svg>
</div>`;

  return L.divIcon({
    className: 'lider-store-map-marker',
    html,
    iconSize: [size, h],
    iconAnchor: [size / 2, h],
    popupAnchor: [0, -h + 8],
  });
}

export function createStoreClusterLeafletIcon(count: number, size = 48): L.DivIcon {
  const label = count > 99 ? '99+' : String(count);
  const html = `
<div style="width:${size}px;height:${size}px;border-radius:50%;background:rgba(255,255,255,.94);border:1px solid rgba(255,255,255,.45);box-shadow:0 12px 35px rgba(0,0,0,.18);display:flex;align-items:center;justify-content:center;font:600 ${count >= 100 ? 13 : 15}px/1 system-ui,sans-serif;color:#3B82F6;backdrop-filter:blur(18px);">${label}</div>`;
  return L.divIcon({
    className: 'lider-store-cluster',
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export type StorePoint = {
  id: string;
  lat: number;
  lng: number;
  status?: StoreMarkerStatus;
  selected?: boolean;
};

export type StoreCluster =
  | { type: 'point'; point: StorePoint }
  | { type: 'cluster'; lat: number; lng: number; points: StorePoint[]; count: number };

export function clusterStorePoints(points: StorePoint[], cellDeg: number): StoreCluster[] {
  if (cellDeg <= 0 || points.length <= 1) {
    return points.map((point) => ({ type: 'point', point }));
  }
  const buckets = new Map<string, StorePoint[]>();
  for (const p of points) {
    const key = `${Math.floor(p.lat / cellDeg)}_${Math.floor(p.lng / cellDeg)}`;
    const list = buckets.get(key) ?? [];
    list.push(p);
    buckets.set(key, list);
  }
  const out: StoreCluster[] = [];
  for (const list of buckets.values()) {
    if (list.length === 1) {
      out.push({ type: 'point', point: list[0] });
      continue;
    }
    const selected = list.find((p) => p.selected);
    if (selected && list.length <= 3) {
      out.push({ type: 'point', point: selected });
      const rest = list.filter((p) => p.id !== selected.id);
      if (rest.length === 1) out.push({ type: 'point', point: rest[0] });
      else if (rest.length > 1) {
        out.push({
          type: 'cluster',
          lat: rest.reduce((s, p) => s + p.lat, 0) / rest.length,
          lng: rest.reduce((s, p) => s + p.lng, 0) / rest.length,
          points: rest,
          count: rest.length,
        });
      }
      continue;
    }
    out.push({
      type: 'cluster',
      lat: list.reduce((s, p) => s + p.lat, 0) / list.length,
      lng: list.reduce((s, p) => s + p.lng, 0) / list.length,
      points: list,
      count: list.length,
    });
  }
  return out;
}

export function storeClusterCellForZoom(zoom: number): number {
  if (zoom >= 16) return 0;
  if (zoom >= 14) return 0.004;
  if (zoom >= 12) return 0.012;
  if (zoom >= 10) return 0.035;
  return 0.08;
}
