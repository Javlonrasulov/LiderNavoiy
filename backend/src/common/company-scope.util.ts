import { ForbiddenException } from '@nestjs/common';
import { UserRole } from './enums';
import { User } from '../auth/entities/user.entity';

/** Query `companyId` (bitta yoki vergul bilan) → massiv */
export function parseCompanyIdQuery(
  queryCompanyId?: string | string[] | null,
): string[] {
  if (queryCompanyId == null) return [];
  const raw = Array.isArray(queryCompanyId)
    ? queryCompanyId
    : String(queryCompanyId).split(',');
  return [
    ...new Set(
      raw
        .map((s) => String(s).trim())
        .filter(Boolean),
    ),
  ];
}

/** Profil dagi ruxsat etilgan org lar */
export function allowedCompanyIds(user: User | null | undefined): string[] {
  if (!user) return [];
  const profile = user.distributorProfile;
  return [
    ...new Set(
      [
        ...(Array.isArray(profile?.companyIds) ? profile.companyIds : []),
        profile?.companyId,
      ]
        .map((id) => id?.trim())
        .filter((id): id is string => !!id),
    ),
  ];
}

/**
 * Admin: query bo‘sh → undefined (barcha org).
 * Manager: doim allow-list; query faqat toraytiradi; org yo‘q → [].
 * Boshqalar: query yoki undefined.
 */
export function resolveCompanyIds(
  user: User,
  queryCompanyId?: string | string[] | null,
): string[] | undefined {
  const fromQuery = parseCompanyIdQuery(queryCompanyId);

  if (user.role === UserRole.ADMIN) {
    return fromQuery.length ? fromQuery : undefined;
  }

  if (user.role === UserRole.MANAGER) {
    const allowed = allowedCompanyIds(user);
    if (!allowed.length) return [];
    if (fromQuery.length) {
      return fromQuery.filter((id) => allowed.includes(id));
    }
    return allowed;
  }

  if (user.role === UserRole.DISTRIBUTOR) {
    const allowed = allowedCompanyIds(user);
    if (fromQuery.length) {
      if (!allowed.length) return fromQuery;
      return fromQuery.filter((id) => allowed.includes(id));
    }
    return allowed.length ? allowed : undefined;
  }

  return fromQuery.length ? fromQuery : undefined;
}

/** Products va shunga o‘xshash: string | string[] | null (null = filtr yo‘q) */
export function resolveCompanyScope(
  user: User,
  queryCompanyId?: string | string[] | null,
): string | string[] | null {
  const ids = resolveCompanyIds(user, queryCompanyId);
  if (user.role === UserRole.MANAGER) {
    if (!ids || ids.length === 0) return [];
    return ids.length === 1 ? ids[0] : ids;
  }
  if (!ids || ids.length === 0) return null;
  return ids.length === 1 ? ids[0] : ids;
}

/**
 * Manager faqat o‘z org entity sini ko‘ra/o‘zgartira oladi.
 * Admin va boshqa rollar — o‘tkazib yuboriladi.
 * companyId yo‘q yoki ruxsat yo‘q → Forbidden.
 */
export function assertManagerCompanyAccess(
  user: User | null | undefined,
  entityCompanyId: string | null | undefined,
): void {
  if (!user || user.role !== UserRole.MANAGER) return;
  const allowed = allowedCompanyIds(user);
  const cid = entityCompanyId?.trim();
  if (!allowed.length || !cid || !allowed.includes(cid)) {
    throw new ForbiddenException('Boshqa tashkilot maʼlumoti');
  }
}

/**
 * Yozish (create/update) uchun bitta companyId.
 * Manager: DTO faqat allow-list ichida; bo‘sh → primary allowed.
 * Admin: DTO yoki undefined.
 */
export function resolveWritableCompanyId(
  user: User,
  dtoCompanyId?: string | null,
): string | undefined {
  if (user.role === UserRole.MANAGER) {
    const ids = resolveCompanyIds(user, dtoCompanyId);
    if (!ids?.length) {
      throw new ForbiddenException('Tashkilot biriktirilmagan');
    }
    // Agar DTO berilgan bo‘lsa va allow ichida — shu; aks holda birinchi allowed
    const fromDto = dtoCompanyId?.trim();
    if (fromDto && ids.includes(fromDto)) return fromDto;
    return ids[0];
  }

  if (user.role === UserRole.ADMIN) {
    return dtoCompanyId?.trim() || undefined;
  }

  if (user.role === UserRole.DISTRIBUTOR) {
    const allowed = allowedCompanyIds(user);
    const fromDto = dtoCompanyId?.trim();
    if (fromDto) {
      if (allowed.length && !allowed.includes(fromDto)) {
        throw new ForbiddenException('Boshqa tashkilot maʼlumoti');
      }
      return fromDto;
    }
    return allowed[0];
  }

  return dtoCompanyId?.trim() || undefined;
}

/** Manager uchun entity company ruxsatini tekshiradi (boolean) */
export function managerCanAccessCompany(
  user: User | null | undefined,
  entityCompanyId: string | null | undefined,
): boolean {
  if (!user) return false;
  if (user.role === UserRole.ADMIN) return true;
  if (user.role !== UserRole.MANAGER) return true;
  const allowed = allowedCompanyIds(user);
  const cid = entityCompanyId?.trim();
  return !!allowed.length && !!cid && allowed.includes(cid);
}
