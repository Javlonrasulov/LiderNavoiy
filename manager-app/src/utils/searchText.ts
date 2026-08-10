/** O‘zbek kirill ↔ lotin qidiruv uchun normalizatsiya */

const CYR_TO_LAT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'j', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'x', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sh',
  ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  ғ: 'g', қ: 'q', ҳ: 'h', ў: 'o', ӯ: 'u',
}

/**
 * Matnni qidiruv kalitiga aylantiradi:
 * kirill → lotin, o'/g' soddalashtiriladi, kichik harf.
 * Shunda "Сами" va "Sami" bir xil kalit beradi.
 */
export function searchKey(raw?: string | null): string {
  let s = (raw || '').toLowerCase().normalize('NFC')
  s = s.replace(/[ʼ'`´ʻʼ]/g, "'")
  s = s.replace(/o['ʻ']/g, 'o').replace(/g['ʻ']/g, 'g')

  let out = ''
  for (const ch of s) {
    out += CYR_TO_LAT[ch] ?? ch
  }

  return out
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9+\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Lotin yoki kirill so‘rov bilan matnni topish */
export function textMatchesSearch(haystack: string, needle: string): boolean {
  const n = searchKey(needle)
  if (!n) return true
  return searchKey(haystack).includes(n)
}
