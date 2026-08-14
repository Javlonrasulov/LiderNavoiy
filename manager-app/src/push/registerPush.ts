import { Capacitor } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'
import { PushNotifications } from '@capacitor/push-notifications'
import { api } from '../api/client'
import { loadLang, type Lang } from '../i18n'

export type PushNavigateTarget = 'clientOrders' | 'home' | 'plan' | 'messages' | null

export type PushForegroundPayload = {
  title?: string
  body?: string
  data: Record<string, string>
}

let lastToken: string | null = null
let lastSentAt = 0
let forceNextSend = false
let navigateHandler: ((target: PushNavigateTarget, data?: Record<string, string>) => void) | null = null
let foregroundHandler: ((payload: PushForegroundPayload) => void) | null = null
let listenersAttached = false
let resumeAttached = false

const RESEND_AFTER_MS = 10 * 60 * 1000

function pushLanguage(lang: Lang): string {
  if (lang === 'uzl') return 'uz'
  if (lang === 'ru') return 'ru'
  return 'uz_cyr'
}

function delay(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms))
}

async function sendTokenToServer(token: string, lang?: Lang) {
  const fresh = token !== lastToken || Date.now() - lastSentAt > RESEND_AFTER_MS
  if (!fresh && !forceNextSend) return

  let lastErr: unknown = null
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await api<{ ok?: boolean }>('notifications/fcm-token', {
        method: 'POST',
        body: JSON.stringify({
          token,
          language: pushLanguage(lang ?? loadLang()),
          platform: 'android',
        }),
      })
      lastToken = token
      lastSentAt = Date.now()
      forceNextSend = false
      return
    } catch (err) {
      lastErr = err
      if (attempt < 3) await delay(1200 * attempt)
    }
  }
  // Token saqlanmadi — keyingi urinishda majburan qayta yuboriladi
  lastToken = token
  forceNextSend = true
  throw lastErr
}

function targetFromNotification(data?: Record<string, string>): PushNavigateTarget {
  const type = (data?.type || '').toLowerCase()
  const screen = (data?.screen || data?.open_screen || '').toLowerCase()
  if (screen === 'plan' || type === 'plan') return 'plan'
  if (type === 'order' || type === 'payment' || type === 'payment_reminder') return 'clientOrders'
  if (type === 'message' || screen === 'messages' || screen === 'chat') return 'messages'
  return null
}

async function ensureChannels() {
  try {
    await PushNotifications.createChannel({
      id: 'crm_push_channel',
      name: 'Bildirishnomalar',
      description: 'Buyurtma va umumiy bildirishnomalar',
      importance: 4,
      vibration: true,
      sound: 'default',
    })
    await PushNotifications.createChannel({
      id: 'crm_chat_alert_v2',
      name: 'Chat xabarlari',
      description: 'Yangi chat xabarlari',
      importance: 5,
      vibration: true,
      sound: 'default',
    })
    await PushNotifications.createChannel({
      id: 'crm_plan_channel',
      name: 'Reja bildirishnomalari',
      description: 'Reja tayinlanganda',
      importance: 5,
      vibration: true,
      sound: 'default',
    })
  } catch {
    /* older Android */
  }
}

function attachListeners() {
  if (listenersAttached) return
  listenersAttached = true

  void PushNotifications.addListener('registration', (token) => {
    void sendTokenToServer(token.value).catch((err) => {
      console.warn('[push] token register failed', err)
    })
  })

  void PushNotifications.addListener('registrationError', (err) => {
    console.warn('[push] registration error', err.error)
  })

  // Ilova ochiq bo‘lganda FCM bildirishnomani tray’ga chiqarmaydi —
  // shuning uchun ilova ichida o‘zimiz ko‘rsatamiz.
  void PushNotifications.addListener('pushNotificationReceived', (notif) => {
    const data = (notif.data || {}) as Record<string, string>
    foregroundHandler?.({
      title: notif.title || data.title,
      body: notif.body || data.body,
      data,
    })
  })

  void PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    const data = (action.notification.data || {}) as Record<string, string>
    const target = targetFromNotification(data)
    if (target && navigateHandler) navigateHandler(target, data)
  })
}

function attachResume() {
  if (resumeAttached) return
  resumeAttached = true

  // Token boshqa qurilma/veb-panel tomonidan almashtirilgan bo‘lishi mumkin —
  // ilova har ochilganda serverdagi tokenni yangilaymiz.
  void CapApp.addListener('appStateChange', ({ isActive }) => {
    if (!isActive) return
    forceNextSend = true
    void PushNotifications.register().catch(() => {
      /* ignore */
    })
  })
}

/**
 * Manager APK: FCM ruxsat + token → backend.
 */
export async function initManagerPush(opts?: {
  onNavigate?: (target: PushNavigateTarget, data?: Record<string, string>) => void
  onForeground?: (payload: PushForegroundPayload) => void
}): Promise<void> {
  if (!Capacitor.isNativePlatform()) return

  if (opts?.onNavigate) navigateHandler = opts.onNavigate
  if (opts?.onForeground) foregroundHandler = opts.onForeground
  attachListeners()
  await ensureChannels()

  let perm = await PushNotifications.checkPermissions()
  if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') {
    perm = await PushNotifications.requestPermissions()
  }
  if (perm.receive !== 'granted') {
    console.warn('[push] permission denied')
    return
  }

  // Login almashgan bo‘lishi mumkin — tokenni albatta qayta bog‘laymiz
  forceNextSend = true
  await PushNotifications.register()
  attachResume()
}

/** Til o‘zgaganda serverdagi preferredLanguage ni yangilash */
export async function syncPushLanguage(lang: Lang) {
  if (!Capacitor.isNativePlatform() || !lastToken) return
  try {
    forceNextSend = true
    await sendTokenToServer(lastToken, lang)
  } catch {
    /* ignore */
  }
}
