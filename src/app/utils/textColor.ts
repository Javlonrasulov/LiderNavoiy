/** Matn rangi — LiderPlast uslubi: standart | qora */

export type TextColorId = 'default' | 'black';

export const DEFAULT_TEXT_COLOR: TextColorId = 'default';

export const TEXT_COLOR_OPTIONS: {
  id: TextColorId;
  light: string | null;
  dark: string | null;
  swatch: string;
}[] = [
  {
    id: 'default',
    light: null,
    dark: null,
    swatch: 'linear-gradient(135deg, #64748b 0%, #0f172a 100%)',
  },
  {
    id: 'black',
    light: '#000000',
    dark: '#ffffff',
    swatch: '#000000',
  },
];

const TEXT_COLOR_STORAGE = 'lider_text_color';

export function normalizeTextColor(id: string | null | undefined): TextColorId {
  return id === 'black' ? 'black' : DEFAULT_TEXT_COLOR;
}

export function getTextColorOption(id: TextColorId) {
  return TEXT_COLOR_OPTIONS.find((o) => o.id === id) ?? TEXT_COLOR_OPTIONS[0]!;
}

export function readStoredTextColor(): TextColorId {
  try {
    return normalizeTextColor(localStorage.getItem(TEXT_COLOR_STORAGE));
  } catch {
    return DEFAULT_TEXT_COLOR;
  }
}

export function saveTextColor(id: TextColorId) {
  try {
    localStorage.setItem(TEXT_COLOR_STORAGE, normalizeTextColor(id));
  } catch {
    /* ignore */
  }
}

/** CSS o‘zgaruvchilari + `text-color-override` klassi */
export function applyTextColor(id: TextColorId, isDark = false) {
  const colorId = normalizeTextColor(id);
  const option = getTextColorOption(colorId);
  const root = document.documentElement;

  root.dataset.textColor = colorId;
  root.classList.toggle('text-color-override', colorId !== DEFAULT_TEXT_COLOR);

  if (colorId === DEFAULT_TEXT_COLOR || !option.light) {
    root.style.removeProperty('--app-text-color');
    return;
  }

  const color = isDark ? option.dark! : option.light!;
  root.style.setProperty('--app-text-color', color);
}
