import { useEffect, useState } from 'react'
import { ArrowLeft, Grid3x3, List, Package, Search, Star, X } from '../icons'
import { fetchProductStats, fetchProducts, fetchTopProducts } from '../api/manager'
import type { Product, ProductStats } from '../api/types'
import type { Lang, Translations } from '../i18n'
import { formatMoney, theme } from '../theme'
import { resolveProductImageUrl } from '../utils/productImageUrl'

interface Props {
  dark: boolean
  lang: Lang
  tr: Translations
  onBack: () => void
}

type ViewMode = 'grid' | 'list'
type FilterTab = 'all' | 'top'

function formatQty(n: number | null | undefined, unit?: string | null): string {
  const v = Number(n)
  if (!Number.isFinite(v)) return '—'
  const s = v.toLocaleString('ru-RU', { maximumFractionDigits: 3 })
  return unit ? `${s} ${unit}` : s
}

function RatingStars({ value, size = 12 }: { value: number | null; size?: number }) {
  const rating = value != null && value > 0 ? value : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => {
        const filled = rating >= i - 0.25
        const half = !filled && rating >= i - 0.75
        return (
          <Star
            key={i}
            size={size}
            color={filled || half ? '#F5A623' : '#C4C4D4'}
            fill={filled ? '#F5A623' : 'none'}
            strokeWidth={1.8}
          />
        )
      })}
    </div>
  )
}

function ProductThumb({
  url,
  height,
  width,
  radius = 0,
}: {
  url: string | null
  height: number
  width?: number | string
  radius?: number
}) {
  const [failed, setFailed] = useState(false)
  const showImg = Boolean(url) && !failed

  return (
    <div style={{
      width: width ?? '100%',
      height,
      flexShrink: 0,
      borderRadius: radius,
      overflow: 'hidden',
      background: showImg
        ? '#f3f4f6'
        : 'linear-gradient(135deg, rgba(108,92,231,0.25), rgba(230,150,60,0.2))',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {showImg ? (
        <img
          src={url!}
          alt=""
          onError={() => setFailed(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <Package size={28} color="rgba(108,92,231,0.45)" strokeWidth={1.6} />
      )}
    </div>
  )
}

export default function ProductsScreen({ dark, lang, tr, onBack }: Props) {
  const c = theme(dark)
  const [list, setList] = useState<Product[]>([])
  const [topList, setTopList] = useState<ProductStats[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterTab>('all')
  const [detail, setDetail] = useState<ProductStats | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('lm-products-view')
    return saved === 'list' ? 'list' : 'grid'
  })

  useEffect(() => {
    void (async () => {
      setLoading(true)
      try {
        const [products, top] = await Promise.all([
          fetchProducts(),
          fetchTopProducts(undefined, 40),
        ])
        setList(Array.isArray(products) ? products : [])
        setTopList(Array.isArray(top) ? top : [])
      } catch {
        setList([])
        setTopList([])
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const setMode = (mode: ViewMode) => {
    setViewMode(mode)
    localStorage.setItem('lm-products-view', mode)
  }

  const source = filter === 'top' ? topList : list
  const filtered = source.filter(p => {
    const hay = `${p.name} ${p.code} ${p.category || ''} ${p.brand || ''}`.toLowerCase()
    return hay.includes(q.trim().toLowerCase())
  })

  const metaLine = (p: Product) => {
    const parts = [p.code, p.brand || p.category].filter(Boolean)
    return parts.join(' · ')
  }

  const openDetail = async (product: Product | ProductStats) => {
    setDetailLoading(true)
    const cached = 'soldQuantity' in product ? (product as ProductStats) : null
    if (cached) setDetail(cached)
    else {
      setDetail({
        ...product,
        soldQuantity: 0,
        soldAmount: 0,
        orderCount: 0,
        avgRating: null,
        ratingCount: 0,
      })
    }
    try {
      const stats = await fetchProductStats(product.id)
      setDetail(stats)
    } catch {
      if (!cached) {
        /* keep placeholder */
      }
    } finally {
      setDetailLoading(false)
    }
  }

  const tabs: { id: FilterTab; label: string }[] = [
    { id: 'all', label: tr.productsAll },
    { id: 'top', label: tr.productsTop },
  ]

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 40, background: c.bg,
      overflowY: 'auto', animation: 'slideUp 0.35s ease both',
    }} className="no-scrollbar">
      <div style={{
        padding: 'var(--header-pad-top) max(20px, var(--safe-left)) 12px max(20px, var(--safe-right))',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button type="button" onClick={onBack} style={{
          width: 40, height: 40, borderRadius: 13, border: 'none', background: c.muted,
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>
          <ArrowLeft size={18} color={c.text} />
        </button>
        <h1 style={{ flex: 1, fontSize: 20, fontWeight: 800, color: c.text, margin: 0 }}>{tr.productsNav}</h1>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: 4, borderRadius: 14, background: c.muted,
        }}>
          <button
            type="button"
            onClick={() => setMode('grid')}
            aria-label="Grid"
            style={{
              width: 36, height: 36, borderRadius: 11, border: 'none', cursor: 'pointer',
              background: viewMode === 'grid' ? c.card : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: viewMode === 'grid' ? `0 1px 4px ${c.border}` : 'none',
            }}
          >
            <Grid3x3 size={17} color={viewMode === 'grid' ? c.primary : c.mutedText} strokeWidth={viewMode === 'grid' ? 2.4 : 1.8} />
          </button>
          <button
            type="button"
            onClick={() => setMode('list')}
            aria-label="List"
            style={{
              width: 36, height: 36, borderRadius: 11, border: 'none', cursor: 'pointer',
              background: viewMode === 'list' ? c.card : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: viewMode === 'list' ? `0 1px 4px ${c.border}` : 'none',
            }}
          >
            <List size={17} color={viewMode === 'list' ? c.primary : c.mutedText} strokeWidth={viewMode === 'list' ? 2.4 : 1.8} />
          </button>
        </div>
      </div>

      <div style={{ padding: '0 16px calc(100px + var(--safe-bottom))', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, height: 48, padding: '0 14px',
          borderRadius: 16, background: c.card, border: `1px solid ${c.border}`,
        }}>
          <Search size={18} color={c.mutedText} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder={tr.search}
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: c.text, fontSize: 14, fontWeight: 600 }} />
        </div>

        <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }} className="no-scrollbar">
          {tabs.map(tab => {
            const active = filter === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                style={{
                  flexShrink: 0,
                  height: 36,
                  padding: '0 14px',
                  borderRadius: 12,
                  border: `1px solid ${active ? c.primary : c.border}`,
                  background: active ? 'rgba(108,92,231,0.14)' : c.card,
                  color: active ? c.primary : c.mutedText,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {loading && <p style={{ textAlign: 'center', color: c.mutedText, padding: 24 }}>{tr.loading}</p>}

        {viewMode === 'grid' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {!loading && filtered.map(p => {
              const img = resolveProductImageUrl(p.imageUrl)
              const stats = p as ProductStats
              const showRating = filter === 'top'
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => void openDetail(p)}
                  className="card-hover"
                  style={{
                    borderRadius: 20, overflow: 'hidden', background: c.card, border: `1px solid ${c.border}`,
                    textAlign: 'left', padding: 0, cursor: 'pointer', display: 'block',
                  }}
                >
                  <ProductThumb url={img} height={100} />
                  <div style={{ padding: 12 }}>
                    <p style={{ fontSize: 13, fontWeight: 800, color: c.text, lineHeight: 1.3, minHeight: 34, margin: 0 }}>{p.name}</p>
                    <p style={{ fontSize: 11, color: c.mutedText, marginTop: 4, marginBottom: 0 }}>{metaLine(p)}</p>
                    {showRating && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                        <RatingStars value={stats.avgRating} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: c.mutedText }}>
                          {stats.avgRating != null ? stats.avgRating.toFixed(1) : '—'}
                        </span>
                      </div>
                    )}
                    {showRating && (
                      <p style={{ fontSize: 11, fontWeight: 700, color: c.gold, margin: '6px 0 0' }}>
                        {tr.soldQty}: {formatQty(stats.soldQuantity, p.unit)}
                      </p>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 900, color: c.primary }}>{formatMoney(p.price, lang)}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: c.mutedText, whiteSpace: 'nowrap' }}>
                        {tr.stock}: {p.stockBalance ?? '—'}
                      </span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {!loading && filtered.map(p => {
              const img = resolveProductImageUrl(p.imageUrl)
              const stats = p as ProductStats
              const showRating = filter === 'top'
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => void openDetail(p)}
                  className="card-hover"
                  style={{
                    display: 'flex', gap: 12, alignItems: 'stretch',
                    borderRadius: 18, overflow: 'hidden', background: c.card, border: `1px solid ${c.border}`,
                    padding: 10, textAlign: 'left', cursor: 'pointer', width: '100%',
                  }}
                >
                  <ProductThumb url={img} height={72} width={72} radius={14} />
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingRight: 4 }}>
                    <p style={{
                      fontSize: 14, fontWeight: 800, color: c.text, lineHeight: 1.3, margin: 0,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{p.name}</p>
                    <p style={{ fontSize: 11, color: c.mutedText, marginTop: 3, marginBottom: 0 }}>{metaLine(p)}</p>
                    {showRating && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5, flexWrap: 'wrap' }}>
                        <RatingStars value={stats.avgRating} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: c.gold }}>
                          {tr.soldQty}: {formatQty(stats.soldQuantity, p.unit)}
                        </span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 900, color: c.primary }}>{formatMoney(p.price, lang)}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: c.mutedText }}>
                        {tr.stock}: {p.stockBalance ?? '—'}
                      </span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <p style={{ textAlign: 'center', color: c.mutedText, padding: 32 }}>{tr.noData}</p>
        )}
      </div>

      {detail && (
        <div
          role="presentation"
          onClick={() => setDetail(null)}
          style={{
            position: 'absolute', inset: 0, zIndex: 80,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
        >
          <div
            role="dialog"
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxHeight: '85%',
              background: c.card,
              borderRadius: '24px 24px 0 0',
              padding: '16px 16px calc(24px + var(--safe-bottom))',
              overflowY: 'auto',
              animation: 'slideUp 0.28s ease both',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: c.text }}>{tr.productDetail}</h2>
              <button
                type="button"
                onClick={() => setDetail(null)}
                style={{
                  width: 36, height: 36, borderRadius: 12, border: 'none', background: c.muted,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                }}
              >
                <X size={16} color={c.text} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
              <ProductThumb url={resolveProductImageUrl(detail.imageUrl)} height={96} width={96} radius={16} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: c.text, lineHeight: 1.3 }}>{detail.name}</p>
                <p style={{ margin: '6px 0 0', fontSize: 12, color: c.mutedText }}>{metaLine(detail)}</p>
                <p style={{ margin: '10px 0 0', fontSize: 18, fontWeight: 900, color: c.primary }}>
                  {formatMoney(detail.price, lang)}
                </p>
              </div>
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14,
              padding: '12px 14px', borderRadius: 16, background: c.muted,
            }}>
              <RatingStars value={detail.avgRating} size={16} />
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: c.text }}>
                  {detail.avgRating != null ? detail.avgRating.toFixed(1) : tr.noRating}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: c.mutedText }}>
                  {tr.rating}{detail.ratingCount > 0 ? ` · ${detail.ratingCount}` : ''}
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: tr.soldQty, value: detailLoading ? '…' : formatQty(detail.soldQuantity, detail.unit) },
                { label: tr.soldAmount, value: detailLoading ? '…' : formatMoney(detail.soldAmount, lang) },
                { label: tr.orderCount, value: detailLoading ? '…' : String(detail.orderCount ?? 0) },
                { label: tr.stock, value: String(detail.stockBalance ?? '—') },
                { label: tr.category, value: detail.category || '—' },
                { label: tr.brand, value: detail.brand || '—' },
                { label: tr.unit, value: detail.unit || '—' },
                { label: 'ID', value: detail.code || '—' },
              ].map(row => (
                <div key={row.label} style={{
                  padding: '12px 12px', borderRadius: 14, background: c.muted, border: `1px solid ${c.border}`,
                }}>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: c.mutedText }}>{row.label}</p>
                  <p style={{ margin: '6px 0 0', fontSize: 14, fontWeight: 800, color: c.text, wordBreak: 'break-word' }}>
                    {row.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
