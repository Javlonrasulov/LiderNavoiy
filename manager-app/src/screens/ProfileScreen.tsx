import { Globe, LogOut, Moon, Shield, User } from '../icons'
import type { AuthUser } from '../api/types'
import type { Lang, Translations } from '../i18n'
import { theme } from '../theme'
import LangDropdown from '../components/LangDropdown'

interface Props {
  dark: boolean
  tr: Translations
  lang: Lang
  user: AuthUser | null
  onToggleDark: () => void
  onChangeLang: (l: Lang) => void
  onLogout: () => void
}

export default function ProfileScreen({ dark, tr, lang, user, onToggleDark, onChangeLang, onLogout }: Props) {
  const c = theme(dark)

  return (
    <div style={{ width: '100%', height: '100%', overflowY: 'auto', background: c.bg, paddingBottom: 'calc(100px + var(--safe-bottom))' }} className="no-scrollbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 'var(--header-pad-top) max(20px, var(--safe-left)) 16px max(20px, var(--safe-right))' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: c.text, flex: 1 }}>{tr.profile}</h1>
        <LangDropdown lang={lang} dark={dark} onChange={onChangeLang} />
      </div>

      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{
          borderRadius: 28, padding: 22, position: 'relative', overflow: 'hidden',
          background: c.hero, boxShadow: '0 16px 48px rgba(108,92,231,0.35)',
        }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 10px)', borderRadius: 28 }} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 70, height: 70, borderRadius: 22,
              background: 'rgba(255,255,255,0.2)', border: '3px solid rgba(255,255,255,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, fontWeight: 900, color: 'white',
            }}>
              {(user?.fullName || 'M').charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 900, color: 'white', letterSpacing: '-0.3px' }}>
                {user?.fullName || tr.appName}
              </h2>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginBottom: 10 }}>@{user?.username}</p>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 99, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
                <Shield size={11} color="white" />
                <span style={{ color: 'white', fontSize: 11, fontWeight: 800 }}>{user?.role || 'manager'}</span>
              </div>
            </div>
          </div>
        </div>

        <Section title={tr.account} card={c.card} border={c.border} text={c.text}>
          <Row icon={User} label={tr.fullName} sub={user?.fullName || '—'} muted={c.muted} mutedText={c.mutedText} text={c.text} />
          <Row icon={Shield} label={tr.role} sub={user?.role || '—'} muted={c.muted} mutedText={c.mutedText} text={c.text} />
        </Section>

        <Section title={tr.preferences} card={c.card} border={c.border} text={c.text}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
            <div style={{ width: 40, height: 40, borderRadius: 13, background: 'rgba(108,92,231,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Globe size={18} color="#6C5CE7" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: c.text }}>{tr.language}</p>
            </div>
            <LangDropdown lang={lang} dark={dark} onChange={onChangeLang} />
          </div>
          <div style={{ height: 1, background: c.border, margin: '0 16px' }} />
          <button type="button" onClick={onToggleDark} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
            background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
          }}>
            <div style={{ width: 40, height: 40, borderRadius: 13, background: 'rgba(108,92,231,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Moon size={18} color="#6C5CE7" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: c.text }}>{tr.appearance}</p>
              <p style={{ fontSize: 12, color: c.mutedText, marginTop: 2 }}>{dark ? tr.darkMode : tr.lightMode}</p>
            </div>
            <div style={{
              width: 48, height: 28, borderRadius: 99, padding: 3,
              background: dark ? '#6C5CE7' : c.muted,
              display: 'flex', alignItems: 'center', justifyContent: dark ? 'flex-end' : 'flex-start',
            }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'white', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }} />
            </div>
          </button>
        </Section>

        <button type="button" onClick={onLogout} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          height: 52, borderRadius: 16, border: 'none', cursor: 'pointer',
          background: 'rgba(244,67,54,0.12)', color: c.red, fontWeight: 800, fontSize: 15,
        }}>
          <LogOut size={18} color={c.red} />
          {tr.logout}
        </button>
      </div>
    </div>
  )
}

function Section({ title, children, card, border, text }: {
  title: string; children: React.ReactNode; card: string; border: string; text: string
}) {
  return (
    <div>
      <p style={{ fontSize: 12, fontWeight: 800, color: text, opacity: 0.5, marginBottom: 8, paddingLeft: 4 }}>{title}</p>
      <div style={{ borderRadius: 22, background: card, border: `1px solid ${border}`, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  )
}

function Row({ icon: Icon, label, sub, muted, mutedText, text }: {
  icon: typeof User; label: string; sub: string; muted: string; mutedText: string; text: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
      <div style={{ width: 40, height: 40, borderRadius: 13, background: muted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={18} color="#6C5CE7" />
      </div>
      <div>
        <p style={{ fontSize: 14, fontWeight: 700, color: text }}>{label}</p>
        <p style={{ fontSize: 12, color: mutedText, marginTop: 2 }}>{sub}</p>
      </div>
    </div>
  )
}
