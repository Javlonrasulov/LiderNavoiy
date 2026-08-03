/** API server manzili (static /uploads uchun) */
export function getApiOrigin(): string {
  const base = import.meta.env.VITE_API_URL || '/api/v1';
  const origin = base.replace(/\/api\/v\d+\/?$/, '');
  if (origin) return origin;
  if (typeof window !== 'undefined') return window.location.origin;
  return 'http://localhost:3000';
}

/** Mahsulot rasmi URL — DB dagi path yoki base64 ni ko'rsatish uchun */
export function resolveProductImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${getApiOrigin()}${path}`;
}

/** Saqlash uchun: full URL ni qisqa path ga aylantiradi */
export function normalizeProductImageForSave(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('data:')) return url;
  const match = url.match(/\/uploads\/products\/[^?#]+/);
  if (match) return match[0];
  if (url.startsWith('/uploads/')) return url;
  return url;
}
