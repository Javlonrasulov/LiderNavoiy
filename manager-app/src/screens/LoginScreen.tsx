import { useState } from 'react'
import { Eye, EyeOff } from '../icons'
import { login } from '../api/auth'
import { ApiError } from '../api/client'
import type { AuthUser } from '../api/types'
import type { Lang, Translations } from '../i18n'
import { localizeApiError } from '../i18n'
import { theme } from '../theme'
import LangDropdown from '../components/LangDropdown'
import { showToast } from '../components/Toast'

interface Props {
  dark: boolean
  tr: Translations
  lang: Lang
  onChangeLang: (l: Lang) => void
  onToggleDark: () => void
  onSuccess: (user: AuthUser) => void
}

export default function LoginScreen({ dark, tr, lang, onChangeLang, onToggleDark, onSuccess }: Props) {
  const c = theme(dark)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!username.trim() || !password) return
    setLoading(true)
    try {
      const res = await login(username, password)
      onSuccess(res.user)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      const status = e instanceof ApiError ? e.status : Number((e as { status?: number })?.status)
      if (msg === 'manager_only') showToast(tr.managerOnly)
      else if (status === 409 || msg === 'SESSION_ACTIVE' || msg.startsWith('SESSION_ACTIVE:')) {
        showToast(localizeApiError(msg, tr))
      }
      else if (status === 401 || /invalid credentials/i.test(msg)) showToast(tr.invalidCredentials)
      else showToast(`${tr.loginError}: ${localizeApiError(msg, tr).slice(0, 120)}`)
    } finally {
      setLoading(false)
    }
  }

  const fieldStyle: React.CSSProperties = {
    width: '100%',
    height: 52,
    borderRadius: 16,
    border: `1px solid ${c.border}`,
    background: c.muted,
    color: c.text,
    padding: '0 16px',
    fontSize: 15,
    fontWeight: 600,
    outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <div style={{
      width: '100%', height: '100%', overflowY: 'auto', background: c.bg,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
    }} className="no-scrollbar">
      <div style={{
        width: '100%',
        padding: 'var(--header-pad-top) max(20px, var(--safe-right)) 0 max(20px, var(--safe-left))',
        display: 'flex', justifyContent: 'flex-end', gap: 8,
        boxSizing: 'border-box',
      }}>
        <LangDropdown lang={lang} dark={dark} onChange={onChangeLang} />
        <button type="button" onClick={onToggleDark} className="card-hover"
          style={{ width: 36, height: 36, borderRadius: 12, border: 'none', background: c.muted, color: c.text, fontWeight: 800, cursor: 'pointer' }}>
          {dark ? '☀' : '☾'}
        </button>
      </div>

      <div style={{
        flex: 1,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '24px max(20px, var(--safe-left), var(--safe-right)) calc(40px + var(--safe-bottom))',
        boxSizing: 'border-box',
      }}>
        <div style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
          <div style={{
            width: 72, height: 72, borderRadius: 22, margin: '0 auto 20px',
            background: 'linear-gradient(135deg, #6C5CE7 0%, #9B59B6 100%)',
            boxShadow: '0 16px 40px rgba(108,92,231,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, fontWeight: 900, color: 'white',
          }}>M</div>

          <h1 style={{ fontSize: 28, fontWeight: 900, color: c.text, letterSpacing: '-0.5px', margin: 0 }}>{tr.loginTitle}</h1>
          <p style={{ fontSize: 13, color: c.mutedText, marginTop: 6, marginBottom: 28 }}>{tr.loginSubtitle}</p>

          <div style={{ textAlign: 'left' }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: c.mutedText, marginBottom: 8 }}>{tr.username}</label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
              style={{ ...fieldStyle, marginBottom: 14 }}
            />

            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: c.mutedText, marginBottom: 8 }}>{tr.password}</label>
            <div style={{ position: 'relative', marginBottom: 18 }}>
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submit()}
                style={{ ...fieldStyle, paddingRight: 48 }}
              />
              <button type="button" onClick={() => setShowPw(v => !v)}
                style={{ position: 'absolute', right: 12, top: 14, background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                {showPw ? <EyeOff size={18} color={c.mutedText} /> : <Eye size={18} color={c.mutedText} />}
              </button>
            </div>

            <button
              type="button"
              className="btn-primary"
              disabled={loading}
              onClick={submit}
              style={{
                width: '100%', height: 54, border: 'none', cursor: loading ? 'wait' : 'pointer',
                fontSize: 16, opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? tr.loading : tr.loginBtn}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
