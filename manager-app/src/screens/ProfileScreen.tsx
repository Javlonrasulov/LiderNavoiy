import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { ApiError, isSessionExpiredError } from '../api/client'
import { changePassword } from '../api/auth'
import type { AuthUser } from '../api/types'
import type { Lang, Translations } from '../i18n'
import { theme } from '../theme'
import LangDropdown from '../components/LangDropdown'
import { showToast } from '../components/Toast'
import {
  ChevronRight, Eye, EyeOff, Globe, Lock, LogOut, Moon, Shield, Sun, User, X, ArrowLeft,
} from '../icons'

interface Props {
  dark: boolean
  tr: Translations
  lang: Lang
  user: AuthUser | null
  onToggleDark: () => void
  onChangeLang: (l: Lang) => void
  onLogout: () => void
  onBack?: () => void
}

export default function ProfileScreen({ dark, tr, lang, user, onToggleDark, onChangeLang, onLogout, onBack }: Props) {
  const c = theme(dark)
  const [pwOpen, setPwOpen] = useState(false)

  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      background: c.bg, overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 'var(--header-pad-top) max(20px, var(--safe-left)) 16px max(20px, var(--safe-right))', flexShrink: 0 }}>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            style={{
              width: 36, height: 36, borderRadius: 12, border: 'none', background: c.muted,
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >
            <ArrowLeft size={18} color={c.text} />
          </button>
        )}
        <h1 style={{ fontSize: 22, fontWeight: 800, color: c.text, flex: 1 }}>{tr.profile}</h1>
        <LangDropdown lang={lang} dark={dark} onChange={onChangeLang} />
      </div>

      <div
        style={{
          flex: 1, minHeight: 0, overflowY: 'auto',
          padding: '0 max(20px, var(--safe-left), var(--safe-right)) 16px',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}
        className="no-scrollbar"
      >
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
          <div style={{ height: 1, background: c.border, margin: '0 16px' }} />
          <Row icon={Shield} label={tr.role} sub={user?.role || '—'} muted={c.muted} mutedText={c.mutedText} text={c.text} />
          <div style={{ height: 1, background: c.border, margin: '0 16px' }} />
          <button
            type="button"
            onClick={() => setPwOpen(true)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
              background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
            }}
          >
            <div style={{ width: 40, height: 40, borderRadius: 13, background: c.muted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Lock size={18} color="#6C5CE7" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: c.text }}>{tr.changePassword}</p>
            </div>
            <ChevronRight size={18} color={c.mutedText} />
          </button>
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
              {dark ? <Sun size={18} color="#6C5CE7" /> : <Moon size={18} color="#6C5CE7" />}
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
      </div>

      <div style={{
        flexShrink: 0,
        padding: '12px max(20px, var(--safe-left), var(--safe-right)) calc(16px + max(28px, var(--safe-bottom)))',
        background: c.bg,
      }}>
        <button type="button" onClick={onLogout} style={{
          width: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          height: 52, borderRadius: 16, border: 'none', cursor: 'pointer',
          background: 'rgba(244,67,54,0.12)', color: c.red, fontWeight: 800, fontSize: 15,
        }}>
          <LogOut size={18} color={c.red} />
          {tr.logout}
        </button>
      </div>

      {pwOpen && (
        <ChangePasswordModal
          dark={dark}
          tr={tr}
          onClose={() => setPwOpen(false)}
          onSuccess={onLogout}
        />
      )}
    </div>
  )
}

function ChangePasswordModal({ dark, tr, onClose, onSuccess }: {
  dark: boolean; tr: Translations; onClose: () => void; onSuccess: () => void
}) {
  const c = theme(dark)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNext, setShowNext] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const fieldStyle: CSSProperties = {
    width: '100%', height: 48, borderRadius: 14, border: `1px solid ${c.border}`,
    background: c.muted, color: c.text, padding: '0 14px', fontSize: 16, outline: 'none',
    boxSizing: 'border-box',
  }

  function focusField(el: HTMLElement) {
    // Klaviatura ochilguncha kutib, maydonni ko‘rinadigan joyga suramiz
    window.setTimeout(() => {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' })
      sheetRef.current?.scrollTo({
        top: Math.max(0, el.offsetTop - 24),
        behavior: 'smooth',
      })
    }, 280)
  }

  async function submit() {
    if (!current || !next || !confirm) return
    if (next.length < 6) {
      showToast(tr.passwordTooShort)
      return
    }
    if (next !== confirm) {
      showToast(tr.passwordMismatch)
      return
    }
    setLoading(true)
    try {
      await changePassword(current, next)
      setDone(true)
      showToast(tr.passwordChanged, 'success')
      setTimeout(() => {
        onClose()
        onSuccess()
      }, 1000)
    } catch (e) {
      if (isSessionExpiredError(e)) {
        /* App overlay */
      } else if (e instanceof ApiError && e.status === 401) {
        showToast(tr.wrongCurrentPassword)
      } else {
        showToast(e instanceof Error ? e.message : tr.loginError)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 80,
        background: 'rgba(8,8,18,0.55)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        paddingBottom: 'var(--ime-bottom, 0px)',
        transition: 'padding-bottom 160ms ease-out',
      }}
      onClick={onClose}
    >
      <div
        ref={sheetRef}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480,
          maxHeight: 'calc(100% - 12px)',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          background: c.card,
          borderRadius: '28px 28px 0 0',
          padding: '20px 20px calc(20px + var(--safe-bottom))',
          boxShadow: '0 -12px 40px rgba(0,0,0,0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18 }}>
          <h2 style={{ flex: 1, fontSize: 18, fontWeight: 800, color: c.text, margin: 0 }}>{tr.changePassword}</h2>
          <button type="button" onClick={onClose} style={{
            width: 36, height: 36, borderRadius: 12, border: 'none', cursor: 'pointer',
            background: c.muted, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={18} color={c.mutedText} />
          </button>
        </div>

        {done ? (
          <div style={{
            padding: '28px 16px', textAlign: 'center',
            color: c.green, fontWeight: 800, fontSize: 16,
          }}>
            {tr.passwordChanged}
          </div>
        ) : (
          <>
            <PwField
              label={tr.currentPassword}
              value={current}
              onChange={setCurrent}
              show={showCurrent}
              onToggle={() => setShowCurrent(v => !v)}
              fieldStyle={fieldStyle}
              mutedText={c.mutedText}
              onFocusField={focusField}
            />
            <PwField
              label={tr.newPassword}
              value={next}
              onChange={setNext}
              show={showNext}
              onToggle={() => setShowNext(v => !v)}
              fieldStyle={fieldStyle}
              mutedText={c.mutedText}
              onFocusField={focusField}
            />
            <PwField
              label={tr.confirmPassword}
              value={confirm}
              onChange={setConfirm}
              show={showNext}
              onToggle={() => setShowNext(v => !v)}
              fieldStyle={fieldStyle}
              mutedText={c.mutedText}
              onEnter={submit}
              onFocusField={focusField}
            />

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={onClose} style={{
                flex: 1, height: 50, borderRadius: 14, border: `1px solid ${c.border}`,
                background: c.muted, color: c.text, fontWeight: 700, fontSize: 14, cursor: 'pointer',
              }}>
                {tr.cancel}
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={loading}
                onClick={submit}
                style={{
                  flex: 1.4, height: 50, borderRadius: 14, border: 'none', cursor: loading ? 'wait' : 'pointer',
                  background: 'linear-gradient(135deg, #6C5CE7 0%, #9B59B6 100%)',
                  color: 'white', fontWeight: 800, fontSize: 14, opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? tr.loading : tr.save}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function PwField({ label, value, onChange, show, onToggle, fieldStyle, mutedText, onEnter, onFocusField }: {
  label: string
  value: string
  onChange: (v: string) => void
  show: boolean
  onToggle: () => void
  fieldStyle: CSSProperties
  mutedText: string
  onEnter?: () => void
  onFocusField?: (el: HTMLElement) => void
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: mutedText, marginBottom: 8 }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onEnter?.()}
          onFocus={e => onFocusField?.(e.currentTarget)}
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="new-password"
          style={{ ...fieldStyle, paddingRight: 48 }}
        />
        <button type="button" onClick={onToggle}
          style={{ position: 'absolute', right: 12, top: 12, background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          {show ? <EyeOff size={18} color={mutedText} /> : <Eye size={18} color={mutedText} />}
        </button>
      </div>
    </div>
  )
}

function Section({ title, children, card, border, text }: {
  title: string; children: ReactNode; card: string; border: string; text: string
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
