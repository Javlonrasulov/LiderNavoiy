export type UserRole = 'admin' | 'manager' | 'distributor' | 'client'

export interface AuthUser {
  id: string
  username: string
  fullName: string
  role: UserRole
  position?: string | null
  permissions?: string[] | null
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: AuthUser
}

export interface AdminKpi {
  sales: number
  payments: number
  debt: number
  plan: number
  planPct: number
  salesTrend?: number
  paymentsTrend?: number
  debtTrend?: number
  planTrend?: number
}

export interface EmployeeLocation {
  distributorId: string
  name: string
  avatar?: string | null
  role: 'agent' | 'delivery'
  online: boolean
  lastSeen?: string | null
  lat: number | null
  lng: number | null
  orgId?: string | null
}

export interface TopAgent {
  distributorId: string
  name: string
  avatar?: string | null
  sales: number
  plan: number
  planPct: number
  orgId?: string | null
  status?: string | null
}

export interface AdminDashboard {
  period?: { year: number; month: number }
  kpi: AdminKpi
  clientCategories: { name: string; value: number; color: string }[]
  topAgents: TopAgent[]
  employeeLocations: EmployeeLocation[]
  salesChart?: {
    day: { month: string; sales: number; payments: number }[]
    week: { month: string; sales: number; payments: number }[]
    month: { month: string; sales: number; payments: number }[]
  }
}

export interface Distributor {
  id: string
  userId?: string
  user?: { fullName?: string; username?: string } | null
  fullName?: string
  name?: string
  companyName?: string | null
  companyId?: string | null
  phone?: string | null
  position?: string | null
  lineCode?: string | null
  status?: string | null
  isOnline?: boolean
  lastLatitude?: number | null
  lastLongitude?: number | null
}

export interface Product {
  id: string
  code: string
  name: string
  category?: string | null
  brand?: string | null
  price: number
  unit?: string | null
  stockBalance?: number | null
  imageUrl?: string | null
  companyId?: string | null
}

export interface Client {
  id: string
  name: string
  code?: string | null
  fullName?: string | null
  phone?: string | null
  address?: string | null
  companyId?: string | null
  lineCode?: string | null
  category?: string | null
  distributorId?: string | null
  latitude?: number | null
  longitude?: number | null
  debt?: number | null
  balance?: number | null
}

export interface PlanRow {
  distributorId: string
  agentName: string
  year: number
  month: number
  totalPlan: number
  totalDone: number
  donePct: number
  categories?: { key: string; name: string; color: string; plan: number; done: number; pct: number }[]
}

export interface CreateClientBody {
  name: string
  fullName?: string
  phone?: string
  address?: string
  companyId?: string
  lineCode?: string
  category?: string
  latitude?: number
  longitude?: number
  contactPerson?: string
}
