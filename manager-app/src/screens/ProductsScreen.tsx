import { useEffect, useState } from 'react'
import { ArrowLeft, Grid3x3, List, Package, Search } from '../icons'
import { fetchProducts } from '../api/manager'
import type { Product } from '../api/types'
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
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('lm-products-view')
    return saved === 'list' ? 'list' : 'grid'
  })

  useEffect(() => {
    void (async () => {
      setLoading(true)
      try {
        const data = await fetchProducts()
        setList(Array.isArray(data) ? data : [])
      } catch {
        setList([])
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const setMode = (mode: ViewMode) => {
    setViewMode(mode)
    localStorage.setItem('lm-products-view', mode)
  }

  const filtered = list.filter(p => {
    const hay = `${p.name} ${p.code} ${p.category || ''} ${p.brand || ''}`.toLowerCase()
    return hay.includes(q.trim().toLowerCase())
  })

  const metaLine = (p: Product) => {
    const parts = [p.code, p.brand || p.category].filter(Boolean)
    return parts.join(' · ')
  }

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

        {loading && <p style={{ textAlign: 'center', color: c.mutedText, padding: 24 }}>{tr.loading}</p>}

        {viewMode === 'grid' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {!loading && filtered.map(p => {
              const img = resolveProductImageUrl(p.imageUrl)
              return (
                <div key={p.id} className="card-hover" style={{
                  borderRadius: 20, overflow: 'hidden', background: c.card, border: `1px solid ${c.border}`,
                }}>
                  <ProductThumb url={img} height={100} />
                  <div style={{ padding: 12 }}>
                    <p style={{ fontSize: 13, fontWeight: 800, color: c.text, lineHeight: 1.3, minHeight: 34, margin: 0 }}>{p.name}</p>
                    <p style={{ fontSize: 11, color: c.mutedText, marginTop: 4, marginBottom: 0 }}>{metaLine(p)}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 900, color: c.primary }}>{formatMoney(p.price, lang)}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: c.mutedText, whiteSpace: 'nowrap' }}>
                        {tr.stock}: {p.stockBalance ?? '—'}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {!loading && filtered.map(p => {
              const img = resolveProductImageUrl(p.imageUrl)
              return (
                <div key={p.id} className="card-hover" style={{
                  display: 'flex', gap: 12, alignItems: 'stretch',
                  borderRadius: 18, overflow: 'hidden', background: c.card, border: `1px solid ${c.border}`,
                  padding: 10,
                }}>
                  <ProductThumb url={img} height={72} width={72} radius={14} />
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingRight: 4 }}>
                    <p style={{
                      fontSize: 14, fontWeight: 800, color: c.text, lineHeight: 1.3, margin: 0,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{p.name}</p>
                    <p style={{ fontSize: 11, color: c.mutedText, marginTop: 3, marginBottom: 0 }}>{metaLine(p)}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 900, color: c.primary }}>{formatMoney(p.price, lang)}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: c.mutedText }}>
                        {tr.stock}: {p.stockBalance ?? '—'}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <p style={{ textAlign: 'center', color: c.mutedText, padding: 32 }}>{tr.noData}</p>
        )}
      </div>
    </div>
  )
}
