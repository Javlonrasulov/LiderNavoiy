/**
 * O‘zbek lotin ↔ kirill (qidiruv uchun).
 * Misol: "Karimov" ↔ "Каримов", "o'g'li" ↔ "ўғли".
 */

const CYR_TO_LAT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'j', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'x', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sh',
  ъ: "'", ы: 'i', ь: '', э: 'e', ю: 'yu', я: 'ya',
  ғ: "g'", қ: 'q', ҳ: 'h', ў: "o'", ӯ: 'u',
};

/** Lotin digraflar (uzunroqlar avval). */
const LAT_TO_CYR_DIGRAPHS: Array<[string, string]> = [
  ["o'", 'ў'],
  ["g'", 'ғ'],
  ['sh', 'ш'],
  ['ch', 'ч'],
  ['yo', 'ё'],
  ['yu', 'ю'],
  ['ya', 'я'],
  ['ts', 'ц'],
  ['ye', 'е'],
];

const LAT_TO_CYR_SINGLE: Record<string, string> = {
  a: 'а', b: 'б', v: 'в', g: 'г', d: 'д', e: 'е', j: 'ж', z: 'з',
  i: 'и', y: 'й', k: 'к', l: 'л', m: 'м', n: 'н', o: 'о', p: 'п', r: 'р',
  s: 'с', t: 'т', u: 'у', f: 'ф', x: 'х', q: 'қ', h: 'ҳ',
};

function normalizeApostrophes(s: string): string {
  return s
    .replace(/[ʼ'`´ʻ’]/g, "'")
    .replace(/oʻ/gi, "o'")
    .replace(/gʻ/gi, "g'");
}

export function cyrillicToLatin(input: string): string {
  const raw = normalizeApostrophes(input);
  let out = '';
  for (const ch of raw) {
    const lower = ch.toLowerCase();
    const mapped = CYR_TO_LAT[lower];
    if (mapped === undefined) {
      out += ch;
      continue;
    }
    if (ch !== lower && mapped.length > 0) {
      out += mapped[0].toUpperCase() + mapped.slice(1);
    } else {
      out += mapped;
    }
  }
  return out;
}

export function latinToCyrillic(input: string): string {
  const raw = normalizeApostrophes(input);
  let i = 0;
  let out = '';
  while (i < raw.length) {
    const rest = raw.slice(i);
    const restLower = rest.toLowerCase();
    let matched = false;
    for (const [lat, cyr] of LAT_TO_CYR_DIGRAPHS) {
      if (restLower.startsWith(lat)) {
        const src = rest.slice(0, lat.length);
        const isUpper = src[0] === src[0].toUpperCase() && /[A-Za-zЎўҒғ]/.test(src[0]);
        out += isUpper ? cyr.toUpperCase() : cyr;
        i += lat.length;
        matched = true;
        break;
      }
    }
    if (matched) continue;
    const ch = raw[i];
    const lower = ch.toLowerCase();
    const mapped = LAT_TO_CYR_SINGLE[lower];
    if (mapped) {
      out += ch !== lower ? mapped.toUpperCase() : mapped;
    } else {
      out += ch;
    }
    i += 1;
  }
  return out;
}

/** Qidiruv uchun variantlar: asl, lotin, kirill (takrorsiz). */
export function searchScriptVariants(query: string): string[] {
  const q = query.trim();
  if (!q) return [];
  const latin = cyrillicToLatin(q);
  const cyrillic = latinToCyrillic(q);
  const set = new Set<string>();
  for (const v of [q, latin, cyrillic]) {
    const t = v.trim();
    if (t.length >= 1) set.add(t);
  }
  return [...set];
}
