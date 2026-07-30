/**
 * Ko'rsatish uchun sana formati: DD-MM-YYYY (masalan: 29-07-2026)
 * API / input uchun YYYY-MM-DD saqlanadi.
 */

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

/** YYYY-MM-DD yoki ISO → DD-MM-YYYY */
export function formatDisplayDate(input: string | Date | null | undefined): string {
  if (input == null || input === '') return '';

  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) return '';
    return `${pad2(input.getDate())}-${pad2(input.getMonth() + 1)}-${input.getFullYear()}`;
  }

  const s = String(input).trim();
  // YYYY-MM-DD (+ optional time)
  const ymd = /^(\d{4})-(\d{2})-(\d{2})(.*)$/.exec(s);
  if (ymd) {
    const rest = ymd[4] ?? '';
    if (rest.startsWith('T') || /^\s+\d/.test(rest)) {
      return formatDisplayDateTime(s) || `${ymd[3]}-${ymd[2]}-${ymd[1]}`;
    }
    return `${ymd[3]}-${ymd[2]}-${ymd[1]}`;
  }

  // DD.MM.YYYY / DD-MM-YYYY (+ optional time)
  const dmy = /^(\d{2})[./-](\d{2})[./-](\d{4})(.*)$/.exec(s);
  if (dmy) return `${dmy[1]}-${dmy[2]}-${dmy[3]}${dmy[4] ?? ''}`;

  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()}`;
}

/** Date → DD-MM-YYYY (lokal kun) */
export function formatDisplayDateFromDate(d: Date): string {
  if (Number.isNaN(d.getTime())) return '';
  return `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()}`;
}

/** ISO datetime → DD-MM-YYYY HH:mm (Toshkent) */
export function formatDisplayDateTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const date = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' }); // YYYY-MM-DD
  const time = d.toLocaleTimeString('en-GB', {
    timeZone: 'Asia/Tashkent',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${formatDisplayDate(date)} ${time}`;
}
