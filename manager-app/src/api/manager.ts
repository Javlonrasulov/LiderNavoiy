import { api } from './client'
import type {
  AdminDashboard,
  Client,
  CreateClientBody,
  Distributor,
  PlanRow,
  Product,
} from './types'

export function fetchAdminDashboard(companyId?: string) {
  const q = companyId ? `?companyId=${encodeURIComponent(companyId)}` : ''
  return api<AdminDashboard>(`dashboard/admin${q}`)
}

export function fetchDistributors(companyId?: string) {
  const q = companyId ? `?companyId=${encodeURIComponent(companyId)}` : ''
  return api<Distributor[]>(`distributors${q}`)
}

export function fetchProducts(companyId?: string) {
  const q = companyId ? `?companyId=${encodeURIComponent(companyId)}` : ''
  return api<Product[]>(`products${q}`)
}

export function fetchProductCategories(companyId?: string) {
  const q = companyId ? `?companyId=${encodeURIComponent(companyId)}` : ''
  return api<{ category: string }[]>(`products/categories${q}`)
}

export function fetchClients(companyId?: string) {
  const q = companyId ? `?companyId=${encodeURIComponent(companyId)}` : ''
  return api<Client[]>(`clients${q}`)
}

export function createClient(body: CreateClientBody) {
  return api<Client>('clients', { method: 'POST', body: JSON.stringify(body) })
}

export type SalesLine = {
  id: string
  code: string
  name: string
  agentName?: string | null
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

export function fetchPlans(year?: number, month?: number) {
  const now = new Date()
  const y = year ?? now.getFullYear()
  const m = month ?? now.getMonth() + 1
  return api<PlanRow[]>(`plans?year=${y}&month=${m}`)
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
export function fetchClientOrders(status: string = 'pending') {
  const q = `?status=${encodeURIComponent(status)}`
  return api<ClientOrderRow[]>(`orders/client-pending${q}`)
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


