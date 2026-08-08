import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { ArrowLeft, BarChart3, Check, Download, FileText, Package, Plus, Share2, Trash2, X } from '../icons'
import {
  fetchGoodsReceipt,
  fetchGoodsReceipts,
  fetchMissingStats,
  fetchReconciliation,
  saveReconciliation,
  type FactoryOrderItem,
  type GoodsReceipt,
  type MissingStatRow,
} from '../api/factoryOrders'
import { fetchProducts } from '../api/manager'
import type { Product } from '../api/types'
import type { Lang, Translations } from '../i18n'
import { formatMoney, theme } from '../theme'
import { showToast } from '../components/Toast'
import { getStoredUser } from '../api/client'
import { pushBackHandler } from '../utils/hardwareBack'
import {
  downloadFactoryReport,
  shareFactoryReport,
  type FactoryReportPayload,
  type ReportRow,
} from '../utils/factoryReportExport'

interface Props {
  dark: boolean
  lang: Lang
  tr: Translations
  onBack: () => void
}

type Tab = 'list' | 'stats' | 'reports'
type DraftLine = {
  key: string
  productId?: string
  name: string
  artikul?: string
  orderedQty: string
  orderedUnit: string
  orderedPrice: string
}

function receivedQty(it: { kolFakt: number; kolBrak: number }) {
  return Math.max(0, Number(it.kolFakt || 0) - Number(it.kolBrak || 0))
}

function fmtNum(n: number) {
  return Number(n || 0).toLocaleString('ru-RU')
}

export default function FactoryOrdersScreen({ dark, lang, tr, onBack }: Props) {
  const c = theme(dark)
  const companyId = getStoredUser()?.companyId || undefined
  const [tab, setTab] = useState<Tab>('list')
  const [loading, setLoading] = useState(true)
  const [receipts, setReceipts] = useState<GoodsReceipt[]>([])
  const [stats, setStats] = useState<MissingStatRow[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [receipt, setReceipt] = useState<GoodsReceipt | null>(null)
  const [draft, setDraft] = useState<DraftLine[]>([])
  const [saving, setSaving] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerQ, setPickerQ] = useState('')
  const [compare, setCompare] = useState<{
    items: FactoryOrderItem[]
    totalOrderedQty: number
    totalOrderedSum: number
    totalReceivedQty: number
    totalMissingQty: number
    totalMissingSum: number
    extras: { name: string; receivedQty: number; summa: number }[]
  } | null>(null)
  const [reportId, setReportId] = useState<string | null>(null)
  const [reportReceipt, setReportReceipt] = useState<GoodsReceipt | null>(null)
  const [reportDealerRows, setReportDealerRows] = useState<ReportRow[]>([])
  const [reportLoading, setReportLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  const loadList = async () => {
    setLoading(true)
    try {
      const [rows, st] = await Promise.all([
        fetchGoodsReceipts(companyId),
        fetchMissingStats(companyId),
      ])
      setReceipts(rows)
      setStats(st)
    } catch {
      showToast(tr.factoryLoadError)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadList()
  }, [companyId])

  useEffect(() => {
    return pushBackHandler(() => {
      if (pickerOpen) {
        setPickerOpen(false)
        return true
      }
      if (selectedId) {
        setSelectedId(null)
        setReceipt(null)
        return true
      }
      return false
    })
  }, [selectedId, pickerOpen])

  const openDetail = async (id: string) => {
    setSelectedId(id)
    setDetailLoading(true)
    setCompare(null)
    try {
      const [r, recon, prods] = await Promise.all([
        fetchGoodsReceipt(id),
        fetchReconciliation(id).catch(() => null),
        products.length ? Promise.resolve(products) : fetchProducts(companyId),
      ])
      setReceipt(r)
      setProducts(prods)
      if (recon?.items?.length) {
        setDraft(
          recon.items.map((it, i) => ({
            key: `${it.productId || it.name}-${i}`,
            productId: it.productId || undefined,
            name: it.name,
            artikul: it.artikul || undefined,
            orderedQty: String(it.orderedQty ?? ''),
            orderedUnit: it.orderedUnit || (it.name ? 'pcs' : 'pcs'),
            orderedPrice: String(it.orderedPrice ?? ''),
          })),
        )
        setCompare({
          items: recon.items,
          totalOrderedQty: Number(recon.totalOrderedQty) || 0,
          totalOrderedSum: Number(recon.totalOrderedSum) || 0,
          totalReceivedQty: Number(recon.totalReceivedQty) || 0,
          totalMissingQty: Number(recon.totalMissingQty) || 0,
          totalMissingSum: Number(recon.totalMissingSum) || 0,
          extras: recon.extras || [],
        })
      } else {
        setDraft([])
      }
    } catch {
      showToast(tr.factoryLoadError)
      setSelectedId(null)
    } finally {
      setDetailLoading(false)
    }
  }

  const filteredProducts = useMemo(() => {
    const q = pickerQ.trim().toLowerCase()
    if (!q) return products.slice(0, 80)
    return products
      .filter(
        p =>
          p.name.toLowerCase().includes(q) ||
          (p.code || '').toLowerCase().includes(q) ||
          (p.brand || '').toLowerCase().includes(q),
      )
      .slice(0, 80)
  }, [products, pickerQ])

  const addProduct = (p: Product) => {
    setDraft(prev => [
      ...prev,
      {
        key: `${p.id}-${Date.now()}`,
        productId: p.id,
        name: p.name,
        artikul: p.code,
        orderedQty: '1',
        orderedUnit: p.unit || 'pcs',
        orderedPrice: String(p.price ?? 0),
      },
    ])
    setPickerOpen(false)
    setPickerQ('')
  }

  const toItems = (): FactoryOrderItem[] =>
    draft
      .map(d => {
        const qty = Number(d.orderedQty) || 0
        const price = Number(d.orderedPrice) || 0
        return {
          productId: d.productId,
          name: d.name,
          artikul: d.artikul,
          orderedQty: qty,
          orderedUnit: d.orderedUnit || 'pcs',
          orderedPrice: price,
          orderedSum: qty * price,
        }
      })
      .filter(i => i.orderedQty > 0 && i.name.trim())

  const handleSave = async () => {
    if (!selectedId) return
    const items = toItems()
    if (items.length === 0) {
      showToast(tr.factoryNeedItems)
      return
    }
    setSaving(true)
    try {
      const saved = await saveReconciliation(selectedId, {
        companyId,
        status: 'done',
        items,
      })
      setCompare({
        items: saved.items,
        totalOrderedQty: Number(saved.totalOrderedQty) || 0,
        totalOrderedSum: Number(saved.totalOrderedSum) || 0,
        totalReceivedQty: Number(saved.totalReceivedQty) || 0,
        totalMissingQty: Number(saved.totalMissingQty) || 0,
        totalMissingSum: Number(saved.totalMissingSum) || 0,
        extras: saved.extras || [],
      })
      showToast(tr.factorySaved)
      void loadList()
    } catch {
      showToast(tr.factorySaveError)
    } finally {
      setSaving(false)
    }
  }

  const openReport = async (id: string) => {
    setReportId(id)
    setReportLoading(true)
    setReportReceipt(null)
    setReportDealerRows([])
    try {
      const [r, recon] = await Promise.all([
        fetchGoodsReceipt(id),
        fetchReconciliation(id).catch(() => null),
      ])
      setReportReceipt(r)
      const dealer: ReportRow[] = (recon?.items || [])
        .filter(it => Number(it.orderedQty) > 0)
        .map(it => ({
          name: it.name,
          unit: it.orderedUnit || 'шт',
          qty: Number(it.orderedQty) || 0,
          price: Number(it.orderedPrice) || 0,
          total: Number(it.orderedSum) || (Number(it.orderedQty) || 0) * (Number(it.orderedPrice) || 0),
        }))
      setReportDealerRows(dealer)
    } catch {
      showToast(tr.factoryLoadError)
      setReportId(null)
    } finally {
      setReportLoading(false)
    }
  }

  const shipmentRows: ReportRow[] = useMemo(() => {
    if (!reportReceipt) return []
    return (reportReceipt.items || []).map(it => {
      const qty = receivedQty(it)
      const price = Number(it.tsenaPost) || 0
      const total = Number(it.summa) || qty * price
      return {
        name: it.tovar,
        unit: it.unit || 'шт',
        qty,
        price,
        total,
      }
    })
  }, [reportReceipt])

  const dealerTotal = reportDealerRows.reduce((s, r) => s + (Number(r.total) || 0), 0)
  const shipmentTotal = shipmentRows.reduce((s, r) => s + (Number(r.total) || 0), 0)

  const buildReportPayload = (): FactoryReportPayload | null => {
    if (!reportReceipt) return null
    const dealerName = [reportReceipt.org, reportReceipt.supplier].filter(Boolean).join(' ') || reportReceipt.supplier
    return {
      subtitle: `№ ${reportReceipt.num} · ${reportReceipt.supplier}`,
      columns: {
        no: tr.factoryColNo,
        product: tr.factoryColProduct,
        unit: tr.factoryColUnit,
        qty: tr.factoryColQty,
        price: tr.factoryColPrice,
        total: tr.factoryColTotal,
      },
      dealer: {
        title: `${tr.factoryReportDealerTitle} ${dealerName}`.trim(),
        dateLabel: reportReceipt.date,
        rows: reportDealerRows,
        grandTotal: dealerTotal,
      },
      shipment: {
        title: tr.factoryReportShipmentTitle,
        dateLabel: reportReceipt.date,
        rows: shipmentRows,
        grandTotal: shipmentTotal,
      },
      fileBase: `hisobot_${reportReceipt.num}_${reportReceipt.date}`,
    }
  }

  const handleExport = async (mode: 'download' | 'share') => {
    const payload = buildReportPayload()
    if (!payload || (payload.dealer.rows.length === 0 && payload.shipment.rows.length === 0)) {
      showToast(tr.factoryReportEmpty)
      return
    }
    setExporting(true)
    try {
      if (mode === 'share') await shareFactoryReport(payload)
      else await downloadFactoryReport(payload)
      showToast(tr.factoryReportExported)
    } catch {
      showToast(tr.factoryReportExportError)
    } finally {
      setExporting(false)
    }
  }

  const renderReportTable = (
    title: string,
    dateLabel: string,
    rows: ReportRow[],
    grandTotal: number,
    thStyle: CSSProperties,
    tdStyle: CSSProperties,
  ) => (
    <div style={{
      flex: '0 0 auto',
      width: 'min(92vw, 520px)',
      background: c.card,
      borderRadius: 12,
      border: `1px solid ${c.border}`,
      padding: 10,
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <p style={{ fontSize: 14, fontWeight: 800, color: c.text, margin: 0 }}>{title}</p>
        <p style={{ fontSize: 11, color: c.mutedText, margin: '4px 0 0' }}>{dateLabel}</p>
      </div>
      {rows.length === 0 ? (
        <p style={{ color: c.mutedText, fontSize: 13, margin: 0 }}>{tr.factoryReportEmpty}</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 460, borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>{tr.factoryColNo}</th>
                <th style={{ ...thStyle, textAlign: 'left' }}>{tr.factoryColProduct}</th>
                <th style={thStyle}>{tr.factoryColUnit}</th>
                <th style={thStyle}>{tr.factoryColQty}</th>
                <th style={thStyle}>{tr.factoryColPrice}</th>
                <th style={thStyle}>{tr.factoryColTotal}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={`${title}-${row.name}-${i}`}>
                  <td style={{ ...tdStyle, textAlign: 'center', width: 36 }}>{i + 1}</td>
                  <td style={{ ...tdStyle, textAlign: 'left', fontWeight: 600 }}>{row.name}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{row.unit}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>{fmtNum(row.qty)}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>{fmtNum(row.price)}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 700 }}>{fmtNum(row.total)}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={5} style={{
                  ...tdStyle, textAlign: 'right', fontWeight: 800, background: dark ? '#2A2A3A' : '#F3F4F6',
                }}>
                  {tr.factoryColTotal}
                </td>
                <td style={{
                  ...tdStyle, textAlign: 'right', fontWeight: 800, whiteSpace: 'nowrap',
                  background: dark ? '#2A2A3A' : '#F3F4F6',
                }}>
                  {fmtNum(grandTotal)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )

  /* ── Report detail ── */
  if (reportId) {
    const dealerName = reportReceipt
      ? ([reportReceipt.org, reportReceipt.supplier].filter(Boolean).join(' ') || reportReceipt.supplier)
      : ''
    const dealerTitle = `${tr.factoryReportDealerTitle} ${dealerName}`.trim()
    const thStyle: CSSProperties = {
      border: '1px solid #111',
      padding: '6px 8px',
      background: dark ? '#2A2A3A' : '#F3F4F6',
      fontWeight: 800,
      fontSize: 11,
      color: c.text,
      whiteSpace: 'nowrap',
      textAlign: 'center',
    }
    const tdStyle: CSSProperties = {
      border: '1px solid #111',
      padding: '6px 8px',
      fontSize: 12,
      color: c.text,
      background: c.card,
    }

    return (
      <div style={{
        position: 'absolute', inset: 0, zIndex: 60, background: c.bg,
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          padding: 'var(--header-pad-top) max(16px, var(--safe-left)) 12px max(16px, var(--safe-right))',
          borderBottom: `1px solid ${c.border}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <button type="button" onClick={() => { setReportId(null); setReportReceipt(null) }}
              style={{ background: c.muted, border: 'none', borderRadius: 12, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowLeft size={20} color={c.text} />
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontSize: 17, fontWeight: 800, color: c.text, margin: 0 }}>{tr.factoryTabReports}</h1>
              <p style={{ fontSize: 12, color: c.mutedText, margin: 0 }}>
                {reportReceipt ? `№ ${reportReceipt.num} · ${reportReceipt.supplier}` : '…'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" disabled={exporting || reportLoading} onClick={() => void handleExport('download')}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '11px 10px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: c.primary, color: '#fff', fontWeight: 700, fontSize: 13,
                opacity: exporting ? 0.6 : 1,
              }}>
              <Download size={16} color="#fff" />
              {tr.factoryReportDownload}
            </button>
            <button type="button" disabled={exporting || reportLoading} onClick={() => void handleExport('share')}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '11px 10px', borderRadius: 12, border: `1px solid ${c.border}`, cursor: 'pointer',
                background: c.card, color: c.text, fontWeight: 700, fontSize: 13,
                opacity: exporting ? 0.6 : 1,
              }}>
              <Share2 size={16} color={c.text} />
              {tr.factoryReportShare}
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '12px 12px calc(24px + var(--safe-bottom))' }} className="no-scrollbar">
          {reportLoading && <p style={{ color: c.mutedText }}>{tr.loading}</p>}

          {!reportLoading && reportReceipt && (
            <div style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: 12,
              overflowX: 'auto',
              paddingBottom: 8,
            }}>
              {renderReportTable(
                dealerTitle,
                reportReceipt.date,
                reportDealerRows,
                dealerTotal,
                thStyle,
                tdStyle,
              )}
              {renderReportTable(
                tr.factoryReportShipmentTitle,
                reportReceipt.date,
                shipmentRows,
                shipmentTotal,
                thStyle,
                tdStyle,
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  /* ── Detail ── */
  if (selectedId) {
    return (
      <div style={{
        position: 'absolute', inset: 0, zIndex: 60, background: c.bg,
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          padding: 'var(--header-pad-top) max(16px, var(--safe-left)) 12px max(16px, var(--safe-right))',
          borderBottom: `1px solid ${c.border}`,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <button type="button" onClick={() => { setSelectedId(null); setReceipt(null) }}
            style={{ background: c.muted, border: 'none', borderRadius: 12, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowLeft size={20} color={c.text} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: 17, fontWeight: 800, color: c.text, margin: 0 }}>
              {tr.factoryOrderVsReceipt}
            </h1>
            <p style={{ fontSize: 12, color: c.mutedText, margin: 0 }}>
              {receipt ? `№ ${receipt.num} · ${receipt.supplier}` : '…'}
            </p>
          </div>
          <button type="button" onClick={() => void handleSave()} disabled={saving || detailLoading}
            style={{
              background: c.primary, color: '#fff', border: 'none', borderRadius: 12,
              padding: '10px 14px', fontWeight: 700, fontSize: 13, opacity: saving ? 0.6 : 1,
            }}>
            {saving ? '…' : tr.factorySaveCompare}
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px calc(24px + var(--safe-bottom))' }} className="no-scrollbar">
          {detailLoading && <p style={{ color: c.mutedText }}>{tr.loading}</p>}

          {!detailLoading && receipt && (
            <>
              {/* Kelgan */}
              <p style={{ fontSize: 13, fontWeight: 800, color: c.text, marginBottom: 8 }}>{tr.factoryReceived}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {(receipt.items || []).map((it, i) => (
                  <div key={i} style={{
                    background: c.card, border: `1px solid ${c.border}`, borderRadius: 14, padding: 12,
                  }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: c.text, margin: 0 }}>{it.tovar}</p>
                    <p style={{ fontSize: 11, color: c.mutedText, margin: '4px 0 0' }}>
                      {tr.factoryQty}: {receivedQty(it)}
                      {it.ves ? ` · ${it.ves} kg` : ''}
                      {' · '}{formatMoney(it.summa, lang)}
                    </p>
                  </div>
                ))}
                {(receipt.items || []).length === 0 && (
                  <p style={{ color: c.mutedText, fontSize: 13 }}>{tr.noData}</p>
                )}
              </div>

              {/* Buyurtma */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <p style={{ fontSize: 13, fontWeight: 800, color: c.text, margin: 0 }}>{tr.factoryOrdered}</p>
                <button type="button" onClick={() => setPickerOpen(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    background: 'rgba(108,92,231,0.15)', color: c.primary, border: 'none',
                    borderRadius: 10, padding: '6px 10px', fontWeight: 700, fontSize: 12,
                  }}>
                  <Plus size={14} color={c.primary} /> {tr.factoryAddProduct}
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {draft.map((d, idx) => (
                  <div key={d.key} style={{
                    background: c.card, border: `1px solid ${c.border}`, borderRadius: 14, padding: 12,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: c.text, margin: 0, flex: 1 }}>{d.name}</p>
                      <button type="button" onClick={() => setDraft(prev => prev.filter((_, i) => i !== idx))}
                        style={{ background: 'none', border: 'none', padding: 0 }}>
                        <Trash2 size={16} color={c.red} />
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <label style={{ flex: 1, fontSize: 11, color: c.mutedText }}>
                        {tr.factoryQty}
                        <input
                          value={d.orderedQty}
                          onChange={e => setDraft(prev => prev.map((x, i) => i === idx ? { ...x, orderedQty: e.target.value } : x))}
                          inputMode="decimal"
                          style={{
                            width: '100%', marginTop: 4, padding: '8px 10px', borderRadius: 10,
                            border: `1px solid ${c.border}`, background: c.muted, color: c.text, fontSize: 14,
                          }}
                        />
                      </label>
                      <label style={{ flex: 1, fontSize: 11, color: c.mutedText }}>
                        {tr.factoryPrice}
                        <input
                          value={d.orderedPrice}
                          onChange={e => setDraft(prev => prev.map((x, i) => i === idx ? { ...x, orderedPrice: e.target.value } : x))}
                          inputMode="decimal"
                          style={{
                            width: '100%', marginTop: 4, padding: '8px 10px', borderRadius: 10,
                            border: `1px solid ${c.border}`, background: c.muted, color: c.text, fontSize: 14,
                          }}
                        />
                      </label>
                    </div>
                  </div>
                ))}
                {draft.length === 0 && (
                  <p style={{ color: c.mutedText, fontSize: 13 }}>{tr.factoryOrderedHint}</p>
                )}
              </div>

              {/* Natija */}
              {compare && (
                <>
                  <p style={{ fontSize: 13, fontWeight: 800, color: c.text, marginBottom: 8 }}>{tr.factoryResult}</p>
                  <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12,
                  }}>
                    {[
                      [tr.factoryOrderedSum, formatMoney(compare.totalOrderedSum, lang)],
                      [tr.factoryMissingQty, String(compare.totalMissingQty)],
                      [tr.factoryMissingSum, formatMoney(compare.totalMissingSum, lang)],
                      [tr.factoryReceivedQty, String(compare.totalReceivedQty)],
                    ].map(([label, val]) => (
                      <div key={label} style={{
                        background: c.card, border: `1px solid ${c.border}`, borderRadius: 14, padding: 12,
                      }}>
                        <p style={{ fontSize: 11, color: c.mutedText, margin: 0 }}>{label}</p>
                        <p style={{ fontSize: 15, fontWeight: 800, color: c.text, margin: '4px 0 0' }}>{val}</p>
                      </div>
                    ))}
                  </div>

                  {compare.items.filter(i => (i.missingQty || 0) > 0).map((it, i) => (
                    <div key={i} style={{
                      background: 'rgba(244,67,54,0.1)', border: '1px solid rgba(244,67,54,0.35)',
                      borderRadius: 14, padding: 12, marginBottom: 8,
                    }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: c.red, margin: 0 }}>{it.name}</p>
                      <p style={{ fontSize: 11, color: c.mutedText, margin: '4px 0 0' }}>
                        {tr.factoryOrdered}: {it.orderedQty} · {tr.factoryReceived}: {it.receivedQty ?? 0} · {tr.factoryMissing}: {it.missingQty}
                        {' · '}{formatMoney(it.missingSum || 0, lang)}
                      </p>
                    </div>
                  ))}

                  {compare.extras.length > 0 && (
                    <>
                      <p style={{ fontSize: 12, fontWeight: 700, color: c.mutedText, margin: '12px 0 8px' }}>{tr.factoryExtra}</p>
                      {compare.extras.map((ex, i) => (
                        <div key={i} style={{
                          background: c.card, border: `1px solid ${c.border}`, borderRadius: 14, padding: 12, marginBottom: 8,
                        }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: c.text, margin: 0 }}>{ex.name}</p>
                          <p style={{ fontSize: 11, color: c.mutedText, margin: '4px 0 0' }}>
                            {tr.factoryReceived}: {ex.receivedQty} · {formatMoney(ex.summa, lang)}
                          </p>
                        </div>
                      ))}
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {pickerOpen && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 70, background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'flex-end',
            paddingBottom: 'var(--ime-bottom, 0px)',
            transition: 'padding-bottom 160ms ease-out',
          }}>
            <div style={{
              width: '100%',
              maxHeight: 'min(80%, calc(100% - var(--ime-bottom, 0px)))',
              background: c.card, borderRadius: '20px 20px 0 0',
              padding: '16px 16px calc(20px + var(--safe-bottom))',
              display: 'flex', flexDirection: 'column',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <p style={{ fontSize: 16, fontWeight: 800, color: c.text, margin: 0 }}>{tr.factoryAddProduct}</p>
                <button type="button" onClick={() => setPickerOpen(false)} style={{ background: 'none', border: 'none' }}>
                  <X size={22} color={c.mutedText} />
                </button>
              </div>
              <input
                value={pickerQ}
                onChange={e => setPickerQ(e.target.value)}
                placeholder={tr.search}
                style={{
                  padding: '12px 14px', borderRadius: 12, border: `1px solid ${c.border}`,
                  background: c.muted, color: c.text, fontSize: 14, marginBottom: 10,
                }}
              />
              <div style={{ overflowY: 'auto', flex: 1 }} className="no-scrollbar">
                {filteredProducts.map(p => (
                  <button key={p.id} type="button" onClick={() => addProduct(p)}
                    style={{
                      width: '100%', textAlign: 'left', padding: '12px 4px',
                      border: 'none', borderBottom: `1px solid ${c.border}`,
                      background: 'none', cursor: 'pointer',
                    }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: c.text, margin: 0 }}>{p.name}</p>
                    <p style={{ fontSize: 11, color: c.mutedText, margin: '2px 0 0' }}>
                      {p.code} · {p.unit} · {formatMoney(p.price, lang)}
                    </p>
                  </button>
                ))}
                {filteredProducts.length === 0 && (
                  <p style={{ color: c.mutedText, fontSize: 13, padding: 12 }}>{tr.clientOrderNoProducts}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  /* ── List / Stats ── */
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 60, background: c.bg,
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        padding: 'var(--header-pad-top) max(16px, var(--safe-left)) 12px max(16px, var(--safe-right))',
        borderBottom: `1px solid ${c.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <button type="button" onClick={onBack}
            style={{ background: c.muted, border: 'none', borderRadius: 12, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowLeft size={20} color={c.text} />
          </button>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: c.text, margin: 0, flex: 1 }}>{tr.factoryOrdersTitle}</h1>
        </div>
        <div style={{ display: 'flex', gap: 6, background: c.muted, borderRadius: 14, padding: 4 }}>
          {([
            ['list', tr.factoryTabReceipts, Package],
            ['stats', tr.factoryTabStats, BarChart3],
            ['reports', tr.factoryTabReports, FileText],
          ] as const).map(([id, label, Icon]) => {
            const active = tab === id
            return (
              <button key={id} type="button" onClick={() => setTab(id)}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  padding: '10px 4px', borderRadius: 11, border: 'none', cursor: 'pointer',
                  background: active ? c.card : 'transparent',
                  boxShadow: active ? `0 1px 4px ${c.border}` : 'none',
                  color: active ? c.primary : c.mutedText, fontWeight: 700, fontSize: 11,
                }}>
                <Icon size={15} color={active ? c.primary : c.mutedText} />
                {label}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px calc(100px + var(--safe-bottom))' }} className="no-scrollbar">
        {loading && <p style={{ color: c.mutedText }}>{tr.loading}</p>}

        {!loading && tab === 'list' && (
          <>
            {receipts.length === 0 && (
              <p style={{ color: c.mutedText, fontSize: 14 }}>{tr.factoryNoReceipts}</p>
            )}
            {receipts.map(r => {
              const done = r.reconciliationStatus === 'done'
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => void openDetail(r.id)}
                  style={{
                    width: '100%', textAlign: 'left', marginBottom: 10,
                    background: c.card, border: `1px solid ${c.border}`, borderRadius: 18, padding: 14,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <p style={{ fontSize: 14, fontWeight: 800, color: c.text, margin: 0 }}>№ {r.num}</p>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 99,
                      background: done ? 'rgba(0,200,83,0.15)' : 'rgba(230,150,60,0.18)',
                      color: done ? c.green : c.gold,
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                    }}>
                      {done ? <Check size={12} color={c.green} /> : null}
                      {done ? tr.factoryCompared : tr.factoryPending}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: c.text, margin: '6px 0 0', fontWeight: 600 }}>{r.supplier}</p>
                  <p style={{ fontSize: 12, color: c.mutedText, margin: '4px 0 0' }}>
                    {r.date} · {formatMoney(r.sum, lang)}
                    {r.netto ? ` · ${Number(r.netto).toLocaleString('ru-RU')} kg` : ''}
                  </p>
                </button>
              )
            })}
          </>
        )}

        {!loading && tab === 'stats' && (
          <>
            <p style={{ fontSize: 13, color: c.mutedText, marginBottom: 12 }}>{tr.factoryStatsHint}</p>
            {stats.length === 0 && (
              <p style={{ color: c.mutedText, fontSize: 14 }}>{tr.factoryNoStats}</p>
            )}
            {stats.map((s, i) => (
              <div key={`${s.productId || s.name}-${i}`} style={{
                background: c.card, border: `1px solid ${c.border}`, borderRadius: 16, padding: 14, marginBottom: 10,
              }}>
                <p style={{ fontSize: 14, fontWeight: 800, color: c.text, margin: 0 }}>{s.name}</p>
                {s.artikul && (
                  <p style={{ fontSize: 11, color: c.mutedText, margin: '2px 0 0' }}>{s.artikul}</p>
                )}
                <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: c.red, fontWeight: 700 }}>
                    {tr.factoryTimesMissing}: {s.timesMissing}
                  </span>
                  <span style={{ fontSize: 12, color: c.mutedText, fontWeight: 600 }}>
                    {tr.factoryMissingQty}: {Number(s.totalMissingQty).toLocaleString('ru-RU')}
                  </span>
                  <span style={{ fontSize: 12, color: c.text, fontWeight: 700 }}>
                    {formatMoney(s.totalMissingSum, lang)}
                  </span>
                </div>
              </div>
            ))}
          </>
        )}

        {!loading && tab === 'reports' && (
          <>
            {receipts.length === 0 && (
              <p style={{ color: c.mutedText, fontSize: 14 }}>{tr.factoryNoReceipts}</p>
            )}
            {receipts.map(r => {
              const done = r.reconciliationStatus === 'done'
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => void openReport(r.id)}
                  style={{
                    width: '100%', textAlign: 'left', marginBottom: 10,
                    background: c.card, border: `1px solid ${c.border}`, borderRadius: 18, padding: 14,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <p style={{ fontSize: 14, fontWeight: 800, color: c.text, margin: 0 }}>№ {r.num}</p>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 99,
                      background: done ? 'rgba(0,200,83,0.15)' : 'rgba(230,150,60,0.18)',
                      color: done ? c.green : c.gold,
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                    }}>
                      {done ? <Check size={12} color={c.green} /> : null}
                      {done ? tr.factoryCompared : tr.factoryPending}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: c.text, margin: '6px 0 0', fontWeight: 600 }}>{r.supplier}</p>
                  <p style={{ fontSize: 12, color: c.mutedText, margin: '4px 0 0' }}>
                    {r.date} · {formatMoney(r.sum, lang)}
                    {r.netto ? ` · ${Number(r.netto).toLocaleString('ru-RU')} kg` : ''}
                  </p>
                  <div style={{
                    marginTop: 10, display: 'flex', alignItems: 'center', gap: 6,
                    color: c.primary, fontSize: 12, fontWeight: 700,
                  }}>
                    <FileText size={14} color={c.primary} />
                    {tr.factoryTabReports}
                  </div>
                </button>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
