import { CheckCircle, X } from '../icons'
import type { Translations } from '../i18n'
import { theme } from '../theme'

interface Props {
  dark: boolean
  tr: Translations
  updates: string[]
  onDismiss: () => void
}

/** Agent Dashboard RefreshResultCard — manager uchun */
export default function RefreshResultCard({ dark, tr, updates, onDismiss }: Props) {
  const c = theme(dark)
  const bg = dark ? 'rgba(6, 78, 59, 0.4)' : '#ECFDF5'
  const border = dark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.25)'
  const titleColor = dark ? '#fff' : '#065F46'
  const lineColor = dark ? '#D1FAE5' : '#047857'

  return (
    <div style={{
      borderRadius: 20,
      padding: 16,
      background: bg,
      border: `1px solid ${border}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <CheckCircle size={20} color="#10B981" />
        <p style={{ flex: 1, fontSize: 15, fontWeight: 700, color: titleColor }}>
          {tr.refreshUpdatesTitle}
        </p>
        <button
          type="button"
          onClick={onDismiss}
          style={{
            width: 32, height: 32, borderRadius: 10, border: 'none', cursor: 'pointer',
            background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <X size={16} color={c.mutedText} />
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {updates.map((line, i) => (
          <div key={`${i}-${line}`} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span style={{ color: '#10B981', fontSize: 14, lineHeight: '20px' }}>•</span>
            <p style={{ fontSize: 14, lineHeight: '20px', color: lineColor, margin: 0 }}>{line}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
