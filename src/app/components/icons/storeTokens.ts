/**
 * Premium storefront glyph — Flat + Soft UI (SF Symbols / Material 3 feel).
 * Strokes/fills use `currentColor` (or `color` prop) — no baked theme colors.
 */

export type StoreMarkerStatus = 'active' | 'approaching' | 'closed' | 'selected';

/** Semantic status → consumer passes these into `color` / pin fill. */
export const STORE_MARKER_STATUS_COLOR: Record<StoreMarkerStatus, string> = {
  active: 'var(--store-marker-active, #22C55E)',
  approaching: 'var(--store-marker-approaching, #EAB308)',
  closed: 'var(--store-marker-closed, #EF4444)',
  selected: 'var(--store-marker-selected, var(--primary, #3B82F6))',
};

export const STORE_ICON_SURFACE = {
  light: {
    bg: 'var(--store-surface, #F8FAFC)',
    border: 'var(--store-border, #E2E8F0)',
    muted: 'var(--store-muted, #CBD5E1)',
  },
  dark: {
    bg: 'var(--store-surface-dark, #1E293B)',
    border: 'var(--store-border-dark, #334155)',
    muted: 'var(--store-muted-dark, #475569)',
  },
} as const;
