import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import {
  applyTextColor,
  readStoredTextColor,
  saveTextColor,
  type TextColorId,
} from '../utils/textColor';
import {
  applyTextScale,
  readStoredTextScale,
  saveTextScale,
  type TextScaleId,
} from '../utils/textScale';

interface ThemeContextType {
  isDark: boolean;
  setIsDark: (value: boolean) => void;
  toggleTheme: () => void;
  language: 'uz_latn' | 'uz_cyrl' | 'ru';
  setLanguage: (value: 'uz_latn' | 'uz_cyrl' | 'ru') => void;
  textColor: TextColorId;
  setTextColor: (id: TextColorId) => void;
  textScale: TextScaleId;
  setTextScale: (id: TextScaleId) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDarkState] = useState(() => {
    try {
      return localStorage.getItem('lider_theme') === 'dark';
    } catch {
      return false;
    }
  });
  const [language, setLanguage] = useState<'uz_latn' | 'uz_cyrl' | 'ru'>('uz_cyrl');
  const [textColor, setTextColorState] = useState<TextColorId>(() => readStoredTextColor());
  const [textScale, setTextScaleState] = useState<TextScaleId>(() => readStoredTextScale());

  const setIsDark = useCallback((value: boolean) => {
    setIsDarkState(value);
    try {
      localStorage.setItem('lider_theme', value ? 'dark' : 'light');
    } catch {
      /* ignore */
    }
  }, []);

  const toggleTheme = () => setIsDark(!isDark);

  const setTextColor = useCallback((id: TextColorId) => {
    setTextColorState(id);
    saveTextColor(id);
  }, []);

  const setTextScale = useCallback((id: TextScaleId) => {
    setTextScaleState(id);
    saveTextScale(id);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    applyTextColor(textColor, isDark);
  }, [isDark, textColor]);

  useEffect(() => {
    applyTextScale(textScale);
  }, [textScale]);

  return (
    <ThemeContext.Provider
      value={{
        isDark, setIsDark, toggleTheme,
        language, setLanguage,
        textColor, setTextColor,
        textScale, setTextScale,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export type { TextColorId, TextScaleId };
