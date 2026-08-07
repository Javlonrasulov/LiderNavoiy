import { useEffect, useState } from 'react'
import { ArrowLeft, CheckCircle, ChevronDown, Locate, Maximize2, Plus, X } from '../icons'
import {
  createClient,
  createClientCategory,
  createLine,
  fetchClientCategories,
  fetchLines,
  type ClientCategory,
  type SalesLine,
} from '../api/manager'
import { ApiError } from '../api/client'
import type { AuthUser } from '../api/types'
import type { Translations } from '../i18n'
import { theme } from '../theme'
import ClientPinMap from '../components/ClientPinMap'

interface Props {
  dark: boolean
  tr: Translations
  user: AuthUser | null
  onBack: () => void
  onCreated: () => void
}

type ExtraPhone = { phone: string; note: string }
type ModalKind = 'line' | 'category' | null
type PickerKind = 'line' | 'category' | null

function makeLineCode(name: string): string {
  const base = name
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-а-яА-ЯёЁўқғҳЎҚҒҲ\-]/gi, '')
    .slice(0, 40)
  return base || `L${Date.now().toString(36).slice(-6).toUpperCase()}`
}

/** UI: +998 93 559 96 99 */
function formatUzPhone(raw: string): string {
  let digits = raw.replace(/\D/g, '')
  if (digits.startsWith('998')) digits = digits.slice(3)
  else if (digits.startsWith('0')) digits = digits.slice(1)
  digits = digits.slice(0, 9)

  let out = '+998'
  if (digits.length === 0) return out
  out += ` ${digits.slice(0, 2)}`
  if (digits.length > 2) out += ` ${digits.slice(2, 5)}`
  if (digits.length > 5) out += ` ${digits.slice(5, 7)}`
  if (digits.length > 7) out += ` ${digits.slice(7, 9)}`
  return out
}

/** API: +998935599699 */
function phoneToStorage(formatted: string): string | undefined {
  const digits = formatted.replace(/\D/g, '')
  if (!digits || digits === '998') return undefined
  const full = digits.startsWith('998') ? digits : `998${digits}`
  return `+${full.slice(0, 12)}`
}

export default function AddClientScreen({ dark, tr, user, onBack, onCreated }: Props) {
  const c = theme(dark)
  const companyId = user?.companyId ?? undefined

  const [name, setName] = useState('')
  const [fullName, setFullName] = useState('')
  const [inn, setInn] = useState('')
  const [phone, setPhone] = useState('+998')
  const [extraPhones, setExtraPhones] = useState<ExtraPhone[]>([])
  const [address, setAddress] = useState('')
  const [lineCode, setLineCode] = useState('')
  const [category, setCategory] = useState('')
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [radius, setRadius] = useState(100)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [geoLoading, setGeoLoading] = useState(false)
  const [mapFullscreen, setMapFullscreen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [lines, setLines] = useState<SalesLine[]>([])
  const [linesLoading, setLinesLoading] = useState(true)
  const [categories, setCategories] = useState<ClientCategory[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)

  const [modal, setModal] = useState<ModalKind>(null)
  const [modalName, setModalName] = useState('')
  const [modalSaving, setModalSaving] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const [picker, setPicker] = useState<PickerKind>(null)

  useEffect(() => {
    void (async () => {
      setLinesLoading(true)
      setCategoriesLoading(true)
      try {
        const [l, cats] = await Promise.all([
          fetchLines(companyId),
          fetchClientCategories(companyId),
        ])
        setLines(Array.isArray(l) ? l : [])
        setCategories(Array.isArray(cats) ? cats : [])
      } catch {
        setLines([])
        setCategories([])
      } finally {
        setLinesLoading(false)
        setCategoriesLoading(false)
      }
    })()
  }, [companyId])

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

  const openModal = (kind: ModalKind) => {
    setModal(kind)
    setModalName('')
    setModalError(null)
  }

  const saveModal = async () => {
    const value = modalName.trim()
    if (!value) {
      setModalError(modal === 'line' ? tr.lineName : tr.categoryName)
      return
    }
    setModalSaving(true)
    setModalError(null)
    try {
      if (modal === 'line') {
        const created = await createLine({
          name: value,
          code: makeLineCode(value),
          companyId,
        })
        setLines(prev => {
          const next = [...prev.filter(l => l.id !== created.id), created]
          next.sort((a, b) => a.code.localeCompare(b.code))
          return next
        })
        setLineCode(created.code)
      } else if (modal === 'category') {
        const created = await createClientCategory({ name: value, companyId })
        setCategories(prev => {
          const next = [...prev.filter(x => x.id !== created.id), created]
          next.sort((a, b) => a.name.localeCompare(b.name))
          return next
        })
        setCategory(created.name)
      }
      setModal(null)
      setModalName('')
    } catch (e) {
      setModalError(e instanceof ApiError ? e.message : tr.loginError)
    } finally {
      setModalSaving(false)
    }
  }

  const useMyLocation = () => {
    setGeoError(null)
    if (!navigator.geolocation) {
      setGeoError(tr.locationOff)
      return
    }
    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude)
        setLng(pos.coords.longitude)
        setGeoLoading(false)
      },
      (err) => {
        setGeoLoading(false)
        if (err.code === err.PERMISSION_DENIED) setGeoError(tr.locationDenied)
        else setGeoError(tr.locationOff)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  }

  const submit = async () => {
    if (!name.trim()) {
      setError(tr.name)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const phoneClean = phoneToStorage(phone)
      const extras = extraPhones
        .map(p => ({
          phone: phoneToStorage(p.phone) || '',
          note: p.note.trim() || undefined,
        }))
        .filter(p => !!p.phone)
      await createClient({
        name: name.trim(),
        fullName: fullName.trim() || undefined,
        inn: inn.trim() || undefined,
        phone: phoneClean,
        extraPhones: extras.length ? extras : undefined,
        address: address.trim() || undefined,
        companyId,
        lineCode: lineCode.trim() || undefined,
        category: category.trim() || undefined,
        latitude: lat ?? undefined,
        longitude: lng ?? undefined,
        orderRadiusMeters: radius,
      })
      onCreated()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : tr.loginError)
    } finally {
      setLoading(false)
    }
  }

  const headerBtn = (label: string, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      style={{
        height: 40, padding: '0 12px', borderRadius: 12, border: 'none',
        background: 'rgba(99,102,241,0.14)', color: c.primary,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        fontWeight: 800, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
        width: '100%',
      }}
    >
      <Plus size={14} color={c.primary} />
      {label}
    </button>
  )

  const inputStyle = {
    width: '100%', height: 48, borderRadius: 14, border: `1px solid ${c.border}`,
    background: c.muted, color: c.text, padding: '0 14px', fontSize: 14, fontWeight: 600, outline: 'none',
  }

  const selectedLine = lines.find(l => l.code === lineCode)
  const lineLabel = selectedLine
    ? (selectedLine.name + (selectedLine.code && selectedLine.code !== selectedLine.name ? ` (${selectedLine.code})` : ''))
    : ''

  const pickerField = (
    label: string,
    valueLabel: string,
    placeholder: string,
    loading: boolean,
    onOpen: () => void,
  ) => (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 12, fontWeight: 700, color: c.mutedText, display: 'block', marginBottom: 6 }}>
        {label}
      </label>
      <button
        type="button"
        disabled={loading}
        onClick={onOpen}
        style={{
          width: '100%', height: 48, borderRadius: 14, border: `1px solid ${c.border}`,
          background: c.muted, padding: '0 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          cursor: loading ? 'wait' : 'pointer', textAlign: 'left',
        }}
      >
        <span style={{
          flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600,
          color: valueLabel ? c.text : c.mutedText,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {loading ? tr.loading : (valueLabel || placeholder)}
        </span>
        <ChevronDown size={18} color={c.mutedText} />
      </button>
    </div>
  )

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 60, background: c.bg,
      overflowY: 'auto', animation: 'slideUp 0.35s ease both',
    }} className="no-scrollbar">
      <div style={{
        padding: 'var(--header-pad-top) max(16px, var(--safe-left)) 10px max(16px, var(--safe-right))',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <button type="button" onClick={onBack} style={{
            width: 40, height: 40, borderRadius: 13, border: 'none', background: c.muted,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
          }}>
            <ArrowLeft size={18} color={c.text} />
          </button>
          <h1 style={{ flex: 1, fontSize: 20, fontWeight: 800, color: c.text, margin: 0 }}>{tr.addClient}</h1>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {headerBtn(tr.addLine, () => openModal('line'))}
          {headerBtn(tr.addCategory, () => openModal('category'))}
        </div>
      </div>

      <div style={{ padding: '8px 20px calc(40px + var(--safe-bottom))' }}>
        {field(tr.name, name, setName, true)}
        {field(tr.fullName, fullName, setFullName)}
        {field(tr.inn, inn, setInn)}

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: c.mutedText, display: 'block', marginBottom: 6 }}>
            {tr.phone}
          </label>
          <input
            value={phone}
            onChange={e => setPhone(formatUzPhone(e.target.value))}
            inputMode="tel"
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: c.mutedText }}>{tr.extraPhone}</label>
            <button
              type="button"
              onClick={() => setExtraPhones(prev => [...prev, { phone: '+998', note: '' }])}
              style={{
                width: 32, height: 32, borderRadius: 10, border: 'none',
                background: 'rgba(99,102,241,0.14)', color: c.primary,
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}
              title={tr.addExtraPhone}
            >
              <Plus size={16} color={c.primary} />
            </button>
          </div>
          {extraPhones.map((row, idx) => (
            <div key={idx} style={{
              marginBottom: 8, padding: 10, borderRadius: 14,
              border: `1px solid ${c.border}`, background: dark ? '#1A1A2E' : '#F9FAFB',
            }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input
                  value={row.phone}
                  onChange={e => {
                    const v = formatUzPhone(e.target.value)
                    setExtraPhones(prev => prev.map((p, i) => i === idx ? { ...p, phone: v } : p))
                  }}
                  inputMode="tel"
                  placeholder={tr.extraPhone}
                  style={{ ...inputStyle, flex: 1, height: 42 }}
                />
                <button
                  type="button"
                  onClick={() => setExtraPhones(prev => prev.filter((_, i) => i !== idx))}
                  style={{
                    width: 42, height: 42, borderRadius: 12, border: 'none',
                    background: 'rgba(244,67,54,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  }}
                >
                  <X size={14} color={c.red} />
                </button>
              </div>
              <input
                value={row.note}
                onChange={e => {
                  const v = e.target.value
                  setExtraPhones(prev => prev.map((p, i) => i === idx ? { ...p, note: v } : p))
                }}
                placeholder={tr.extraPhoneNote}
                style={{ ...inputStyle, height: 42 }}
              />
            </div>
          ))}
        </div>

        {field(tr.address, address, setAddress)}

        {pickerField(tr.line, lineLabel, tr.lineSelect, linesLoading, () => setPicker('line'))}
        {pickerField(tr.category, category, tr.categorySelect, categoriesLoading, () => setPicker('category'))}

        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: c.mutedText }}>{tr.mapTitle}</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: c.mutedText }}>{tr.clientMapHint}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <button
                type="button"
                onClick={useMyLocation}
                disabled={geoLoading}
                style={{
                  height: 36, padding: '0 10px', borderRadius: 12, border: 'none',
                  background: 'rgba(16,185,129,0.14)', color: '#059669',
                  display: 'flex', alignItems: 'center', gap: 5,
                  fontWeight: 800, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap',
                  opacity: geoLoading ? 0.7 : 1,
                }}
              >
                <Locate size={14} color="#059669" />
                {geoLoading ? tr.loading : tr.myLocation}
              </button>
              <button
                type="button"
                onClick={() => setMapFullscreen(true)}
                title={tr.mapFullscreen}
                style={{
                  width: 36, height: 36, borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: c.muted, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Maximize2 size={15} color={c.text} />
              </button>
            </div>
          </div>

          {geoError && (
            <div style={{ marginBottom: 8, padding: 10, borderRadius: 12, background: 'rgba(244,67,54,0.12)', color: c.red, fontSize: 12, fontWeight: 600 }}>
              {geoError}
            </div>
          )}

          {!mapFullscreen && (
            <ClientPinMap
              lat={lat}
              lng={lng}
              radiusMeters={radius}
              dark={dark}
              onPick={(a, b) => { setLat(a); setLng(b); setGeoError(null) }}
            />
          )}

          <div style={{ marginTop: 10 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: c.mutedText, display: 'block', marginBottom: 6 }}>
              {tr.orderRadius}: {radius} m
            </label>
            <input
              type="range"
              min={50}
              max={500}
              step={10}
              value={radius}
              onChange={e => setRadius(Number(e.target.value))}
              style={{ width: '100%' }}
            />
            <p style={{ margin: '4px 0 0', fontSize: 11, color: c.mutedText, lineHeight: 1.4 }}>{tr.orderRadiusHint}</p>
          </div>
        </div>

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

      {mapFullscreen && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 80, background: c.bg,
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{
            padding: 'var(--header-pad-top) max(16px, var(--safe-left)) 10px max(16px, var(--safe-right))',
            display: 'flex', alignItems: 'center', gap: 10,
            borderBottom: `1px solid ${c.border}`,
          }}>
            <button
              type="button"
              onClick={() => setMapFullscreen(false)}
              style={{
                width: 40, height: 40, borderRadius: 13, border: 'none', background: c.muted,
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}
            >
              <X size={18} color={c.text} />
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: c.text }}>{tr.mapTitle}</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: c.mutedText }}>{tr.clientMapHint}</p>
            </div>
            <button
              type="button"
              onClick={useMyLocation}
              disabled={geoLoading}
              style={{
                height: 36, padding: '0 10px', borderRadius: 12, border: 'none',
                background: 'rgba(16,185,129,0.14)', color: '#059669',
                display: 'flex', alignItems: 'center', gap: 5,
                fontWeight: 800, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              <Locate size={14} color="#059669" />
              {geoLoading ? tr.loading : tr.myLocation}
            </button>
          </div>

          {geoError && (
            <div style={{ margin: '8px 16px 0', padding: 10, borderRadius: 12, background: 'rgba(244,67,54,0.12)', color: c.red, fontSize: 12, fontWeight: 600 }}>
              {geoError}
            </div>
          )}

          <div style={{ flex: 1, minHeight: 0 }}>
            <ClientPinMap
              lat={lat}
              lng={lng}
              radiusMeters={radius}
              dark={dark}
              height="100%"
              borderRadius={0}
              onPick={(a, b) => { setLat(a); setLng(b); setGeoError(null) }}
            />
          </div>

          <div style={{
            padding: '12px 16px calc(16px + var(--safe-bottom))',
            borderTop: `1px solid ${c.border}`,
            background: c.card,
          }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: c.mutedText, display: 'block', marginBottom: 6 }}>
              {tr.orderRadius}: {radius} m
            </label>
            <input
              type="range"
              min={50}
              max={500}
              step={10}
              value={radius}
              onChange={e => setRadius(Number(e.target.value))}
              style={{ width: '100%' }}
            />
            <button
              type="button"
              onClick={() => setMapFullscreen(false)}
              style={{
                marginTop: 12, width: '100%', height: 48, border: 'none', borderRadius: 14,
                background: c.primary, color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer',
              }}
            >
              {tr.save}
            </button>
          </div>
        </div>
      )}

      {picker && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 70,
          background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-end',
        }}>
          <div style={{
            width: '100%', maxHeight: '70%', display: 'flex', flexDirection: 'column',
            background: c.card, borderRadius: '24px 24px 0 0',
            padding: '16px 16px calc(20px + var(--safe-bottom))',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: c.text }}>
                {picker === 'line' ? tr.lineSelect : tr.categorySelect}
              </p>
              <button
                type="button"
                onClick={() => setPicker(null)}
                style={{
                  width: 36, height: 36, borderRadius: 12, border: 'none', background: c.muted,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                }}
              >
                <X size={16} color={c.text} />
              </button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }} className="no-scrollbar">
              <button
                type="button"
                onClick={() => {
                  if (picker === 'line') setLineCode('')
                  else setCategory('')
                  setPicker(null)
                }}
                style={{
                  width: '100%', padding: '14px 14px', borderRadius: 14, cursor: 'pointer', textAlign: 'left',
                  border: `1px solid ${c.border}`,
                  background: (picker === 'line' ? !lineCode : !category) ? 'rgba(99,102,241,0.12)' : (dark ? '#1A1A2E' : '#F9FAFB'),
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 700, color: c.mutedText }}>—</span>
              </button>

              {picker === 'line' && lines.length === 0 && (
                <p style={{ textAlign: 'center', color: c.mutedText, padding: 20, fontSize: 13, fontWeight: 600 }}>
                  {tr.noData}
                </p>
              )}
              {picker === 'category' && categories.length === 0 && (
                <p style={{ textAlign: 'center', color: c.mutedText, padding: 20, fontSize: 13, fontWeight: 600 }}>
                  {tr.noData}
                </p>
              )}

              {picker === 'line' && lines.map(line => {
                const selected = line.code === lineCode
                const label = line.name + (line.code && line.code !== line.name ? ` (${line.code})` : '')
                return (
                  <button
                    key={line.id}
                    type="button"
                    onClick={() => { setLineCode(line.code); setPicker(null) }}
                    style={{
                      width: '100%', padding: '14px 14px', borderRadius: 14, cursor: 'pointer', textAlign: 'left',
                      border: `1px solid ${selected ? 'rgba(99,102,241,0.45)' : c.border}`,
                      background: selected ? 'rgba(99,102,241,0.12)' : (dark ? '#1A1A2E' : '#F9FAFB'),
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                    }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 700, color: c.text }}>{label}</span>
                    {selected ? <CheckCircle size={18} color={c.primary} /> : null}
                  </button>
                )
              })}

              {picker === 'category' && categories.map(cat => {
                const selected = cat.name === category
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => { setCategory(cat.name); setPicker(null) }}
                    style={{
                      width: '100%', padding: '14px 14px', borderRadius: 14, cursor: 'pointer', textAlign: 'left',
                      border: `1px solid ${selected ? 'rgba(99,102,241,0.45)' : c.border}`,
                      background: selected ? 'rgba(99,102,241,0.12)' : (dark ? '#1A1A2E' : '#F9FAFB'),
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                    }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 700, color: c.text }}>{cat.name}</span>
                    {selected ? <CheckCircle size={18} color={c.primary} /> : null}
                  </button>
                )
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                const kind = picker
                setPicker(null)
                openModal(kind)
              }}
              style={{
                marginTop: 12, width: '100%', height: 48, borderRadius: 14, border: 'none',
                background: 'rgba(99,102,241,0.14)', color: c.primary,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                fontWeight: 800, fontSize: 14, cursor: 'pointer',
              }}
            >
              <Plus size={16} color={c.primary} />
              {picker === 'line' ? tr.addLine : tr.addCategory}
            </button>
          </div>
        </div>
      )}

      {modal && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 70,
          background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-end',
        }}>
          <div style={{
            width: '100%', background: c.card, borderRadius: '24px 24px 0 0',
            padding: '16px 16px calc(20px + var(--safe-bottom))',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: c.text }}>
                {modal === 'line' ? tr.addLine : tr.addCategory}
              </p>
              <button
                type="button"
                onClick={() => setModal(null)}
                style={{
                  width: 36, height: 36, borderRadius: 12, border: 'none', background: c.muted,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                }}
              >
                <X size={16} color={c.text} />
              </button>
            </div>

            {user?.companyName ? (
              <p style={{ margin: '0 0 12px', fontSize: 12, color: c.mutedText, fontWeight: 600 }}>
                {user.companyName}
              </p>
            ) : null}

            <label style={{ fontSize: 12, fontWeight: 700, color: c.mutedText, display: 'block', marginBottom: 6 }}>
              {(modal === 'line' ? tr.lineName : tr.categoryName)} *
            </label>
            <input
              value={modalName}
              onChange={e => setModalName(e.target.value)}
              autoFocus
              placeholder={modal === 'line' ? tr.lineName : tr.categoryName}
              style={inputStyle}
            />

            {modalError && (
              <div style={{ marginTop: 10, padding: 10, borderRadius: 12, background: 'rgba(244,67,54,0.12)', color: c.red, fontSize: 12, fontWeight: 600 }}>
                {modalError}
              </div>
            )}

            <button
              type="button"
              disabled={modalSaving}
              onClick={() => void saveModal()}
              style={{
                marginTop: 14, width: '100%', height: 50, border: 'none', borderRadius: 14,
                background: c.primary, color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer',
                opacity: modalSaving ? 0.7 : 1,
              }}
            >
              {modalSaving ? tr.loading : tr.save}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
