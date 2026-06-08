const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch',
  ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  ғ: 'g', қ: 'q', ҳ: 'h', ў: 'o', ӯ: 'u',
};

function transliterateWord(word: string): string {
  let raw = word
    .trim()
    .replace(/o[''`ʼ]/gi, 'o')
    .replace(/g[''`ʼ]/gi, 'g');

  let latin = '';
  for (const ch of raw) {
    latin += CYRILLIC_TO_LATIN[ch.toLowerCase()] ?? ch;
  }

  return latin
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

/** Mijoz nomining faqat birinchi so'zidan login (masalan: "GO ZAL TONG" → "go") */
export function nameToLogin(name: string, codeFallback?: string): string {
  const firstWord = name.trim().split(/\s+/).find(Boolean) ?? '';
  let login = transliterateWord(firstWord).slice(0, 32);

  if (login.length < 3 && codeFallback) {
    login = `${login}${codeFallback.replace(/\D/g, '')}`.slice(0, 32);
  }
  if (login.length < 3) {
    login = `mijoz${Date.now().toString(36).slice(-5)}`;
  }
  return login;
}
