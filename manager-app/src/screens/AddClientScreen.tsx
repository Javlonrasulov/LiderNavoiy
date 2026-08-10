import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera'
import { Capacitor } from '@capacitor/core'
import { ArrowLeft, Camera, CheckCircle, ChevronDown, ImageIcon, Locate, Maximize2, Pencil, Plus, X } from '../icons'
import { pushBackHandler } from '../utils/hardwareBack'
import {
  createClient,
  createClientCategory,
  createLine,
  fetchClient,
  fetchClientCategories,
  fetchClients,
  fetchLines,
  resolveMediaUrl,
  resubmitClientRequest,
  updateClient,
  updateClientCategory,
  updateLine,
  uploadClientPhoto,
  type ClientCategory,
  type SalesLine,
} from '../api/manager'
import { ApiError } from '../api/client'
import type { AuthUser, Client } from '../api/types'
import type { Translations } from '../i18n'
import { localizeApiError } from '../i18n'
import { theme } from '../theme'
import ClientPinMap from '../components/ClientPinMap'
import { showToast } from '../components/Toast'
import {
  findBestSimilarityMatch,
  similarityRisk,
  similarityRiskColors,
  type SimilarityFieldKey,
  type SimilarityMatch,
} from '../utils/clientSimilarity'
import { managerCompanyId } from '../utils/staffScope'

interface Props {
  dark: boolean
  tr: Translations
  user: AuthUser | null
  editClient?: Client | null
  /** Bekor qilingan so‘rovni qayta yuborish */
  resubmitRequestId?: string | null
  onBack: () => void
  onCreated: (result?: { message: string; kind?: 'success' | 'error' | 'info' }) => void
}

type ExtraPhone = { phone: string; note: string }
type ModalKind = 'line' | 'category' | null
type PickerKind = 'line' | 'category' | null

type SaveBody = {
  name: string
  fullName: string
  inn?: string
  phone: string
  extraPhones: { phone: string; note?: string }[]
  address: string
  territory?: string
  photoUrl?: string
  markColor?: string | null
  companyId?: string
  lineCode: string
  category: string
  latitude: number
  longitude: number
  orderRadiusMeters: number
  canSeePromotions: boolean
}

/** Keyingi raqamli kod: 01, 02, 03… (nom emas) */
function nextNumericLineCode(existing: { code: string }[]): string {
  let max = 0
  for (const row of existing) {
    const code = row.code?.trim() ?? ''
    if (!/^\d+$/.test(code)) continue
    const n = parseInt(code, 10)
    if (n > max) max = n
  }
  return String(max + 1).padStart(2, '0')
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

export default function AddClientScreen({
  dark, tr, user, editClient = null, resubmitRequestId = null, onBack, onCreated,
}: Props) {
  const c = theme(dark)
  const companyId = managerCompanyId(user) || user?.companyId || undefined
  // create/update uchun bitta org
  const primaryCompanyId = user?.companyIds?.[0] || user?.companyId || undefined
  const isResubmit = !!resubmitRequestId
  const isEdit = !!editClient?.id && !isResubmit

  const [name, setName] = useState('')
  const [fullName, setFullName] = useState('')
  const [inn, setInn] = useState('')
  const [phone, setPhone] = useState('+998')
  const [extraPhones, setExtraPhones] = useState<ExtraPhone[]>([])
  const [address, setAddress] = useState('')
  const [territory, setTerritory] = useState('')
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [lineCode, setLineCode] = useState('')
  const [category, setCategory] = useState('')
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [radius, setRadius] = useState(100)
  const [canSeePromotions, setCanSeePromotions] = useState(false)
  const [markColor, setMarkColor] = useState<'green' | 'yellow' | 'red'>('green')
  const [geoLoading, setGeoLoading] = useState(false)
  const [mapFullscreen, setMapFullscreen] = useState(false)
  const [photoFullscreen, setPhotoFullscreen] = useState(false)
  const [similarityMatch, setSimilarityMatch] = useState<SimilarityMatch | null>(null)
  const [pendingBody, setPendingBody] = useState<SaveBody | null>(null)
  const [loading, setLoading] = useState(false)
  const [prefillLoading, setPrefillLoading] = useState(isEdit)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  const dupFieldLabel = (key: SimilarityFieldKey): string => {
    switch (key) {
      case 'name': return tr.dupFieldName
      case 'fullName': return tr.dupFieldFullName
      case 'phone': return tr.dupFieldPhone
      case 'inn': return tr.dupFieldInn
      case 'address': return tr.dupFieldAddress
      case 'territory': return tr.dupFieldTerritory
      case 'lineCode': return tr.dupFieldLine
    }
  }

  const [lines, setLines] = useState<SalesLine[]>([])
  const [linesLoading, setLinesLoading] = useState(true)
  const [categories, setCategories] = useState<ClientCategory[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)

  const [modal, setModal] = useState<ModalKind>(null)
  const [modalName, setModalName] = useState('')
  const [modalEditId, setModalEditId] = useState<string | null>(null)
  const [modalSaving, setModalSaving] = useState(false)
  const [picker, setPicker] = useState<PickerKind>(null)
  const modalSheetRef = useRef<HTMLDivElement>(null)
  const modalInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    return pushBackHandler(() => {
      if (similarityMatch) {
        setSimilarityMatch(null)
        setPendingBody(null)
        return true
      }
      if (photoFullscreen) {
        setPhotoFullscreen(false)
        return true
      }
      if (mapFullscreen) {
        setMapFullscreen(false)
        return true
      }
      if (modal) {
        setModal(null)
        setModalEditId(null)
        setModalName('')
        return true
      }
      if (picker) {
        setPicker(null)
        return true
      }
      return false
    })
  }, [similarityMatch, photoFullscreen, mapFullscreen, modal, picker])

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

  useEffect(() => {
    if (!editClient) {
      setPrefillLoading(false)
      return
    }

    let cancelled = false
    const apply = (cl: Client) => {
      setName(cl.name || '')
      setFullName(cl.fullName || '')
      setInn(cl.inn || '')
      setPhone(formatUzPhone(cl.phone || '+998'))
      setExtraPhones(
        Array.isArray(cl.extraPhones)
          ? cl.extraPhones
              .filter(p => p?.phone)
              .map(p => ({ phone: formatUzPhone(p.phone), note: p.note || '' }))
          : [],
      )
      setAddress(cl.address || '')
      setTerritory(cl.territory || '')
      setPhotoUrl(cl.photoUrl || null)
      setPhotoPreview(cl.photoUrl ? resolveMediaUrl(cl.photoUrl) : null)
      setLineCode(cl.lineCode || '')
      setCategory(cl.category || '')
      setLat(cl.latitude ?? null)
      setLng(cl.longitude ?? null)
      setRadius(
        cl.orderRadiusMeters != null && Number(cl.orderRadiusMeters) >= 50
          ? Math.round(Number(cl.orderRadiusMeters))
          : 100,
      )
      setCanSeePromotions(cl.canSeePromotions === true)
      const mc = cl.markColor?.trim().toLowerCase()
      setMarkColor(mc === 'yellow' || mc === 'red' ? mc : 'green')
    }

    apply(editClient)

    if (isResubmit) {
      setPrefillLoading(false)
      return
    }

    if (!editClient.id) {
      setPrefillLoading(false)
      return
    }

    setPrefillLoading(true)
    void fetchClient(editClient.id)
      .then(full => {
        if (!cancelled) apply(full)
      })
      .catch(() => { /* list dagi ma'lumot bilan davom */ })
      .finally(() => {
        if (!cancelled) setPrefillLoading(false)
      })

    return () => { cancelled = true }
  }, [editClient?.id, isResubmit]) // eslint-disable-line react-hooks/exhaustive-deps

  // Modal/picker ochiqda fon scroll qulflansin; input fokus (klaviatura tepadagi dialogni yopmasin)
  useEffect(() => {
    if (!modal && !picker) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    if (modal) {
      const t = window.setTimeout(() => {
        modalInputRef.current?.focus({ preventScroll: true })
      }, 80)
      return () => {
        window.clearTimeout(t)
        document.body.style.overflow = prev
      }
    }
    return () => { document.body.style.overflow = prev }
  }, [modal, picker])

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

  const openModal = (kind: ModalKind, edit?: { id: string; name: string }) => {
    if (!kind) return
    setPicker(null)
    setMapFullscreen(false)
    setModal(kind)
    setModalEditId(edit?.id ?? null)
    setModalName(edit?.name ?? '')
  }

  const saveModal = async () => {
    const value = modalName.trim()
    if (!value) {
      showToast(modal === 'line' ? tr.lineName : tr.categoryName)
      return
    }
    setModalSaving(true)
    try {
      if (modal === 'line') {
        if (modalEditId) {
          const updated = await updateLine(modalEditId, { name: value })
          setLines(prev => {
            const next = [...prev.filter(l => l.id !== updated.id), updated]
            next.sort((a, b) => a.name.localeCompare(b.name))
            return next
          })
          showToast(tr.lineUpdated, 'success')
        } else {
          const created = await createLine({
            name: value,
            code: nextNumericLineCode(lines),
            companyId: primaryCompanyId,
          })
          setLines(prev => {
            const next = [...prev.filter(l => l.id !== created.id), created]
            next.sort((a, b) => a.name.localeCompare(b.name))
            return next
          })
          setLineCode(created.code)
          showToast(tr.lineSaved, 'success')
        }
      } else if (modal === 'category') {
        if (modalEditId) {
          const prevName = categories.find(c => c.id === modalEditId)?.name
          const updated = await updateClientCategory(modalEditId, { name: value })
          setCategories(prev => {
            const next = [...prev.filter(x => x.id !== updated.id), updated]
            next.sort((a, b) => a.name.localeCompare(b.name))
            return next
          })
          if (category === prevName || category === updated.name) {
            setCategory(updated.name)
          }
          showToast(tr.categoryUpdated, 'success')
        } else {
          const created = await createClientCategory({ name: value, companyId: primaryCompanyId })
          setCategories(prev => {
            const next = [...prev.filter(x => x.id !== created.id), created]
            next.sort((a, b) => a.name.localeCompare(b.name))
            return next
          })
          setCategory(created.name)
          showToast(tr.categorySaved, 'success')
        }
      }
      setModal(null)
      setModalName('')
      setModalEditId(null)
    } catch (e) {
      showToast(e instanceof ApiError ? localizeApiError(e.message, tr) : tr.loginError)
    } finally {
      setModalSaving(false)
    }
  }

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      showToast(tr.locationOff)
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
        showToast(err.code === err.PERMISSION_DENIED ? tr.locationDenied : tr.locationOff)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  }

  const reqMsg = (field: string) => tr.fieldRequired.replace('{field}', field)

  const uploadBlob = async (blob: Blob, filename: string) => {
    setPhotoUploading(true)
    try {
      const url = await uploadClientPhoto(blob, filename)
      setPhotoUrl(url)
      setPhotoPreview(resolveMediaUrl(url))
    } catch {
      showToast(tr.photoUploadFailed)
    } finally {
      setPhotoUploading(false)
    }
  }

  const pickPhoto = async (source: 'camera' | 'gallery') => {
    if (!Capacitor.isNativePlatform() && source === 'gallery') {
      galleryInputRef.current?.click()
      return
    }
    if (!Capacitor.isNativePlatform() && source === 'camera') {
      galleryInputRef.current?.click()
      return
    }
    try {
      const photo = await CapCamera.getPhoto({
        quality: 80,
        resultType: CameraResultType.Uri,
        source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
        correctOrientation: true,
      })
      const path = photo.webPath || photo.path
      if (!path) return
      const blob = await fetch(path).then(r => r.blob())
      const filename = `photo.${photo.format || 'jpg'}`
      setPhotoPreview(path)
      await uploadBlob(blob, filename)
    } catch {
      /* user cancelled */
    }
  }

  const onGalleryFile = async (file: File | undefined) => {
    if (!file) return
    setPhotoPreview(URL.createObjectURL(file))
    await uploadBlob(file, file.name || 'photo.jpg')
  }

  const persistClient = async (body: SaveBody) => {
    setLoading(true)
    try {
      if (isResubmit && resubmitRequestId) {
        const result = await resubmitClientRequest(resubmitRequestId, {
          name: body.name,
          fullName: body.fullName,
          phone: body.phone,
          address: body.address,
          territory: body.territory,
          photoUrl: body.photoUrl,
          markColor: body.markColor ?? 'green',
          companyId: body.companyId,
          lineCode: body.lineCode,
          category: body.category,
          inn: body.inn,
          latitude: body.latitude,
          longitude: body.longitude,
          canSeePromotions: body.canSeePromotions,
        })
        const pending = (result as { status?: string }).status === 'pending'
        onCreated({
          message: pending ? tr.clientRequestSubmitted : tr.clientCreated,
          kind: 'success',
        })
      } else if (isEdit && editClient) {
        const updated = await updateClient(editClient.id, body)
        const pending = updated.status === 'pending'
        onCreated({
          message: pending ? tr.clientRequestSubmitted : tr.clientUpdated,
          kind: 'success',
        })
      } else {
        const created = await createClient({
          ...body,
          extraPhones: body.extraPhones.length ? body.extraPhones : undefined,
        })
        const pending = created.status === 'pending'
        onCreated({
          message: pending ? tr.clientRequestSubmitted : tr.clientCreated,
          kind: 'success',
        })
      }
    } catch (e) {
      showToast(e instanceof ApiError ? localizeApiError(e.message, tr) : tr.loginError)
    } finally {
      setLoading(false)
      setSimilarityMatch(null)
      setPendingBody(null)
    }
  }

  const submit = async () => {
    if (!name.trim()) {
      showToast(reqMsg(tr.name))
      return
    }
    if (!fullName.trim()) {
      showToast(reqMsg(tr.fullName))
      return
    }
    const phoneClean = phoneToStorage(phone)
    if (!phoneClean || phoneClean.length < 13) {
      showToast(tr.phoneInvalid)
      return
    }
    if (!address.trim()) {
      showToast(reqMsg(tr.address))
      return
    }
    if (!lineCode.trim()) {
      showToast(reqMsg(tr.line))
      return
    }
    if (!category.trim()) {
      showToast(reqMsg(tr.category))
      return
    }
    if (lat == null || lng == null) {
      showToast(tr.locationRequired)
      return
    }

    const extras = extraPhones
      .map(p => ({
        phone: phoneToStorage(p.phone) || '',
        note: p.note.trim() || undefined,
      }))
      .filter(p => !!p.phone)

    const body: SaveBody = {
      name: name.trim(),
      fullName: fullName.trim(),
      inn: inn.trim() || undefined,
      phone: phoneClean,
      extraPhones: extras,
      address: address.trim(),
      territory: territory.trim() || undefined,
      photoUrl: photoUrl || undefined,
      markColor,
      companyId: primaryCompanyId,
      lineCode: lineCode.trim(),
      category: category.trim(),
      latitude: lat,
      longitude: lng,
      orderRadiusMeters: radius,
      canSeePromotions,
    }

    // Edit — o‘xshashlik dialogisiz
    if (isEdit && !isResubmit) {
      await persistClient(body)
      return
    }

    setLoading(true)
    try {
      const list = await fetchClients(companyId).catch(() => [] as Client[])
      const match = findBestSimilarityMatch(
        {
          name: body.name,
          fullName: body.fullName,
          phone: body.phone,
          inn: body.inn,
          address: body.address,
          territory: body.territory,
          lineCode: body.lineCode,
        },
        Array.isArray(list) ? list : [],
        { excludeClientId: isResubmit ? editClient?.id : undefined },
      )
      if (match) {
        setPendingBody(body)
        setSimilarityMatch(match)
        setLoading(false)
        return
      }
      await persistClient(body)
    } catch (e) {
      setLoading(false)
      showToast(e instanceof ApiError ? localizeApiError(e.message, tr) : tr.loginError)
    }
  }

  const confirmAddAnyway = () => {
    if (!pendingBody) return
    void persistClient(pendingBody)
  }

  const dismissSimilarity = () => {
    setSimilarityMatch(null)
    setPendingBody(null)
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
  const lineLabel = selectedLine?.name ?? ''

  const pickerField = (
    label: string,
    valueLabel: string,
    placeholder: string,
    loading: boolean,
    onOpen: () => void,
    required = false,
  ) => (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 12, fontWeight: 700, color: c.mutedText, display: 'block', marginBottom: 6 }}>
        {label}{required ? ' *' : ''}
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
      overflowY: 'auto', animation: 'slideUp 0.35s ease',
      paddingBottom: 'var(--ime-bottom, 0px)',
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
          <h1 style={{ flex: 1, fontSize: 20, fontWeight: 800, color: c.text, margin: 0 }}>
            {isResubmit ? tr.clientReqResubmit : isEdit ? tr.editClient : tr.addClient}
          </h1>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {headerBtn(tr.addLine, () => openModal('line'))}
          {headerBtn(tr.addCategory, () => openModal('category'))}
        </div>
      </div>

      <div style={{ padding: '8px 20px calc(28px + max(28px, var(--safe-bottom)))' }}>
        {prefillLoading ? (
          <p style={{ textAlign: 'center', color: c.mutedText, padding: 32 }}>{tr.loading}</p>
        ) : (
          <>
        {field(tr.name, name, setName, true)}
        {field(tr.fullName, fullName, setFullName, true)}

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: c.mutedText, display: 'block', marginBottom: 6 }}>
            {tr.inn}
          </label>
          <input
            value={inn}
            onChange={e => setInn(e.target.value.replace(/\D/g, '').slice(0, 14))}
            inputMode="numeric"
            pattern="[0-9]*"
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: c.mutedText, display: 'block', marginBottom: 6 }}>
            {tr.phone} *
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

        {field(tr.address, address, setAddress, true)}
        {field(tr.orientir, territory, setTerritory, false)}

        <div style={{ marginBottom: 14 }}>
          <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: c.mutedText }}>{tr.clientPhoto}</p>
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={e => { void onGalleryFile(e.target.files?.[0]); e.target.value = '' }}
          />
          <div
            style={{
              borderRadius: 16, border: `1px solid ${c.border}`, background: c.card,
              overflow: 'hidden',
            }}
          >
            <div
              role={photoPreview ? 'button' : undefined}
              tabIndex={photoPreview ? 0 : undefined}
              onClick={() => {
                if (photoPreview && !photoUploading) setPhotoFullscreen(true)
              }}
              onKeyDown={e => {
                if (photoPreview && !photoUploading && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault()
                  setPhotoFullscreen(true)
                }
              }}
              style={{
                height: 160, background: dark ? '#1A1A2E' : '#F3F4F6',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative',
                cursor: photoPreview && !photoUploading ? 'pointer' : 'default',
              }}
            >
              {photoPreview ? (
                <img src={photoPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  color: c.mutedText, width: '100%',
                }}>
                  <Camera size={28} color={c.mutedText} />
                  <p style={{ margin: '8px 0 0', fontSize: 12 }}>{tr.clientPhoto}</p>
                </div>
              )}
              {photoUploading && (
                <div style={{
                  position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 700, fontSize: 13,
                }}>
                  {tr.photoUploading}
                </div>
              )}
              {photoPreview && !photoUploading && (
                <>
                  <button
                    type="button"
                    title={tr.mapFullscreen}
                    aria-label={tr.mapFullscreen}
                    onClick={e => {
                      e.stopPropagation()
                      setPhotoFullscreen(true)
                    }}
                    style={{
                      position: 'absolute', top: 8, left: 8, width: 32, height: 32, borderRadius: 10,
                      border: 'none', background: 'rgba(0,0,0,0.5)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Maximize2 size={14} color="#fff" />
                  </button>
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation()
                      setPhotoUrl(null)
                      setPhotoPreview(null)
                      setPhotoFullscreen(false)
                    }}
                    style={{
                      position: 'absolute', top: 8, right: 8, width: 32, height: 32, borderRadius: 10,
                      border: 'none', background: 'rgba(0,0,0,0.5)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <X size={14} color="#fff" />
                  </button>
                </>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: 10 }}>
              <button
                type="button"
                disabled={photoUploading || loading}
                onClick={() => void pickPhoto('camera')}
                style={{
                  height: 40, width: '100%', borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: 'rgba(108,92,231,0.12)', color: c.primary,
                  fontWeight: 800, fontSize: 12, padding: 0, margin: 0,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  opacity: photoUploading ? 0.6 : 1, lineHeight: 1, textAlign: 'center',
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, width: 16, height: 16 }}>
                  <Camera size={15} color={c.primary} />
                </span>
                <span>{tr.takePhoto}</span>
              </button>
              <button
                type="button"
                disabled={photoUploading || loading}
                onClick={() => void pickPhoto('gallery')}
                style={{
                  height: 40, width: '100%', borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: c.muted, color: c.text,
                  fontWeight: 800, fontSize: 12, padding: 0, margin: 0,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  opacity: photoUploading ? 0.6 : 1, lineHeight: 1, textAlign: 'center',
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, width: 16, height: 16 }}>
                  <ImageIcon size={15} color={c.text} />
                </span>
                <span>{tr.pickGallery}</span>
              </button>
            </div>
          </div>
        </div>

        <div style={{
          marginBottom: 14, padding: 14, borderRadius: 16,
          border: `1px solid ${c.border}`, background: c.card,
        }}>
          <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 800, color: c.text }}>{tr.markColor}</p>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {([
              { id: 'green' as const, color: '#22C55E', label: tr.markGreen },
              { id: 'yellow' as const, color: '#EAB308', label: tr.markYellow },
              { id: 'red' as const, color: '#EF4444', label: tr.markRed },
            ]).map(opt => {
              const selected = markColor === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  title={opt.label}
                  aria-label={opt.label}
                  aria-pressed={selected}
                  onClick={() => setMarkColor(opt.id)}
                  style={{
                    flex: 1, height: 52, borderRadius: 14, cursor: 'pointer',
                    border: selected ? `2px solid ${opt.color}` : `1px solid ${c.border}`,
                    background: selected ? `${opt.color}22` : (dark ? '#1A1A2E' : '#F9FAFB'),
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
                    boxShadow: selected ? `0 0 0 3px ${opt.color}33` : 'none',
                  }}
                >
                  <span style={{ width: 20, height: 20, borderRadius: 99, background: opt.color, display: 'block' }} />
                  <span style={{ fontSize: 11, fontWeight: 800, color: selected ? opt.color : c.mutedText }}>{opt.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {pickerField(tr.line, lineLabel, tr.lineSelect, linesLoading, () => setPicker('line'), true)}
        {pickerField(tr.category, category, tr.categorySelect, categoriesLoading, () => setPicker('category'), true)}

        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: c.mutedText }}>{tr.mapTitle} *</p>
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

          {!mapFullscreen && !modal && !picker && (
            <div style={{ position: 'relative', zIndex: 0, isolation: 'isolate' }}>
              <ClientPinMap
                lat={lat}
                lng={lng}
                radiusMeters={radius}
                dark={dark}
                onPick={(a, b) => { setLat(a); setLng(b) }}
              />
            </div>
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

          <div style={{
            marginTop: 14, padding: '12px 14px', borderRadius: 14,
            border: `1px solid ${c.border}`, background: c.muted,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: c.text }}>{tr.canSeePromotions}</p>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: c.mutedText, lineHeight: 1.35 }}>
                {tr.canSeePromotionsHint}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCanSeePromotions(v => !v)}
              style={{
                flexShrink: 0, height: 36, minWidth: 96, padding: '0 12px', borderRadius: 12,
                border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 12,
                background: canSeePromotions ? 'rgba(16,185,129,0.16)' : (dark ? '#252540' : '#E5E7EB'),
                color: canSeePromotions ? '#059669' : c.mutedText,
              }}
            >
              {canSeePromotions ? tr.canSeePromotionsOn : tr.canSeePromotionsOff}
            </button>
          </div>
        </div>

        <button type="button" className="btn-primary" disabled={loading || photoUploading} onClick={() => void submit()}
          style={{ width: '100%', height: 52, border: 'none', cursor: 'pointer', fontSize: 15, opacity: loading ? 0.7 : 1, marginTop: 8 }}>
          {loading ? tr.loading : tr.save}
        </button>
        <button type="button" onClick={onBack}
          style={{ width: '100%', height: 48, marginTop: 10, border: 'none', borderRadius: 16, background: c.muted, color: c.mutedText, fontWeight: 700, cursor: 'pointer' }}>
          {tr.cancel}
        </button>
          </>
        )}
      </div>

      {similarityMatch && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed', inset: 0, zIndex: 96,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            paddingBottom: 'var(--safe-bottom)',
          }}
          onClick={dismissSimilarity}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 480,
              borderRadius: '24px 24px 0 0',
              background: c.card,
              border: `1px solid ${c.border}`,
              padding: '20px 18px max(18px, var(--ime-bottom))',
              maxHeight: '85vh',
              overflowY: 'auto',
            }}
          >
            {(() => {
              const risk = similarityRisk(similarityMatch.overallPct)
              const colors = similarityRiskColors(risk, dark)
              const riskLabel = risk === 'red' ? tr.dupRiskRed : risk === 'yellow' ? tr.dupRiskYellow : tr.dupRiskGreen
              return (
                <>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: c.text }}>{tr.dupTitle}</p>
                <p style={{
                  margin: '8px 0 0', fontSize: 15, fontWeight: 800,
                  color: colors.color,
                }}>
                  {tr.dupChance.replace('{pct}', String(similarityMatch.overallPct))}
                </p>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  marginTop: 8, padding: '4px 10px', borderRadius: 999,
                  background: colors.bg, color: colors.color, border: `1px solid ${colors.border}`,
                  fontSize: 11, fontWeight: 800,
                }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: 99, background: colors.color, flexShrink: 0,
                  }} />
                  {riskLabel}
                </span>
              </div>
              <div style={{
                width: 64, height: 64, borderRadius: 18, flexShrink: 0,
                background: colors.bg,
                border: `1px solid ${colors.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 900, fontSize: 20,
                color: colors.color,
              }}>
                {similarityMatch.overallPct}%
              </div>
            </div>

            <div style={{
              borderRadius: 14, padding: 12, marginBottom: 14,
              background: dark ? '#1A1A2E' : '#F3F4F6',
              border: `1px solid ${colors.border}`,
            }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: c.mutedText }}>{tr.dupMatchedClient}</p>
              <p style={{ margin: '4px 0 0', fontSize: 15, fontWeight: 800, color: c.text }}>
                {similarityMatch.client.name}
              </p>
              {similarityMatch.client.phone && (
                <p style={{ margin: '2px 0 0', fontSize: 12, color: c.mutedText }}>{similarityMatch.client.phone}</p>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
              {similarityMatch.fields.map(f => {
                const barColor = f.pct <= 0
                  ? c.mutedText
                  : similarityRiskColors(f.pct >= 70 ? 'red' : f.pct >= 40 ? 'yellow' : 'green', dark).color
                return (
                  <div key={f.key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: c.mutedText }}>{dupFieldLabel(f.key)}</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: barColor }}>{f.pct}%</span>
                    </div>
                    <div style={{
                      height: 6, borderRadius: 99, background: dark ? '#0F0F1A' : '#E5E7EB', overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%', width: `${f.pct}%`, borderRadius: 99,
                        background: barColor, transition: 'width .2s',
                      }} />
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button
                type="button"
                onClick={dismissSimilarity}
                disabled={loading}
                style={{
                  height: 48, borderRadius: 14, border: `1px solid ${c.border}`,
                  background: c.muted, color: c.text, fontWeight: 800, fontSize: 13, cursor: 'pointer',
                }}
              >
                {tr.dupCancel}
              </button>
              <button
                type="button"
                onClick={confirmAddAnyway}
                disabled={loading}
                style={{
                  height: 48, borderRadius: 14, border: 'none',
                  background: c.primary, color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? tr.loading : tr.dupAddAnyway}
              </button>
            </div>
                </>
              )
            })()}
          </div>
        </div>,
        document.body,
      )}

      {photoFullscreen && photoPreview && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setPhotoFullscreen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 95,
            background: 'rgba(0,0,0,0.94)',
            display: 'flex', flexDirection: 'column',
          }}
        >
          <div style={{
            padding: 'var(--header-pad-top) max(16px, var(--safe-left)) 10px max(16px, var(--safe-right))',
            display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
          }}>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); setPhotoFullscreen(false) }}
              style={{
                width: 40, height: 40, borderRadius: 13, border: 'none',
                background: 'rgba(255,255,255,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}
            >
              <X size={18} color="#fff" />
            </button>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#fff', flex: 1 }}>
              {tr.clientPhoto}
            </p>
          </div>
          <div
            style={{
              flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '8px max(12px, var(--safe-left)) max(16px, var(--safe-bottom)) max(12px, var(--safe-right))',
            }}
            onClick={e => e.stopPropagation()}
          >
            <img
              src={photoPreview}
              alt=""
              style={{
                maxWidth: '100%', maxHeight: '100%',
                width: 'auto', height: 'auto',
                objectFit: 'contain', borderRadius: 8,
              }}
            />
          </div>
        </div>,
        document.body,
      )}

      {mapFullscreen && createPortal(
        <div style={{
          position: 'fixed', inset: 0, zIndex: 90, background: c.bg,
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

          <div style={{ flex: 1, minHeight: 0, position: 'relative', zIndex: 0, isolation: 'isolate' }}>
            <ClientPinMap
              lat={lat}
              lng={lng}
              radiusMeters={radius}
              dark={dark}
              height="100%"
              borderRadius={0}
              onPick={(a, b) => { setLat(a); setLng(b) }}
            />
          </div>

          <div style={{
            padding: '14px 16px calc(20px + max(28px, var(--safe-bottom)))',
            paddingLeft: 'max(16px, var(--safe-left))',
            paddingRight: 'max(16px, var(--safe-right))',
            borderTop: `1px solid ${c.border}`,
            background: c.card,
            flexShrink: 0,
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
        </div>,
        document.body,
      )}

      {picker && createPortal(
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2000,
          background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-end',
          paddingBottom: 'var(--ime-bottom, 0px)',
          transition: 'padding-bottom 160ms ease-out',
        }}>
          <div style={{
            width: '100%', maxHeight: 'min(70%, calc(100% - 12px))',
            display: 'flex', flexDirection: 'column',
            background: c.card, borderRadius: '24px 24px 0 0',
            padding: '16px 16px calc(20px + var(--safe-bottom))',
            boxShadow: '0 -12px 40px rgba(0,0,0,0.25)',
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
                return (
                  <div
                    key={line.id}
                    style={{
                      width: '100%', borderRadius: 14,
                      border: `1px solid ${selected ? 'rgba(99,102,241,0.45)' : c.border}`,
                      background: selected ? 'rgba(99,102,241,0.12)' : (dark ? '#1A1A2E' : '#F9FAFB'),
                      display: 'flex', alignItems: 'stretch',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => { setLineCode(line.code); setPicker(null) }}
                      style={{
                        flex: 1, minWidth: 0, padding: '14px 14px', border: 'none', background: 'transparent',
                        cursor: 'pointer', textAlign: 'left',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                      }}
                    >
                      <span style={{ fontSize: 14, fontWeight: 700, color: c.text }}>{line.name}</span>
                      {selected ? <CheckCircle size={18} color={c.primary} /> : null}
                    </button>
                    <button
                      type="button"
                      aria-label={tr.editItem}
                      onClick={(e) => {
                        e.stopPropagation()
                        openModal('line', { id: line.id, name: line.name })
                      }}
                      style={{
                        width: 48, flexShrink: 0, border: 'none', borderLeft: `1px solid ${c.border}`,
                        background: 'transparent', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Pencil size={16} color={c.mutedText} />
                    </button>
                  </div>
                )
              })}

              {picker === 'category' && categories.map(cat => {
                const selected = cat.name === category
                return (
                  <div
                    key={cat.id}
                    style={{
                      width: '100%', borderRadius: 14,
                      border: `1px solid ${selected ? 'rgba(99,102,241,0.45)' : c.border}`,
                      background: selected ? 'rgba(99,102,241,0.12)' : (dark ? '#1A1A2E' : '#F9FAFB'),
                      display: 'flex', alignItems: 'stretch',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => { setCategory(cat.name); setPicker(null) }}
                      style={{
                        flex: 1, minWidth: 0, padding: '14px 14px', border: 'none', background: 'transparent',
                        cursor: 'pointer', textAlign: 'left',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                      }}
                    >
                      <span style={{ fontSize: 14, fontWeight: 700, color: c.text }}>{cat.name}</span>
                      {selected ? <CheckCircle size={18} color={c.primary} /> : null}
                    </button>
                    <button
                      type="button"
                      aria-label={tr.editItem}
                      onClick={(e) => {
                        e.stopPropagation()
                        openModal('category', { id: cat.id, name: cat.name })
                      }}
                      style={{
                        width: 48, flexShrink: 0, border: 'none', borderLeft: `1px solid ${c.border}`,
                        background: 'transparent', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Pencil size={16} color={c.mutedText} />
                    </button>
                  </div>
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
        </div>,
        document.body,
      )}

      {modal && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2000,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: 'max(12px, calc(var(--safe-top, 0px) + 8px))',
            paddingLeft: 'max(16px, var(--safe-left, 0px))',
            paddingRight: 'max(16px, var(--safe-right, 0px))',
            paddingBottom: 'calc(12px + var(--ime-bottom, 0px))',
            boxSizing: 'border-box',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setModal(null)
              setModalEditId(null)
              setModalName('')
            }
          }}
        >
          <div
            ref={modalSheetRef}
            style={{
              width: '100%',
              maxWidth: 420,
              flexShrink: 0,
              background: c.card,
              borderRadius: 20,
              padding: '16px 16px 18px',
              boxShadow: '0 16px 40px rgba(0,0,0,0.28)',
              marginBottom: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: c.text }}>
                {modal === 'line'
                  ? (modalEditId ? tr.editLine : tr.addLine)
                  : (modalEditId ? tr.editCategory : tr.addCategory)}
              </p>
              <button
                type="button"
                onClick={() => { setModal(null); setModalEditId(null); setModalName('') }}
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
              ref={modalInputRef}
              value={modalName}
              onChange={e => setModalName(e.target.value)}
              placeholder={modal === 'line' ? tr.lineName : tr.categoryName}
              enterKeyHint="done"
              autoComplete="off"
              style={{ ...inputStyle, fontSize: 16 }}
            />

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
        </div>,
        document.body,
      )}
    </div>
  )
}
