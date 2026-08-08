/** Shared palette for Lider Manager screens — do not invent new colors. */
export function theme(dark: boolean) {
  return {
    bg: dark ? '#080812' : '#F8F9FC',
    text: dark ? '#F0EEFF' : '#0D0D1A',
    card: dark ? '#13132A' : '#FFFFFF',
    muted: dark ? '#1E1E38' : '#F1F2F8',
    mutedText: dark ? '#9E9BC4' : '#6B7280',
    border: dark ? 'rgba(150,130,255,0.12)' : 'rgba(108,92,231,0.08)',
    primary: '#6C5CE7',
    gold: '#E6963C',
    green: '#00C853',
    red: '#F44336',
    hero: 'linear-gradient(135deg, #5B2D8E 0%, #7C4DFF 55%, #E6963C 100%)',
  }
}

export function formatMoney(n: number, lang: string): string {
  const v = Math.round(Number(n) || 0)
  const s = v.toLocaleString('ru-RU')
  if (lang === 'ru') return `${s} сум`
  return `${s} so'm`
}

export function formatPct(n: number): string {
  return `${Math.round(Number(n) || 0)}%`
}

/** Oylik trend: +8% / −3% / 0% */
export function formatTrend(n: number | undefined | null): string {
  const v = Math.round((Number(n) || 0) * 10) / 10
  if (v > 0) return `+${v % 1 === 0 ? Math.round(v) : v}%`
  if (v < 0) return `−${Math.abs(v % 1 === 0 ? Math.round(v) : v)}%`
  return '0%'
}
