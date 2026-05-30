import { createContext, useContext, useState, ReactNode } from 'react';

export type Lang = 'uz' | 'cy' | 'ru';

export const DEFAULT_LANG: Lang = 'cy';

interface LangCtx { lang: Lang; setLang: (l: Lang) => void; }

const Ctx = createContext<LangCtx>({ lang: DEFAULT_LANG, setLang: () => {} });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    return (localStorage.getItem('admin_lang') as Lang) || DEFAULT_LANG;
  });
  const set = (l: Lang) => { setLang(l); localStorage.setItem('admin_lang', l); };
  return <Ctx.Provider value={{ lang, setLang: set }}>{children}</Ctx.Provider>;
}

export function useLang() { return useContext(Ctx); }
