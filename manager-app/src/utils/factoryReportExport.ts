import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import ExcelJS from 'exceljs'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

export type ReportFormat = 'xlsx' | 'pdf'

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

const THIN: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: 'FF111111' } }
const BORDER: Partial<ExcelJS.Borders> = {
  top: THIN,
  left: THIN,
  bottom: THIN,
  right: THIN,
}
const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFE8E8EE' },
}
const TOTAL_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF3F4F6' },
}

const LEFT_COLS = [1, 2, 3, 4, 5, 6] as const
const RIGHT_COLS = [8, 9, 10, 11, 12, 13] as const
const GAP_COL = 7

function fmtNum(n: number) {
  return Number(n || 0).toLocaleString('ru-RU')
}

function styleTitle(cell: ExcelJS.Cell) {
  cell.font = { bold: true, size: 13, color: { argb: 'FF111111' } }
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
}

function styleDate(cell: ExcelJS.Cell) {
  cell.font = { size: 10, color: { argb: 'FF555555' } }
  cell.alignment = { horizontal: 'center', vertical: 'middle' }
}

function styleHeader(cell: ExcelJS.Cell) {
  cell.font = { bold: true, size: 10 }
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  cell.fill = HEADER_FILL
  cell.border = BORDER
}

function styleBody(cell: ExcelJS.Cell, align: 'left' | 'center' | 'right' = 'left') {
  cell.font = { size: 10 }
  cell.alignment = { horizontal: align, vertical: 'middle', wrapText: true }
  cell.border = BORDER
  if (align === 'right') {
    cell.numFmt = '#,##0'
  }
}

function styleTotal(cell: ExcelJS.Cell, align: 'left' | 'center' | 'right' = 'right') {
  cell.font = { bold: true, size: 10 }
  cell.alignment = { horizontal: align, vertical: 'middle' }
  cell.fill = TOTAL_FILL
  cell.border = BORDER
  if (align === 'right') cell.numFmt = '#,##0'
}

function writeSideTable(
  sheet: ExcelJS.Worksheet,
  table: ReportTable,
  cols: readonly number[],
  labels: FactoryReportColumns,
) {
  const [cNo, cName, cUnit, cQty, cPrice, cTotal] = cols
  const maxRows = Math.max(table.rows.length, 1)

  sheet.mergeCells(1, cNo, 1, cTotal)
  const titleCell = sheet.getCell(1, cNo)
  titleCell.value = table.title
  styleTitle(titleCell)

  sheet.mergeCells(2, cNo, 2, cTotal)
  const dateCell = sheet.getCell(2, cNo)
  dateCell.value = table.dateLabel
  styleDate(dateCell)

  const headerRow = 4
  const headers = [labels.no, labels.product, labels.unit, labels.qty, labels.price, labels.total]
  headers.forEach((h, i) => {
    const cell = sheet.getCell(headerRow, cols[i])
    cell.value = h
    styleHeader(cell)
  })

  table.rows.forEach((row, idx) => {
    const r = headerRow + 1 + idx
    const values: Array<string | number> = [idx + 1, row.name, row.unit, row.qty, row.price, row.total]
    const aligns: Array<'center' | 'left' | 'right'> = ['center', 'left', 'center', 'right', 'right', 'right']
    values.forEach((v, i) => {
      const cell = sheet.getCell(r, cols[i])
      cell.value = v
      styleBody(cell, aligns[i])
    })
  })

  // empty placeholder border if no rows
  if (table.rows.length === 0) {
    const r = headerRow + 1
    cols.forEach((col, i) => {
      const cell = sheet.getCell(r, col)
      cell.value = i === 1 ? '—' : ''
      styleBody(cell, i === 1 ? 'left' : 'center')
    })
  }

  const totalRow = headerRow + 1 + maxRows
  sheet.mergeCells(totalRow, cNo, totalRow, cPrice)
  const labelCell = sheet.getCell(totalRow, cNo)
  labelCell.value = labels.total
  styleTotal(labelCell, 'right')
  // re-apply border on merged range corners
  for (let col = cNo; col <= cPrice; col++) {
    sheet.getCell(totalRow, col).border = BORDER
    sheet.getCell(totalRow, col).fill = TOTAL_FILL
  }
  const totalCell = sheet.getCell(totalRow, cTotal)
  totalCell.value = table.grandTotal
  styleTotal(totalCell, 'right')

  return totalRow
}

async function buildExcelBytes(payload: FactoryReportPayload): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Lider Manager'
  const sheet = wb.addWorksheet('Hisobot', {
    views: [{ state: 'frozen', ySplit: 4, showGridLines: false }],
    properties: { defaultRowHeight: 18 },
  })

  const widths = [
    { col: 1, w: 5 },
    { col: 2, w: 36 },
    { col: 3, w: 8 },
    { col: 4, w: 12 },
    { col: 5, w: 12 },
    { col: 6, w: 14 },
    { col: GAP_COL, w: 3 },
    { col: 8, w: 5 },
    { col: 9, w: 36 },
    { col: 10, w: 8 },
    { col: 11, w: 12 },
    { col: 12, w: 12 },
    { col: 13, w: 14 },
  ]
  widths.forEach(({ col, w }) => {
    sheet.getColumn(col).width = w
  })

  sheet.getRow(1).height = 24
  sheet.getRow(2).height = 18
  sheet.getRow(4).height = 22

  writeSideTable(sheet, payload.dealer, LEFT_COLS, payload.columns)
  writeSideTable(sheet, payload.shipment, RIGHT_COLS, payload.columns)

  if (payload.subtitle) {
    sheet.getCell(3, 1).value = payload.subtitle
    sheet.getCell(3, 1).font = { size: 9, italic: true, color: { argb: 'FF666666' } }
  }

  const buf = await wb.xlsx.writeBuffer()
  return new Uint8Array(buf as ArrayBuffer)
}

function esc(s: string) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function htmlTable(table: ReportTable, col: FactoryReportColumns) {
  const rows = table.rows.length
    ? table.rows.map((r, i) => `
      <tr>
        <td class="c">${i + 1}</td>
        <td class="l">${esc(r.name)}</td>
        <td class="c">${esc(r.unit)}</td>
        <td class="r">${esc(fmtNum(r.qty))}</td>
        <td class="r">${esc(fmtNum(r.price))}</td>
        <td class="r b">${esc(fmtNum(r.total))}</td>
      </tr>`).join('')
    : `<tr><td class="c"></td><td class="l">—</td><td></td><td></td><td></td><td></td></tr>`

  return `
    <div class="block">
      <div class="title">${esc(table.title)}</div>
      <div class="date">${esc(table.dateLabel)}</div>
      <table>
        <thead>
          <tr>
            <th>${esc(col.no)}</th>
            <th>${esc(col.product)}</th>
            <th>${esc(col.unit)}</th>
            <th>${esc(col.qty)}</th>
            <th>${esc(col.price)}</th>
            <th>${esc(col.total)}</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          <tr class="total">
            <td colspan="5" class="r b">${esc(col.total)}</td>
            <td class="r b">${esc(fmtNum(table.grandTotal))}</td>
          </tr>
        </tbody>
      </table>
    </div>`
}

async function buildPdfBytes(payload: FactoryReportPayload): Promise<Uint8Array> {
  const host = document.createElement('div')
  host.setAttribute('aria-hidden', 'true')
  host.style.cssText = 'position:fixed;left:-12000px;top:0;z-index:-1;background:#fff;'
  host.innerHTML = `
    <div id="factory-report-pdf-root" style="
      width:1500px;padding:20px 24px;background:#fff;color:#111;
      font-family:Arial,'Segoe UI',Tahoma,sans-serif;box-sizing:border-box;
    ">
      <style>
        #factory-report-pdf-root * { box-sizing: border-box; }
        #factory-report-pdf-root .wrap { display:flex; gap:28px; align-items:flex-start; }
        #factory-report-pdf-root .block { flex:1; min-width:0; }
        #factory-report-pdf-root .title { text-align:center; font-size:16px; font-weight:800; margin-bottom:4px; }
        #factory-report-pdf-root .date { text-align:center; font-size:12px; color:#555; margin-bottom:10px; }
        #factory-report-pdf-root table { width:100%; border-collapse:collapse; table-layout:fixed; }
        #factory-report-pdf-root th, #factory-report-pdf-root td {
          border:1px solid #111; padding:6px 8px; font-size:11px; vertical-align:middle;
        }
        #factory-report-pdf-root th { background:#e8e8ee; font-weight:800; text-align:center; }
        #factory-report-pdf-root td.c { text-align:center; }
        #factory-report-pdf-root td.l { text-align:left; word-wrap:break-word; }
        #factory-report-pdf-root td.r { text-align:right; white-space:nowrap; }
        #factory-report-pdf-root td.b { font-weight:800; }
        #factory-report-pdf-root tr.total td { background:#f3f4f6; }
        #factory-report-pdf-root col.c-no { width:36px; }
        #factory-report-pdf-root col.c-name { width:auto; }
        #factory-report-pdf-root col.c-unit { width:52px; }
        #factory-report-pdf-root col.c-qty { width:78px; }
        #factory-report-pdf-root col.c-price { width:86px; }
        #factory-report-pdf-root col.c-total { width:96px; }
        #factory-report-pdf-root .sub { margin-top:14px; text-align:center; font-size:11px; color:#666; }
      </style>
      <div class="wrap">
        ${htmlTable(payload.dealer, payload.columns).replace('<table>', `<table>
          <colgroup>
            <col class="c-no"/><col class="c-name"/><col class="c-unit"/>
            <col class="c-qty"/><col class="c-price"/><col class="c-total"/>
          </colgroup>`)}
        ${htmlTable(payload.shipment, payload.columns).replace('<table>', `<table>
          <colgroup>
            <col class="c-no"/><col class="c-name"/><col class="c-unit"/>
            <col class="c-qty"/><col class="c-price"/><col class="c-total"/>
          </colgroup>`)}
      </div>
      ${payload.subtitle ? `<div class="sub">${esc(payload.subtitle)}</div>` : ''}
    </div>`
  document.body.appendChild(host)

  try {
    const root = host.querySelector('#factory-report-pdf-root') as HTMLElement
    const canvas = await html2canvas(root, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
    })

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()
    const margin = 6
    const usableW = pageW - margin * 2
    const usableH = pageH - margin * 2
    const imgW = usableW
    const imgH = (canvas.height * imgW) / canvas.width

    if (imgH <= usableH) {
      doc.addImage(canvas.toDataURL('image/jpeg', 0.93), 'JPEG', margin, margin, imgW, imgH)
    } else {
      const pageCanvasH = (usableH / imgH) * canvas.height
      let srcY = 0
      let page = 0
      while (srcY < canvas.height - 0.5) {
        const sliceH = Math.min(pageCanvasH, canvas.height - srcY)
        const slice = document.createElement('canvas')
        slice.width = canvas.width
        slice.height = Math.max(1, Math.ceil(sliceH))
        const ctx = slice.getContext('2d')
        if (!ctx) break
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, slice.width, slice.height)
        ctx.drawImage(canvas, 0, srcY, canvas.width, sliceH, 0, 0, canvas.width, sliceH)
        const sliceHmm = (slice.height * imgW) / canvas.width
        if (page > 0) doc.addPage()
        doc.addImage(slice.toDataURL('image/jpeg', 0.93), 'JPEG', margin, margin, imgW, sliceHmm)
        srcY += sliceH
        page += 1
      }
    }

    return new Uint8Array(doc.output('arraybuffer'))
  } finally {
    host.remove()
  }
}

function mimeFor(format: ReportFormat) {
  return format === 'pdf'
    ? 'application/pdf'
    : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
}

function safeFileName(base: string, format: ReportFormat) {
  const clean = base.replace(/[^\w\-а-яА-ЯёЁўқғҳЎҚҒҲ]+/gi, '_').slice(0, 80)
  return `${clean}.${format}`
}

function toBase64(bytes: Uint8Array) {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

async function writeNativeFile(fileName: string, base64: string) {
  const written = await Filesystem.writeFile({
    path: fileName,
    data: base64,
    directory: Directory.Cache,
  })
  return written.uri
}

function downloadBlob(fileName: string, bytes: Uint8Array, mime: string) {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  const blob = new Blob([copy.buffer], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}

async function buildBytes(payload: FactoryReportPayload, format: ReportFormat) {
  return format === 'pdf' ? buildPdfBytes(payload) : buildExcelBytes(payload)
}

export async function downloadFactoryReport(payload: FactoryReportPayload, format: ReportFormat) {
  const fileName = safeFileName(payload.fileBase, format)
  const bytes = await buildBytes(payload, format)
  const mime = mimeFor(format)
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

  downloadBlob(fileName, bytes, mime)
}

export async function shareFactoryReport(payload: FactoryReportPayload, format: ReportFormat) {
  const fileName = safeFileName(payload.fileBase, format)
  const bytes = await buildBytes(payload, format)
  const mime = mimeFor(format)
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
  const blob = new Blob([copy.buffer], { type: mime })
  const file = new File([blob], fileName, { type: mime })
  if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      title,
      text: payload.subtitle || title,
      files: [file],
    })
    return
  }

  downloadBlob(fileName, bytes, mime)
}
