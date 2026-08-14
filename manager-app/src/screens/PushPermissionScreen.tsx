import { Bell, Settings, LogOut } from '../icons'
import { theme } from '../theme'
import type { Translations } from '../i18n'

interface Props {
  dark: boolean
  tr: Translations
  busy?: boolean
  onAllow: () => void
  onOpenSettings: () => void
  onLogout: () => void
}

/** Bildirishnoma ruxsatisiz asosiy ilovaga o‘tishni to‘xtatadi */
export default function PushPermissionScreen({
  dark,
  tr,
  busy,
  onAllow,
  onOpenSettings,
  onLogout,
}: Props) {
  const c = theme(dark)

  return (
    <div
      className="no-scrollbar"
      style={{
        width: '100%',
        height: '100%',
        overflowY: 'auto',
        background: c.bg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          flex: 1,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding:
            'calc(24px + var(--header-pad-top)) max(20px, var(--safe-left), var(--safe-right)) calc(40px + var(--safe-bottom))',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 22,
              margin: '0 auto 20px',
              background: 'linear-gradient(135deg, #6C5CE7 0%, #9B59B6 100%)',
              boxShadow: '0 16px 40px rgba(108,92,231,0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
            }}
          >
            <Bell size={32} />
          </div>

          <h1
            style={{
              fontSize: 26,
              fontWeight: 900,
              color: c.text,
              letterSpacing: '-0.5px',
              margin: 0,
            }}
          >
            {tr.pushRequiredTitle}
          </h1>
          <p
            style={{
              fontSize: 13,
              lineHeight: 1.6,
              color: c.mutedText,
              marginTop: 8,
              marginBottom: 28,
            }}
          >
            {tr.pushRequiredBody}
          </p>

          <button
            type="button"
            className="btn-primary"
            disabled={busy}
            onClick={onAllow}
            style={{
              width: '100%',
              height: 54,
              border: 'none',
              cursor: busy ? 'wait' : 'pointer',
              fontSize: 16,
              opacity: busy ? 0.7 : 1,
              marginBottom: 12,
            }}
          >
            {busy ? tr.loading : tr.pushRequiredAllow}
          </button>

          <button
            type="button"
            className="card-hover"
            disabled={busy}
            onClick={onOpenSettings}
            style={{
              width: '100%',
              height: 52,
              borderRadius: 16,
              border: `1px solid ${c.border}`,
              background: c.muted,
              color: c.text,
              fontSize: 15,
              fontWeight: 700,
              cursor: busy ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              marginBottom: 18,
            }}
          >
            <Settings size={17} color={c.mutedText} />
            {tr.pushRequiredSettings}
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={onLogout}
            style={{
              border: 'none',
              background: 'transparent',
              color: c.mutedText,
              fontSize: 13,
              fontWeight: 700,
              padding: '10px 16px',
              cursor: busy ? 'wait' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <LogOut size={15} color={c.mutedText} />
            {tr.logout}
          </button>
        </div>
      </div>
    </div>
  )
}
