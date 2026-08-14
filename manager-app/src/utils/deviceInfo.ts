import { Capacitor } from '@capacitor/core'
import { Device } from '@capacitor/device'

export interface LoginDevice {
  id: string
  /** Foydalanuvchi qurilmaga qo'ygan nom: "Alisher's Galaxy A54" */
  name?: string
  brand: string
  model: string
  os: string
}

const DEVICE_ID_KEY = 'lm-manager-device-id'

/** Ishlab chiqaruvchi nomlarini brend yozuviga keltirish (samsung → Samsung) */
const BRANDS: Record<string, string> = {
  samsung: 'Samsung',
  xiaomi: 'Xiaomi',
  redmi: 'Redmi',
  poco: 'POCO',
  huawei: 'Huawei',
  honor: 'HONOR',
  oppo: 'OPPO',
  vivo: 'vivo',
  realme: 'realme',
  oneplus: 'OnePlus',
  tecno: 'TECNO',
  infinix: 'Infinix',
  itel: 'itel',
  nokia: 'Nokia',
  hmd: 'Nokia',
  motorola: 'Motorola',
  lenovo: 'Lenovo',
  google: 'Google',
  apple: 'Apple',
  asus: 'ASUS',
  sony: 'Sony',
  zte: 'ZTE',
  lg: 'LG',
  artel: 'Artel',
}

/** Telefon nomi o'rniga keladigan foydasiz qiymatlar */
const GENERIC = /^(android|phone|telefon|smartphone|unknown|null|undefined|device|user|my (phone|device))$/i

function clean(value?: string | null): string {
  return (value || '').replace(/\s+/g, ' ').trim()
}

function prettyBrand(raw: string): string {
  const key = raw.toLowerCase()
  if (BRANDS[key]) return BRANDS[key]
  if (/^[a-z]+$/.test(raw)) return raw.charAt(0).toUpperCase() + raw.slice(1)
  return raw
}

/** "samsung" + "SM-A515F" → "Samsung SM-A515F" (takrorlanmasdan) */
export function deviceTitle(brand: string, model: string): string {
  const b = clean(brand)
  const m = clean(model)
  if (!b) return m
  if (!m) return b
  return m.toLowerCase().startsWith(b.toLowerCase()) ? m : `${b} ${m}`
}

function persistedDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY)
    if (!id) {
      id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `mgr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
      localStorage.setItem(DEVICE_ID_KEY, id)
    }
    return id
  } catch {
    return `mgr-fallback-${Date.now()}`
  }
}

/** User-Agent dan Android model (masalan SM-A515F) */
function parseUaDevice(ua: string): { brand: string; model: string; os: string } | null {
  const android = /Android\s+([\d.]+)/i.exec(ua)
  if (!android) return null
  const os = `Android ${android[1]}`
  // (; SM-A515F) yoki (; Samsung SM-A515F Build/...)
  const modelMatch = /Android[^;]*;\s*([^;)]+?)(?:\s+Build\/|;|\))/i.exec(ua)
  const raw = clean(modelMatch?.[1]).replace(/\s+wv$/i, '')
  if (!raw || /^(Linux|U|K|Mobile)$/i.test(raw)) {
    return { brand: 'Android', model: '', os }
  }

  const parts = raw.split(' ')
  const first = parts[0].toLowerCase()
  if (parts.length >= 2 && BRANDS[first]) {
    return { brand: BRANDS[first], model: parts.slice(1).join(' '), os }
  }

  let brand = ''
  if (/^(SM-|GT-|SC-)/i.test(raw)) brand = 'Samsung'
  else if (/^(Redmi|M2\d|22\d{5}|23\d{5}|21\d{5})/i.test(raw)) brand = 'Redmi'
  else if (/^(Mi\s|MI\s|2\d{6})/i.test(raw)) brand = 'Xiaomi'
  else if (/^CPH/i.test(raw)) brand = 'OPPO'
  else if (/^V2\d/i.test(raw)) brand = 'vivo'
  else if (/^RMX/i.test(raw)) brand = 'realme'
  else if (/^Pixel/i.test(raw)) brand = 'Google'
  else if (/^(ANE-|MAR-|JNY-|STK-|DRA-)/i.test(raw)) brand = 'Huawei'
  else if (/^(TECNO|KG\d|CK\d)/i.test(raw)) brand = 'TECNO'
  else if (/^(Infinix|X6\d)/i.test(raw)) brand = 'Infinix'

  return { brand, model: raw, os }
}

async function nativeDevice(id: string): Promise<LoginDevice | null> {
  try {
    const info = await Device.getInfo()
    const brand = prettyBrand(clean(info.manufacturer))
    const model = clean(info.model)
    const osName = info.operatingSystem === 'ios' ? 'iOS' : 'Android'
    const version = clean(info.osVersion)

    // Android 7.1+ / iOS: foydalanuvchi qurilmaga bergan nom
    const rawName = clean(info.name)
    const title = deviceTitle(brand, model)
    const name =
      rawName &&
      !GENERIC.test(rawName) &&
      rawName.toLowerCase() !== title.toLowerCase()
        ? rawName
        : ''

    return {
      id,
      name: name || undefined,
      brand: brand || 'Android',
      model: model || 'Telefon',
      os: version ? `${osName} ${version}` : osName,
    }
  } catch {
    return null
  }
}

export async function resolveLoginDevice(): Promise<LoginDevice> {
  const id = persistedDeviceId()

  if (Capacitor.isNativePlatform()) {
    const native = await nativeDevice(id)
    if (native) return native
  }

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  const parsed = parseUaDevice(ua)
  if (parsed) {
    return {
      id,
      brand: parsed.brand || 'Android',
      model: parsed.model || 'Telefon',
      os: parsed.os,
    }
  }

  return { id, brand: 'Web', model: 'Browser', os: 'Web' }
}

/** Ekranda ko'rsatish uchun to'liq yorliq */
export function formatDevice(device: LoginDevice): string {
  const title = device.name || deviceTitle(device.brand, device.model)
  return device.os ? `${title} · ${device.os}` : title
}
