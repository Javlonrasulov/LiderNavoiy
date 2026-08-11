import { theme } from '../theme'
import type { Translations } from '../i18n'

interface Props {
  dark: boolean
  tr: Translations
  onReLogin: () => void
}

/** Refresh muvaffaqiyatsiz — bo‘sh «маълумот йўқ» o‘rniga qayta kirish */
export default function SessionExpiredOverlay({ dark, tr, onReLogin }: Props) {
  const c = theme(dark)

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="mgr-session-expired-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px max(20px, var(--safe-right)) 24px max(20px, var(--safe-left))',
        boxSizing: 'border-box',
        background: dark ? 'rgba(8,8,18,0.92)' : 'rgba(248,249,252,0.94)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 360,
          borderRadius: 24,
          border: `1px solid ${c.border}`,
          background: c.card,
          padding: '28px 24px 24px',
          textAlign: 'center',
          boxShadow: dark
            ? '0 24px 64px rgba(0,0,0,0.55)'
            : '0 24px 64px rgba(91,45,142,0.12)',
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            margin: '0 auto 18px',
            borderRadius: 20,
            background: c.hero,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 28,
            fontWeight: 900,
            letterSpacing: -1,
          }}
        >
          M
        </div>
        <h2
          id="mgr-session-expired-title"
          style={{
            margin: '0 0 10px',
            fontSize: 20,
            fontWeight: 800,
            color: c.text,
            letterSpacing: -0.3,
          }}
        >
          {tr.sessionExpiredTitle}
        </h2>
        <p
          style={{
            margin: '0 0 22px',
            fontSize: 14,
            lineHeight: 1.5,
            color: c.mutedText,
            fontWeight: 500,
          }}
        >
          {tr.sessionExpiredBody}
        </p>
        <button
          type="button"
          onClick={onReLogin}
          className="card-hover"
          style={{
            width: '100%',
            height: 52,
            borderRadius: 16,
            border: 'none',
            background: c.primary,
            color: '#fff',
            fontSize: 16,
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          {tr.sessionExpiredBtn}
        </button>
      </div>
    </div>
  )
}
