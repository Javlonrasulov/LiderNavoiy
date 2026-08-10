import { api, getAccessToken } from './client'
import { API_BASE_URL } from './config'
import type {
  AdminDashboard,
  Client,
  ClientStatsPeriod,
  ClientStatsResponse,
  CreateClientBody,
  UpdateClientBody,
  DailyRouteResponse,
  Distributor,
  PlanRow,
  Product,
  ProductStats,
  VisitAdminRow,
} from './types'

/** Rel `/uploads/...` → absolute URL for preview */
export function resolveMediaUrl(path?: string | null): string {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path
  const origin = API_BASE_URL.replace(/\/api\/v\d+\/?$/, '').replace(/\/$/, '')
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`
}

export async function uploadClientPhoto(file: Blob, filename = 'photo.jpg'): Promise<string> {
  const form = new FormData()
  form.append('file', file, filename)
  const token = getAccessToken()
  const url = `${API_BASE_URL}clients/upload-photo`
  // Content-Type qo‘ymang — boundary avtomatik qo‘yiladi (CapacitorHttp FormData uchun muhim)
  const res = await fetch(url, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    const msg = Array.isArray(err?.message) ? err.message.join(', ') : (err?.message || `HTTP ${res.status}`)
    throw new Error(typeof msg === 'string' ? msg : `HTTP ${res.status}`)
  }
  const data = (await res.json()) as { url?: string; fullUrl?: string }
  if (!data.url) throw new Error('Upload failed')
  return data.url
}

export function fetchAdminDashboard(companyId?: string) {
  const q = companyId ? `?companyId=${encodeURIComponent(companyId)}` : ''
  return api<AdminDashboard>(`dashboard/admin${q}`)
}

export function fetchDistributors(companyId?: string) {
  const q = companyId ? `?companyId=${encodeURIComponent(companyId)}` : ''
  return api<Distributor[]>(`distributors${q}`)
}

/** Admin bilan bir xil: kunlik tashriflar (telefon / ilova zakazlari ham) */
export function fetchVisitsForDistributor(distributorId: string, date: string) {
  return api<VisitAdminRow[]>(
    `visits/admin?distributorId=${encodeURIComponent(distributorId)}&date=${encodeURIComponent(date)}`,
  )
}

export function fetchDailyRoute(distributorId: string, date: string) {
  return api<DailyRouteResponse>(
    `routes/${encodeURIComponent(distributorId)}/daily?date=${encodeURIComponent(date)}`,
  )
}

export function fetchProducts(companyId?: string) {
  const q = companyId ? `?companyId=${encodeURIComponent(companyId)}` : ''
  return api<Product[]>(`products${q}`)
}

export function fetchTopProducts(companyId?: string, limit = 30) {
  const params = new URLSearchParams()
  if (companyId) params.set('companyId', companyId)
  params.set('limit', String(limit))
  return api<ProductStats[]>(`products/top?${params.toString()}`)
}

export function fetchProductStats(productId: string, companyId?: string) {
  const q = companyId ? `?companyId=${encodeURIComponent(companyId)}` : ''
  return api<ProductStats>(`products/${productId}/stats${q}`)
}

export function fetchProductCategories(companyId?: string) {
  const q = companyId ? `?companyId=${encodeURIComponent(companyId)}` : ''
  return api<{ category: string }[]>(`products/categories${q}`)
}

export function fetchClients(companyId?: string) {
  const q = companyId ? `?companyId=${encodeURIComponent(companyId)}` : ''
  return api<Client[]>(`clients${q}`)
}

/** Admin mijozlar-statistika bilan bir xil endpoint */
export function fetchClientStats(
  clientId: string,
  params?: { period?: ClientStatsPeriod; from?: string; to?: string },
) {
  const q = new URLSearchParams()
  if (params?.period) q.set('period', params.period)
  if (params?.from) q.set('from', params.from)
  if (params?.to) q.set('to', params.to)
  const qs = q.toString()
  return api<ClientStatsResponse>(`clients/${clientId}/stats${qs ? `?${qs}` : ''}`)
}

export function createClient(body: CreateClientBody) {
  return api<Client>('clients', { method: 'POST', body: JSON.stringify(body) })
}

export function fetchClient(id: string) {
  return api<Client>(`clients/${encodeURIComponent(id)}`)
}

export function updateClient(id: string, body: UpdateClientBody) {
  return api<Client>(`clients/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export type SalesLine = {
  id: string
  code: string
  name: string
  agentName?: string | null
  deliveryName?: string | null
  agentVisitDays?: number[] | null
  deliveryVisitDays?: number[] | null
  visitDays?: number[] | null
  clientCount?: number
  companyId?: string | null
}

export function fetchLines(companyId?: string) {
  const q = companyId ? `?companyId=${encodeURIComponent(companyId)}` : ''
  return api<SalesLine[]>(`lines${q}`)
}

export function createLine(body: {
  code: string
  name: string
  companyId?: string
  agentName?: string
}) {
  return api<SalesLine>('lines', { method: 'POST', body: JSON.stringify(body) })
}

export function updateLine(id: string, body: { name?: string; code?: string; agentName?: string }) {
  return api<SalesLine>(`lines/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export type ClientCategory = {
  id: string
  name: string
  companyId?: string | null
}

export function fetchClientCategories(companyId?: string) {
  const q = companyId ? `?companyId=${encodeURIComponent(companyId)}` : ''
  return api<ClientCategory[]>(`client-categories${q}`)
}

export function createClientCategory(body: { name: string; companyId?: string }) {
  return api<ClientCategory>('client-categories', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function updateClientCategory(id: string, body: { name: string }) {
  return api<ClientCategory>(`client-categories/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export type ClientRequestStatus = 'pending' | 'approved' | 'rejected'

export type ClientRequestRow = {
  id: string
  status: ClientRequestStatus
  requestType?: 'create' | 'update'
  targetClientId?: string | null
  name: string
  fullName?: string | null
  phone?: string | null
  address?: string | null
  territory?: string | null
  photoUrl?: string | null
  lineCode?: string | null
  category?: string | null
  inn?: string | null
  latitude?: number | null
  longitude?: number | null
  canSeePromotions?: boolean | null
  agentName?: string | null
  reviewedBy?: string | null
  reviewedAt?: string | null
  createdAt: string
  companyId?: string | null
}

export function fetchClientRequests(
  params?: { companyId?: string; status?: ClientRequestStatus | 'all' },
) {
  const q = new URLSearchParams()
  if (params?.companyId) q.set('companyId', params.companyId)
  if (params?.status) q.set('status', params.status)
  const qs = q.toString()
  return api<ClientRequestRow[]>(`client-requests${qs ? `?${qs}` : ''}`)
}

export function deleteClientRequest(id: string) {
  return api<{ ok: boolean }>(`client-requests/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

export function resubmitClientRequest(
  id: string,
  body: {
    name: string
    fullName?: string
    phone?: string
    address?: string
    territory?: string
    photoUrl?: string
    companyId?: string
    lineCode?: string
    category?: string
    inn?: string
    latitude?: number
    longitude?: number
    canSeePromotions?: boolean
  },
) {
  return api<ClientRequestRow | Client>(`client-requests/${encodeURIComponent(id)}/resubmit`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function clientFromRequest(req: ClientRequestRow): Client {
  return {
    id: req.targetClientId || req.id,
    name: req.name,
    fullName: req.fullName,
    phone: req.phone,
    address: req.address,
    territory: req.territory,
    photoUrl: req.photoUrl,
    lineCode: req.lineCode,
    category: req.category,
    inn: req.inn,
    latitude: req.latitude,
    longitude: req.longitude,
    companyId: req.companyId,
    canSeePromotions: req.canSeePromotions === true,
  }
}

export function fetchPlans(year?: number, month?: number, companyId?: string) {
  const now = new Date()
  const y = year ?? now.getFullYear()
  const m = month ?? now.getMonth() + 1
  const q = new URLSearchParams({ year: String(y), month: String(m) })
  if (companyId) q.set('companyId', companyId)
  return api<PlanRow[]>(`plans?${q.toString()}`)
}

export function fetchCompanies() {
  return api<{ id: string; name: string }[]>('companies')
}

export type ClientOrderRow = {
  id: string
  clientId: string
  distributorId: string
  status: string
  source: string
  totalAmount: number
  items: {
    productId: string
    productCode?: string
    productName: string
    quantity: number
    price: number
    unit?: string
  }[]
  isUrgent?: boolean
  createdAt: string
  updatedAt: string
  waitingMinutes: number
  stale: boolean
  clientName: string
  clientCode?: string
  clientAddress?: string | null
  clientPhone?: string | null
  agentName: string
  agentCompanyId?: string | null
}

/** Manager: agentlarga kelgan pending klient buyurtmalari */
export function fetchClientOrders(status: string = 'pending', companyId?: string) {
  const q = new URLSearchParams({ status })
  if (companyId) q.set('companyId', companyId)
  return api<ClientOrderRow[]>(`orders/client-pending?${q.toString()}`)
}

export function sendClientOrderToWarehouse(orderId: string, isUrgent = false) {
  return api<unknown>(`orders/${orderId}/send-to-warehouse`, {
    method: 'PATCH',
    body: JSON.stringify({ isUrgent }),
  })
}

export function rejectClientOrder(orderId: string) {
  return api<unknown>(`orders/${orderId}/reject`, { method: 'PATCH' })
}

export function updateClientOrderItems(
  orderId: string,
  items: ClientOrderRow['items'],
) {
  return api<ClientOrderRow>(`orders/${orderId}/items`, {
    method: 'PATCH',
    body: JSON.stringify({ items }),
  })
}


