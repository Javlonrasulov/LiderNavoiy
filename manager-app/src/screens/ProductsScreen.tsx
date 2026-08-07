import { useEffect, useState } from 'react'
import { ArrowLeft, Search } from '../icons'
import { fetchProducts } from '../api/manager'
import type { Product } from '../api/types'
import type { Lang, Translations } from '../i18n'
import { formatMoney, theme } from '../theme'

interface Props {
  dark: boolean
  lang: Lang
  tr: Translations
  onBack: () => void
}

export default function ProductsScreen({ dark, lang, tr, onBack }: Props) {
  const c = theme(dark)
  const [list, setList] = useState<Product[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)

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

  const filtered = list.filter(p => {
    const hay = `${p.name} ${p.code} ${p.category || ''} ${p.brand || ''}`.toLowerCase()
    return hay.includes(q.trim().toLowerCase())
  })

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 60, background: c.bg,
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
        <h1 style={{ fontSize: 20, fontWeight: 800, color: c.text }}>{tr.productsNav}</h1>
      </div>

      <div style={{ padding: '0 16px calc(40px + var(--safe-bottom))', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, height: 48, padding: '0 14px',
          borderRadius: 16, background: c.card, border: `1px solid ${c.border}`,
        }}>
          <Search size={18} color={c.mutedText} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder={tr.search}
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: c.text, fontSize: 14, fontWeight: 600 }} />
        </div>

        {loading && <p style={{ textAlign: 'center', color: c.mutedText, padding: 24 }}>{tr.loading}</p>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {!loading && filtered.map(p => (
            <div key={p.id} className="card-hover" style={{
              borderRadius: 20, overflow: 'hidden', background: c.card, border: `1px solid ${c.border}`,
            }}>
              <div style={{
                height: 100,
                background: p.imageUrl
                  ? `center/cover url(${p.imageUrl})`
                  : 'linear-gradient(135deg, rgba(108,92,231,0.25), rgba(230,150,60,0.2))',
              }} />
              <div style={{ padding: 12 }}>
                <p style={{ fontSize: 13, fontWeight: 800, color: c.text, lineHeight: 1.3, minHeight: 34 }}>{p.name}</p>
                <p style={{ fontSize: 11, color: c.mutedText, marginTop: 4 }}>{p.code}{p.category ? ` · ${p.category}` : ''}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 900, color: c.primary }}>{formatMoney(p.price, lang)}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: c.mutedText }}>
                    {tr.stock}: {p.stockBalance ?? '—'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {!loading && filtered.length === 0 && (
          <p style={{ textAlign: 'center', color: c.mutedText, padding: 32 }}>{tr.noData}</p>
        )}
      </div>
    </div>
  )
}
