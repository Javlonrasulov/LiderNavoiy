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

export function fetchClients(companyId?: string) {
  const q = companyId ? `?companyId=${encodeURIComponent(companyId)}` : ''
  return api<Client[]>(`clients${q}`)
}

export function createClient(body: CreateClientBody) {
  return api<Client>('clients', { method: 'POST', body: JSON.stringify(body) })
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
