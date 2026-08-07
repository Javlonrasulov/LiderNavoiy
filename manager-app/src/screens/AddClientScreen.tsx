import { useState } from 'react'
import { ArrowLeft } from '../icons'
import { createClient } from '../api/manager'
import { ApiError } from '../api/client'
import type { Translations } from '../i18n'
import { theme } from '../theme'

interface Props {
  dark: boolean
  tr: Translations
  onBack: () => void
  onCreated: () => void
}

export default function AddClientScreen({ dark, tr, onBack, onCreated }: Props) {
  const c = theme(dark)
  const [name, setName] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [lineCode, setLineCode] = useState('')
  const [category, setCategory] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const field = (label: string, value: string, set: (v: string) => void, required = false) => (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 12, fontWeight: 700, color: c.mutedText, display: 'block', marginBottom: 6 }}>
        {label}{required ? ' *' : ''}
      </label>
      <input
        value={value}
        onChange={e => set(e.target.value)}
        style={{
          width: '100%', height: 48, borderRadius: 14, border: `1px solid ${c.border}`,
          background: c.muted, color: c.text, padding: '0 14px', fontSize: 14, fontWeight: 600, outline: 'none',
        }}
      />
    </div>
  )

  const submit = async () => {
    if (!name.trim()) {
      setError(tr.name)
      return
    }
    setLoading(true)
    setError(null)
    try {
      await createClient({
        name: name.trim(),
        fullName: fullName.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        lineCode: lineCode.trim() || undefined,
        category: category.trim() || undefined,
        contactPerson: contactPerson.trim() || undefined,
      })
      onCreated()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : tr.loginError)
    } finally {
      setLoading(false)
    }
  }

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
        <h1 style={{ fontSize: 20, fontWeight: 800, color: c.text }}>{tr.addClient}</h1>
      </div>

      <div style={{ padding: '8px 20px calc(40px + var(--safe-bottom))' }}>
        {field(tr.name, name, setName, true)}
        {field(tr.fullName, fullName, setFullName)}
        {field(tr.phone, phone, setPhone)}
        {field(tr.address, address, setAddress)}
        {field(tr.line, lineCode, setLineCode)}
        {field(tr.category, category, setCategory)}
        {field(tr.contactPerson, contactPerson, setContactPerson)}

        {error && (
          <div style={{ marginBottom: 12, padding: 12, borderRadius: 14, background: 'rgba(244,67,54,0.12)', color: c.red, fontSize: 13, fontWeight: 600 }}>
            {error}
          </div>
        )}

        <button type="button" className="btn-primary" disabled={loading} onClick={() => void submit()}
          style={{ width: '100%', height: 52, border: 'none', cursor: 'pointer', fontSize: 15, opacity: loading ? 0.7 : 1, marginTop: 8 }}>
          {loading ? tr.loading : tr.save}
        </button>
        <button type="button" onClick={onBack}
          style={{ width: '100%', height: 48, marginTop: 10, border: 'none', borderRadius: 16, background: c.muted, color: c.mutedText, fontWeight: 700, cursor: 'pointer' }}>
          {tr.cancel}
        </button>
      </div>
    </div>
  )
}
