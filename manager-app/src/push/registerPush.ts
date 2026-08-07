import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { api } from '../api/client'
import { loadLang, type Lang } from '../i18n'

export type PushNavigateTarget = 'clientOrders' | 'home' | 'plan' | 'messages' | null

let lastToken: string | null = null
let navigateHandler: ((target: PushNavigateTarget, data?: Record<string, string>) => void) | null = null
let listenersAttached = false

function pushLanguage(lang: Lang): string {
  if (lang === 'uzl') return 'uz'
  if (lang === 'ru') return 'ru'
  return 'uz_cyr'
}

async function sendTokenToServer(token: string, lang?: Lang) {
  lastToken = token
  await api<{ ok?: boolean }>('notifications/fcm-token', {
    method: 'POST',
    body: JSON.stringify({
      token,
      language: pushLanguage(lang ?? loadLang()),
    }),
  })
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

  void PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    const data = (action.notification.data || {}) as Record<string, string>
    const target = targetFromNotification(data)
    if (target && navigateHandler) navigateHandler(target, data)
  })
}

/**
 * Manager APK: FCM ruxsat + token → backend.
 */
export async function initManagerPush(opts?: {
  onNavigate?: (target: PushNavigateTarget, data?: Record<string, string>) => void
}): Promise<void> {
  if (!Capacitor.isNativePlatform()) return

  if (opts?.onNavigate) navigateHandler = opts.onNavigate
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

  await PushNotifications.register()
}

/** Til o‘zgaganda serverdagi preferredLanguage ni yangilash */
export async function syncPushLanguage(lang: Lang) {
  if (!Capacitor.isNativePlatform() || !lastToken) return
  try {
    await sendTokenToServer(lastToken, lang)
  } catch {
    /* ignore */
  }
}
