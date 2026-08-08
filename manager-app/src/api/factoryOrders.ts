import { api } from './client'

export type GoodsReceiptItem = {
  productId?: string | null
  tovar: string
  artikul?: string | null
  kolFakt: number
  kolBrak: number
  upakovka?: string | null
  tsenaPost: number
  skid?: number
  tsenaPriv?: number
  summa: number
  ves: number
  unit?: string | null
}

export type GoodsReceipt = {
  id: string
  companyId?: string | null
  date: string
  num: string
  ox: boolean
  supplier: string
  org: string
  warehouse: string
  invoice: string
  sum: number
  netto: number
  type: string
  author: string
  items: GoodsReceiptItem[]
  reconciliationStatus?: string | null
  reconciliationId?: string | null
}

export type FactoryOrderItem = {
  productId?: string | null
  name: string
  artikul?: string | null
  orderedQty: number
  orderedUnit: string
  orderedPrice: number
  orderedSum: number
  receivedQty?: number
  missingQty?: number
  missingSum?: number
}

export type FactoryReconciliation = {
  id: string
  receiptId: string
  status: 'draft' | 'done'
  note?: string | null
  items: FactoryOrderItem[]
  totalOrderedQty: number
  totalOrderedSum: number
  totalReceivedQty: number
  totalMissingQty: number
  totalMissingSum: number
  extras?: { name: string; artikul?: string | null; receivedQty: number; summa: number }[]
}

export type MissingStatRow = {
  productId: string | null
  name: string
  artikul: string | null
  timesMissing: number
  totalMissingQty: number
  totalMissingSum: number
  timesOrdered: number
}

export function fetchGoodsReceipts(companyId?: string) {
  const q = new URLSearchParams()
  q.set('ox', 'true')
  if (companyId) q.set('companyId', companyId)
  return api<GoodsReceipt[]>(`goods-receipts?${q.toString()}`)
}

export function fetchGoodsReceipt(id: string) {
  return api<GoodsReceipt>(`goods-receipts/${id}`)
}

export function fetchReconciliation(receiptId: string) {
  return api<FactoryReconciliation | null>(`factory-reconciliations/by-receipt/${receiptId}`)
}

export function saveReconciliation(
  receiptId: string,
  body: {
    companyId?: string
    status?: 'draft' | 'done'
    note?: string
    items: FactoryOrderItem[]
  },
) {
  return api<FactoryReconciliation>(`factory-reconciliations/by-receipt/${receiptId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export function fetchMissingStats(companyId?: string) {
  const q = companyId ? `?companyId=${encodeURIComponent(companyId)}` : ''
  return api<MissingStatRow[]>(`factory-reconciliations/stats${q}`)
}
