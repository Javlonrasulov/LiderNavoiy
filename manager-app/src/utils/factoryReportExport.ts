import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import * as XLSX from 'xlsx'

export type ReportRow = {
  name: string
  unit: string
  qty: number
  price: number
  total: number
}

export type ReportTable = {
  title: string
  dateLabel: string
  rows: ReportRow[]
  grandTotal: number
}

export type FactoryReportColumns = {
  no: string
  product: string
  unit: string
  qty: string
  price: string
  total: string
}

export type FactoryReportPayload = {
  subtitle?: string
  columns: FactoryReportColumns
  dealer: ReportTable
  shipment: ReportTable
  fileBase: string
}

function tableAoa(table: ReportTable, col: FactoryReportColumns): (string | number)[][] {
  return [
    [table.title],
    [table.dateLabel],
    [],
    [col.no, col.product, col.unit, col.qty, col.price, col.total],
    ...table.rows.map((r, i) => [i + 1, r.name, r.unit, r.qty, r.price, r.total]),
    ['', '', '', '', '', table.grandTotal],
  ]
}

function applyCols(ws: XLSX.WorkSheet) {
  ws['!cols'] = [
    { wch: 5 },
    { wch: 42 },
    { wch: 8 },
    { wch: 12 },
    { wch: 14 },
    { wch: 16 },
  ]
}

function buildWorkbook(payload: FactoryReportPayload) {
  const wb = XLSX.utils.book_new()
  const dealerWs = XLSX.utils.aoa_to_sheet(tableAoa(payload.dealer, payload.columns))
  applyCols(dealerWs)
  XLSX.utils.book_append_sheet(wb, dealerWs, 'Diller')

  const shipWs = XLSX.utils.aoa_to_sheet(tableAoa(payload.shipment, payload.columns))
  applyCols(shipWs)
  XLSX.utils.book_append_sheet(wb, shipWs, 'Zavod')
  return wb
}

function toBase64(bytes: Uint8Array) {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

function safeFileName(base: string) {
  return `${base.replace(/[^\w\-а-яА-ЯёЁўқғҳЎҚҒҲ]+/gi, '_').slice(0, 80)}.xlsx`
}

async function writeNativeFile(fileName: string, base64: string) {
  const written = await Filesystem.writeFile({
    path: fileName,
    data: base64,
    directory: Directory.Cache,
  })
  return written.uri
}

function downloadBlob(fileName: string, bytes: Uint8Array) {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  const blob = new Blob([copy.buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}

function workbookBytes(payload: FactoryReportPayload) {
  const wb = buildWorkbook(payload)
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer
  return new Uint8Array(out)
}

export async function downloadFactoryReport(payload: FactoryReportPayload) {
  const fileName = safeFileName(payload.fileBase)
  const bytes = workbookBytes(payload)

  if (Capacitor.isNativePlatform()) {
    const uri = await writeNativeFile(fileName, toBase64(bytes))
    await Share.share({
      title: payload.dealer.title,
      text: payload.subtitle || payload.dealer.title,
      files: [uri],
      dialogTitle: payload.dealer.title,
    })
    return
  }

  downloadBlob(fileName, bytes)
}

export async function shareFactoryReport(payload: FactoryReportPayload) {
  const fileName = safeFileName(payload.fileBase)
  const bytes = workbookBytes(payload)
  const title = `${payload.dealer.title} / ${payload.shipment.title}`

  if (Capacitor.isNativePlatform()) {
    const uri = await writeNativeFile(fileName, toBase64(bytes))
    await Share.share({
      title,
      text: payload.subtitle || title,
      files: [uri],
      dialogTitle: title,
    })
    return
  }

  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  const blob = new Blob([copy.buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const file = new File([blob], fileName, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      title,
      text: payload.subtitle || title,
      files: [file],
    })
    return
  }

  downloadBlob(fileName, bytes)
}
