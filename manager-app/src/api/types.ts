export type UserRole = 'admin' | 'manager' | 'distributor' | 'client'

export interface AuthUser {
  id: string
  username: string
  fullName: string
  role: UserRole
  position?: string | null
  permissions?: string[] | null
  distributorId?: string
  companyId?: string | null
  companyIds?: string[]
  companyName?: string | null
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
  user?: {
    id?: string
    fullName?: string
    username?: string
    role?: string
    lastLoginAt?: string | null
  } | null
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
  lastLocationAt?: string | Date | null
}

export type PointStatus =
  | 'ordered'
  | 'visited'
  | 'missed'
  | 'remote_ordered'
  | 'client_ordered'

export interface VisitAdminRow {
  id: string
  distributorId: string
  clientId: string
  visitedAt: string
  checkInLatitude: number | null
  checkInLongitude: number | null
  orderTotal: number
  notes: string | null
  status: string
  clientName: string
  clientCode: string
  clientAddress: string | null
  clientLatitude: number | null
  clientLongitude: number | null
  fromClientOrder: boolean
  orderSource?: string | null
}

export interface DailyRouteResponse {
  date: string
  distributorId: string
  pointCount: number
  stats: {
    totalDistanceKm: number
    avgSpeed: number
    maxSpeed: number
    durationMinutes: number
  }
  points: {
    latitude: number
    longitude: number
    speed?: number | null
    accuracy?: number | null
    recordedAt: string
  }[]
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

export interface ProductStats extends Product {
  soldQuantity: number
  soldAmount: number
  orderCount: number
  avgRating: number | null
  ratingCount: number
}

export interface Client {
  id: string
  name: string
  code?: string | null
  fullName?: string | null
  phone?: string | null
  extraPhones?: { phone: string; note?: string }[] | null
  address?: string | null
  /** Ориентр (do‘kon yaqinidagi belgi) */
  territory?: string | null
  photoUrl?: string | null
  companyId?: string | null
  lineCode?: string | null
  category?: string | null
  distributorId?: string | null
  latitude?: number | null
  longitude?: number | null
  orderRadiusMeters?: number | null
  inn?: string | null
  canSeePromotions?: boolean | null
  debt?: number | null
  balance?: number | null
  /** Client request status when awaiting admin approval */
  status?: string | null
}

export type ClientStatsPeriod = 'hafta' | 'oy' | '6oy' | 'custom'

export interface ClientStatsProduct {
  id: string
  name: string
  unit: string
  qty: number
  price: number
  total: number
  trend: number
  buyLevel: 'top' | 'avg' | 'none'
}

export interface ClientStatsCategory {
  id: string
  name: string
  icon: string
  color: string
  totalSum: number
  totalKg: number
  avgPrice: number
  share: number
  trend: number
  weekly: { label: string; value: number }[]
  products: ClientStatsProduct[]
}

export interface ClientStatsResponse {
  clientId: string
  period: string
  from: string
  to: string
  totalSum: number
  totalKg: number
  monthlyTrend: { label: string; year: number; month: number; value: number }[]
  categories: ClientStatsCategory[]
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
  extraPhones?: { phone: string; note?: string }[]
  address?: string
  territory?: string
  photoUrl?: string
  companyId?: string
  lineCode?: string
  category?: string
  latitude?: number
  longitude?: number
  orderRadiusMeters?: number
  inn?: string
  contactPerson?: string
  canSeePromotions?: boolean
}

export type UpdateClientBody = Partial<CreateClientBody>
