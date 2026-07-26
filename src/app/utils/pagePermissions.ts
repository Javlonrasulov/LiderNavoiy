/** Admin panel sahifalari — huquqlar ro'yxati */
export const PAGE_PERMISSIONS = [
  { id: 'dashboard',  labelKey: 'permDashboard',  fallback: 'Boshqaruv paneli' },
  { id: 'products',   labelKey: 'permProducts',   fallback: 'Mahsulotlar' },
  { id: 'clients',    labelKey: 'permClients',    fallback: 'Mijozlar' },
  { id: 'liniya',     labelKey: 'permLiniya',     fallback: 'Liniya' },
  { id: 'xodimlar',   labelKey: 'permXodimlar',   fallback: 'Xodimlar' },
  { id: 'reports',    labelKey: 'permReports',    fallback: 'Hisobotlar' },
  { id: 'zatrati',    labelKey: 'permZatrati',    fallback: 'Xarajatlar' },
  { id: 'postavchik', labelKey: 'permPostavchik', fallback: 'Yetkazib beruvchilar' },
  { id: 'messages',   labelKey: 'permMessages',   fallback: 'Xabarlar' },
  { id: 'tarozi',     labelKey: 'permTarozi',     fallback: 'Tarozi' },
  { id: 'unpreparedOrders', labelKey: 'permUnpreparedOrders', fallback: 'Tayyorlanmagan buyurtmalar' },
  { id: 'prodaji',    labelKey: 'permProdaji',    fallback: 'Prodaji' },
  { id: 'ombor',      labelKey: 'permOmbor',      fallback: 'Ombor' },
  { id: 'systemUsers', labelKey: 'permSystemUsers', fallback: 'Tizim foydalanuvchilari' },
] as const;

export type PagePermissionId = typeof PAGE_PERMISSIONS[number]['id'];

export const DEFAULT_POSITIONS = [
  'Admin',
  'Operator',
  'Menejer',
  'Direktor',
  'Buxgalter',
  'Kassir',
  'Omborchi',
];

export const PROTECTED_POSITIONS = ['Admin', 'Direktor', 'Bosh administrator'];

export function getCustomRoles(): string[] {
  try {
    const raw = localStorage.getItem('admin_custom_roles');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCustomRoles(roles: string[]): void {
  localStorage.setItem('admin_custom_roles', JSON.stringify(roles));
}

export function getAllPositions(): string[] {
  const custom = getCustomRoles();
  const combined = [...DEFAULT_POSITIONS, ...custom];
  return [...new Set(combined)];
}

export function hasPageAccess(
  role: string,
  permissions: string[] | null | undefined,
  tabId: string,
): boolean {
  if (role === 'admin') return true;
  if (!permissions || permissions.length === 0) return false;
  if (permissions.includes(tabId)) return true;
  // dona org: unprepared orders replaces tarozi — same permission gate
  if (tabId === 'unpreparedOrders' && permissions.includes('tarozi')) return true;
  return false;
}

export function permissionLabels(
  permissions: string[],
  t: Record<string, string>,
): string {
  if (!permissions.length) return '';
  return permissions
    .map((id) => {
      const p = PAGE_PERMISSIONS.find((x) => x.id === id);
      return p ? (t[p.labelKey] ?? p.fallback) : id;
    })
    .join(', ');
}
