import { UserRole } from './enums';
import { User } from '../auth/entities/user.entity';

/**
 * Bitta manager akkaunti ikki joyga kira oladi:
 *  - web (admin panel): permissions null emas — "Tizim foydalanuvchilari"
 *  - mobil Manager ilovasi: appAccess va (profil bor yoki faqat ilova uchun ochilgan) — "Xodimlar"
 */
export function hasWebAccess(user: Pick<User, 'role' | 'permissions'>): boolean {
  if (user.role === UserRole.ADMIN) return true;
  return user.role === UserRole.MANAGER && user.permissions != null;
}

export function hasAppAccess(
  user: Pick<User, 'role' | 'permissions' | 'appAccess' | 'distributorProfile'>,
): boolean {
  if (user.role !== UserRole.MANAGER) return true;
  if (user.appAccess === false) return false;
  return user.permissions == null || !!user.distributorProfile;
}
