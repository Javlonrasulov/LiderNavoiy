/** UI matn/o'lcham masshtabi — butun admin uchun */

export type TextScaleId = 'sm' | 'md' | 'lg' | 'xl';

export const DEFAULT_TEXT_SCALE: TextScaleId = 'md';

export const TEXT_SCALE_OPTIONS: {
  id: TextScaleId;
  factor: number;
  percent: number;
}[] = [
  { id: 'sm', factor: 0.9, percent: 90 },
  { id: 'md', factor: 1, percent: 100 },
  { id: 'lg', factor: 1.12, percent: 112 },
  { id: 'xl', factor: 1.25, percent: 125 },
];

const TEXT_SCALE_STORAGE = 'lider_text_scale';

export function normalizeTextScale(id: string | null | undefined): TextScaleId {
  if (id === 'sm' || id === 'lg' || id === 'xl') return id;
  return DEFAULT_TEXT_SCALE;
}

export function getTextScaleOption(id: TextScaleId) {
  return TEXT_SCALE_OPTIONS.find((o) => o.id === id) ?? TEXT_SCALE_OPTIONS[1]!;
}

export function readStoredTextScale(): TextScaleId {
  try {
    return normalizeTextScale(localStorage.getItem(TEXT_SCALE_STORAGE));
  } catch {
    return DEFAULT_TEXT_SCALE;
  }
}

export function saveTextScale(id: TextScaleId) {
  try {
    localStorage.setItem(TEXT_SCALE_STORAGE, normalizeTextScale(id));
  } catch {
    /* ignore */
  }
}

/** html zoom — Tailwind px va inline fontSize ham kattalashadi */
export function applyTextScale(id: TextScaleId) {
  const scaleId = normalizeTextScale(id);
  const { factor } = getTextScaleOption(scaleId);
  const root = document.documentElement;
  root.dataset.textScale = scaleId;
  if (factor === 1) {
    root.style.removeProperty('zoom');
  } else {
    root.style.zoom = String(factor);
  }
}
