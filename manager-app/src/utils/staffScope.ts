import type { AuthUser, Distributor, EmployeeLocation } from '../api/types'

/** Manager org(lar) — API ga yuborish uchun */
export function managerCompanyId(user: AuthUser | null | undefined): string | undefined {
  if (!user) return undefined
  if (user.companyIds?.length) return user.companyIds.join(',')
  return user.companyId || undefined
}

export function managerCompanySet(user: AuthUser | null | undefined): Set<string> | null {
  if (!user) return null
  const ids = [
    ...(user.companyIds ?? []),
    user.companyId,
  ]
    .map(id => id?.trim())
    .filter((id): id is string => !!id)
  if (!ids.length) return null
  return new Set(ids)
}

/** Manager / admin o‘zi va boshqa org xodimlari chiqmasin */
export function filterStaffForManager(
  list: Distributor[],
  user: AuthUser | null | undefined,
): Distributor[] {
  const orgs = managerCompanySet(user)
  return list.filter(d => {
    if (user?.id && (d.userId === user.id || d.user?.id === user.id)) return false
    if (user?.distributorId && d.id === user.distributorId) return false
    const role = (d.user?.role || '').toLowerCase()
    if (role === 'manager' || role === 'admin') return false
    if (orgs && d.companyId && !orgs.has(d.companyId)) return false
    if (orgs && !d.companyId) return false
    return true
  })
}

export function filterEmployeeLocationsForManager(
  locs: EmployeeLocation[],
  user: AuthUser | null | undefined,
): EmployeeLocation[] {
  const orgs = managerCompanySet(user)
  return locs.filter(l => {
    if (user?.distributorId && l.distributorId === user.distributorId) return false
    if (orgs && l.orgId && !orgs.has(l.orgId)) return false
    if (orgs && !l.orgId) return false
    return true
  })
}
