import { useCallback, useEffect, useRef, useState } from 'react'
import { loadLang, t, type Lang } from './i18n'
import {
  getStoredUser,
  clearSession,
  resetSessionExpiredGuard,
  validateStoredSession,
} from './api/client'
import { isManagerRole, logout } from './api/auth'
import SessionExpiredOverlay from './components/SessionExpiredOverlay'
import { connectMessages, getConversations, type MessagesSocket } from './api/messages'
import IncomingMessageBanner, { type IncomingMessage } from './components/IncomingMessageBanner'
import type { AuthUser, Distributor, EmployeeLocation } from './api/types'
import SplashScreen from './screens/SplashScreen'
import LoginScreen from './screens/LoginScreen'
import HomeScreen from './screens/HomeScreen'
import StaffScreen from './screens/StaffScreen'
import EmployeeTrackingScreen from './screens/EmployeeTrackingScreen'
import ClientsScreen from './screens/ClientsScreen'
import AddClientScreen from './screens/AddClientScreen'
import { clientFromRequest } from './api/manager'
import ProductsScreen from './screens/ProductsScreen'
import PlanScreen from './screens/PlanScreen'
import ProfileScreen from './screens/ProfileScreen'
import MessagesScreen from './screens/MessagesScreen'
import ClientOrdersScreen from './screens/ClientOrdersScreen'
import FactoryOrdersScreen from './screens/FactoryOrdersScreen'
import NotificationsScreen from './screens/NotificationsScreen'
import PushPermissionScreen from './screens/PushPermissionScreen'
import BottomNav, { type Tab } from './components/BottomNav'
import { showToast, ToastHost } from './components/Toast'
import {
  initManagerPush,
  syncPushLanguage,
  isNativePushRequired,
  isPushPermissionGranted,
  requestPushPermission,
  openPushSettings,
} from './push/registerPush'
import { fetchNotificationUnreadCount } from './api/notifications'
import { App as CapApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { dispatchHardwareBack } from './utils/hardwareBack'

type Phase = 'splash' | 'login' | 'pushRequired' | 'app'
type Overlay = 'addClient' | 'products' | 'clientOrders' | 'factoryOrders' | 'employeeTracking' | 'profile' | 'notifications' | null

function loadDark(): boolean {
  const v = localStorage.getItem('lm-dark')
  if (v === null) {
    const legacy = localStorage.getItem('ml-dark')
    return legacy === null ? true : legacy === '1'
  }
  return v === '1'
}

export default function App() {
  const [phase, setPhase] = useState<Phase>('splash')
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [overlay, setOverlay] = useState<Overlay>(null)
  const [trackingEmp, setTrackingEmp] = useState<{
    distributor: Distributor
    location?: EmployeeLocation
  } | null>(null)
  const [dark, setDark] = useState(loadDark)
  const [lang, setLang] = useState<Lang>(loadLang)
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser())
  const [clientsKey, setClientsKey] = useState(0)
  const [editingClient, setEditingClient] = useState<import('./api/types').Client | null>(null)
  const [resubmitRequestId, setResubmitRequestId] = useState<string | null>(null)
  const [messagesUnread, setMessagesUnread] = useState(0)
  const [notifUnread, setNotifUnread] = useState(0)
  const [openConversationId, setOpenConversationId] = useState<string | null>(null)
  const [messagesChatOpen, setMessagesChatOpen] = useState(false)
  const [keyboardOpen, setKeyboardOpen] = useState(false)
  const [sessionExpired, setSessionExpired] = useState(false)
  const [incoming, setIncoming] = useState<IncomingMessage | null>(null)
  const [pushBusy, setPushBusy] = useState(false)
  const activeChatIdRef = useRef<string | null>(null)
  const shownMsgIdsRef = useRef<Set<string>>(new Set())
  const phaseRef = useRef<Phase>('splash')

  /** Login/sessiya OK — push ruxsatisiz asosiy ilovaga o‘tkazmaymiz */
  const enterAfterAuth = useCallback(async (u: AuthUser) => {
    setUser(u)
    if (!isNativePushRequired()) {
      setPhase('app')
      return
    }
    const granted = await isPushPermissionGranted()
    setPhase(granted ? 'app' : 'pushRequired')
  }, [])

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  // Sozlamalardan qaytganda ruxsatni qayta tekshiramiz
  useEffect(() => {
    if (phase !== 'pushRequired') return
    if (!Capacitor.isNativePlatform()) return
    const sub = CapApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) return
      void isPushPermissionGranted().then(ok => {
        if (ok && phaseRef.current === 'pushRequired') setPhase('app')
      })
    })
    return () => {
      void sub.then(h => h.remove())
    }
  }, [phase])

  useEffect(() => {
    const onExpired = () => {
      // Login ekranida turgan bo‘lsa — ogohlantirish ko‘rsatilmaydi
      const wasSignedIn = phaseRef.current === 'app' || phaseRef.current === 'pushRequired'
      setUser(null)
      setActiveTab('home')
      setOverlay(null)
      setTrackingEmp(null)
      setMessagesUnread(0)
      setOpenConversationId(null)
      setMessagesChatOpen(false)
      setNotifUnread(0)
      setSessionExpired(wasSignedIn)
      setPhase('login')
    }
    window.addEventListener('lider:manager-session-expired', onExpired)
    return () => window.removeEventListener('lider:manager-session-expired', onExpired)
  }, [])

  useEffect(() => {
    const syncKeyboard = () => {
      const vv = window.visualViewport
      const covered = vv
        ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
        : 0
      const attr = document.documentElement.getAttribute('data-keyboard-open') === '1'
      const ime = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ime-bottom')) || 0
      setKeyboardOpen(attr || covered > 40 || ime > 40)
    }
    syncKeyboard()
    const obs = new MutationObserver(syncKeyboard)
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-keyboard-open', 'style'],
    })
    window.visualViewport?.addEventListener('resize', syncKeyboard)
    window.visualViewport?.addEventListener('scroll', syncKeyboard)
    window.addEventListener('resize', syncKeyboard)
    const id = window.setInterval(syncKeyboard, 400)
    return () => {
      obs.disconnect()
      window.visualViewport?.removeEventListener('resize', syncKeyboard)
      window.visualViewport?.removeEventListener('scroll', syncKeyboard)
      window.removeEventListener('resize', syncKeyboard)
      window.clearInterval(id)
    }
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('lm-dark', dark ? '1' : '0')
  }, [dark])

  useEffect(() => {
    localStorage.setItem('lm-lang', lang)
    document.documentElement.lang = lang === 'ru' ? 'ru' : 'uz'
    if (phase === 'app') void syncPushLanguage(lang)
  }, [lang, phase])

  const refreshUnread = useCallback(async () => {
    try {
      const convs = await getConversations()
      setMessagesUnread(convs.reduce((sum, c) => sum + (c.unreadCount || 0), 0))
    } catch {
      /* ignore */
    }
  }, [])

  const refreshNotifUnread = useCallback(async () => {
    try {
      const res = await fetchNotificationUnreadCount()
      setNotifUnread(Number(res?.count) || 0)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    if (phase !== 'app') return
    void refreshUnread()
    void refreshNotifUnread()
    const id = window.setInterval(() => {
      void refreshUnread()
      void refreshNotifUnread()
    }, 45_000)
    return () => window.clearInterval(id)
  }, [phase, refreshUnread, refreshNotifUnread])

  const openMessagesConversation = useCallback((convId?: string | null) => {
    setActiveTab('messages')
    setOverlay(null)
    setTrackingEmp(null)
    if (convId) setOpenConversationId(convId)
  }, [])

  const notifyIncoming = useCallback((msg: {
    id: string
    conversationId: string
    senderName?: string
    text?: string
    messageType?: string
    fileName?: string | null
  }) => {
    if (!msg.conversationId || !msg.id) return
    if (shownMsgIdsRef.current.has(msg.id)) return
    shownMsgIdsRef.current.add(msg.id)
    if (shownMsgIdsRef.current.size > 80) {
      shownMsgIdsRef.current = new Set([...shownMsgIdsRef.current].slice(-40))
    }
    // Xuddi shu suhbat ekranda ochiq — banner kerak emas
    if (activeChatIdRef.current === msg.conversationId) return

    const labels = t[lang]
    const fileLabel = msg.messageType === 'image'
      ? labels.msgPreviewImage
      : msg.messageType === 'document'
        ? (msg.fileName || labels.msgPreviewFile)
        : ''
    setIncoming({
      id: msg.id,
      conversationId: msg.conversationId,
      senderName: msg.senderName || labels.msgNewMessage,
      preview: msg.text?.trim() || fileLabel || labels.msgNewMessage,
    })
  }, [lang])

  // Ilova ochiq bo‘lganda (istalgan tab) yangi xabar → banner + badge
  useEffect(() => {
    if (phase !== 'app') return
    let cancelled = false
    let sock: MessagesSocket | null = null

    void connectMessages({
      onMessage: payload => {
        if (cancelled) return
        const msg = payload.message
        if (!msg) return
        void refreshUnread()
        if (user?.id && msg.senderId === user.id) return
        notifyIncoming({
          id: msg.id,
          conversationId: msg.conversationId,
          senderName: payload.conversation?.otherUser?.fullName,
          text: msg.text,
          messageType: msg.messageType,
          fileName: msg.fileName,
        })
      },
    }).then(s => {
      if (cancelled) {
        s?.disconnect()
        return
      }
      sock = s
    })

    return () => {
      cancelled = true
      sock?.disconnect()
    }
  }, [phase, user?.id, notifyIncoming, refreshUnread])

  const notifyIncomingRef = useRef(notifyIncoming)
  notifyIncomingRef.current = notifyIncoming

  useEffect(() => {
    if (phase !== 'app') return
    void initManagerPush({
      onForeground: ({ title, body, data }) => {
        void refreshUnread()
        void refreshNotifUnread()
        const type = (data.type || '').toLowerCase()
        if (type !== 'message') {
          if (title || body) showToast([title, body].filter(Boolean).join(' — '), 'info')
          return
        }
        notifyIncomingRef.current({
          id: data.messageId || data.message_id || `${data.conversationId}-${Date.now()}`,
          conversationId: data.conversationId || data.conversation_id || '',
          senderName: title,
          text: body,
        })
      },
      onNavigate: (target, data) => {
        if (target === 'clientOrders') {
          setActiveTab('home')
          setOverlay('clientOrders')
          setTrackingEmp(null)
        } else if (target === 'plan') {
          setActiveTab('plan')
          setOverlay(null)
          setTrackingEmp(null)
        } else if (target === 'messages') {
          setActiveTab('messages')
          setOverlay(null)
          setTrackingEmp(null)
          const convId = data?.conversationId || data?.conversation_id
          if (convId) setOpenConversationId(convId)
        } else if (target === 'home') {
          setActiveTab('home')
          setOverlay(null)
          setTrackingEmp(null)
        }
      },
    })
  }, [phase])

  // Tizim Back: ichki ekranlar → overlay → tab → (ikkita Back = chiqish)
  const overlayRef = useRef(overlay)
  const activeTabRef = useRef(activeTab)
  overlayRef.current = overlay
  activeTabRef.current = activeTab

  useEffect(() => {
    if (phase !== 'app') return
    if (!Capacitor.isNativePlatform()) return

    let lastExitAt = 0
    const sub = CapApp.addListener('backButton', () => {
      if (dispatchHardwareBack()) return

      if (overlayRef.current) {
        setOverlay(null)
        setTrackingEmp(null)
        setEditingClient(null)
        setResubmitRequestId(null)
        return
      }
      if (activeTabRef.current !== 'home') {
        setActiveTab('home')
        return
      }
      const now = Date.now()
      if (now - lastExitAt < 1600) {
        void CapApp.exitApp()
        return
      }
      lastExitAt = now
    })

    return () => {
      void sub.then(h => h.remove())
    }
  }, [phase])


  const tr = t[lang]
  const bg = dark ? '#080812' : '#F8F9FC'

  const afterSplash = () => {
    const u = getStoredUser()
    if (u && isManagerRole(u)) {
      // Saqlangan token yaroqsiz bo‘lishi mumkin (qayta o‘rnatish, sessiya bekor
      // qilingan) — avval tekshiramiz, keyin ichkariga kiritamiz
      void validateStoredSession().then(ok => {
        if (ok) {
          void enterAfterAuth(u)
          return
        }
        setUser(null)
        setSessionExpired(false)
        resetSessionExpiredGuard()
        setPhase('login')
      })
      return
    }
    if (u) clearSession()
    setPhase('login')
  }

  const handleLogout = async () => {
    await logout()
    setUser(null)
    setActiveTab('home')
    setOverlay(null)
    setTrackingEmp(null)
    setMessagesUnread(0)
    setOpenConversationId(null)
    setMessagesChatOpen(false)
    setSessionExpired(false)
    setPushBusy(false)
    resetSessionExpiredGuard()
    setPhase('login')
  }

  const handleAllowPush = async () => {
    setPushBusy(true)
    try {
      const ok = await requestPushPermission()
      if (ok) {
        setPhase('app')
        return
      }
      // Dialog chiqmasa (rad etilgan) — sozlamalarga yo‘naltiramiz
      await openPushSettings()
    } finally {
      setPushBusy(false)
    }
  }

  const navigate = (screen: string) => {
    if (screen === 'staff') { setActiveTab('staff'); setOverlay(null); setTrackingEmp(null) }
    else if (screen === 'clients') { setActiveTab('clients'); setOverlay(null); setTrackingEmp(null) }
    else if (screen === 'plan') { setActiveTab('plan'); setOverlay(null); setTrackingEmp(null) }
    else if (screen === 'messages') { setActiveTab('messages'); setOverlay(null); setTrackingEmp(null) }
    else if (screen === 'profile') { setOverlay('profile'); setTrackingEmp(null) }
    else if (screen === 'home') { setActiveTab('home'); setOverlay(null); setTrackingEmp(null) }
    else if (screen === 'products') setOverlay('products')
    else if (screen === 'addClient') setOverlay('addClient')
    else if (screen === 'clientOrders') setOverlay('clientOrders')
    else if (screen === 'factoryOrders') setOverlay('factoryOrders')
    else if (screen === 'notifications') setOverlay('notifications')
  }

  const openEmployeeTracking = (distributor: Distributor, location?: EmployeeLocation) => {
    setTrackingEmp({ distributor, location })
    setOverlay('employeeTracking')
  }

  const closeEmployeeTracking = () => {
    setOverlay(null)
    setTrackingEmp(null)
  }

  // Suhbat ochiq yoki klaviatura ochiq — pastki navbar umuman render qilinmaydi
  const showBottomNav =
    !messagesChatOpen &&
    !keyboardOpen &&
    (overlay === null || overlay === 'clientOrders' || overlay === 'products')

  return (
    <div className="app-shell" style={{ background: bg }}>
      <ToastHost />
      {phase === 'app' && (
        <IncomingMessageBanner
          dark={dark}
          message={incoming}
          onDismiss={() => setIncoming(null)}
          onOpen={(convId) => {
            setIncoming(null)
            openMessagesConversation(convId)
          }}
        />
      )}
      {phase === 'splash' && (
        <SplashScreen onDone={afterSplash} tr={tr} />
      )}

      {phase === 'login' && (
        <>
          <LoginScreen
            dark={dark}
            tr={tr}
            lang={lang}
            onChangeLang={setLang}
            onToggleDark={() => setDark(d => !d)}
            onSuccess={(u) => {
              resetSessionExpiredGuard()
              setSessionExpired(false)
              void enterAfterAuth(u)
            }}
          />
          {sessionExpired && (
            <SessionExpiredOverlay
              dark={dark}
              tr={tr}
              onReLogin={() => setSessionExpired(false)}
            />
          )}
        </>
      )}

      {phase === 'pushRequired' && (
        <PushPermissionScreen
          dark={dark}
          tr={tr}
          busy={pushBusy}
          onAllow={() => { void handleAllowPush() }}
          onOpenSettings={() => { void openPushSettings() }}
          onLogout={() => { void handleLogout() }}
        />
      )}

      {phase === 'app' && (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
          <div style={{
            position: 'absolute', inset: 0,
            opacity: overlay && overlay !== 'clientOrders' ? 0 : 1,
            transition: 'opacity 0.2s ease',
            pointerEvents: overlay ? 'none' : 'auto',
          }}>
            {activeTab === 'home' && (
              <HomeScreen
                dark={dark}
                lang={lang}
                tr={tr}
                user={user}
                notifUnread={notifUnread}
                onNavigate={navigate}
                onChangeLang={setLang}
                onToggleDark={() => setDark(d => !d)}
              />
            )}
            {activeTab === 'staff' && (
              <StaffScreen
                dark={dark}
                tr={tr}
                onSelectEmployee={openEmployeeTracking}
              />
            )}
            {activeTab === 'clients' && (
              <ClientsScreen
                key={clientsKey}
                dark={dark}
                lang={lang}
                tr={tr}
                onAdd={() => {
                  setEditingClient(null)
                  setResubmitRequestId(null)
                  setOverlay('addClient')
                }}
                onEdit={(cl) => {
                  setEditingClient(cl)
                  setResubmitRequestId(null)
                  setOverlay('addClient')
                }}
                onEditRequest={(req) => {
                  setEditingClient(clientFromRequest(req))
                  setResubmitRequestId(req.id)
                  setOverlay('addClient')
                }}
              />
            )}
            {activeTab === 'plan' && <PlanScreen dark={dark} lang={lang} tr={tr} user={user} />}
            {activeTab === 'messages' && (
              <MessagesScreen
                dark={dark}
                tr={tr}
                user={user}
                openConversationId={openConversationId}
                onUnreadChange={setMessagesUnread}
                onConversationOpened={() => setOpenConversationId(null)}
                onChatOpenChange={(open, convId) => {
                  setMessagesChatOpen(open)
                  activeChatIdRef.current = open ? (convId ?? null) : null
                  if (open) setIncoming(null)
                }}
              />
            )}
          </div>

          {overlay === 'clientOrders' && (
            <ClientOrdersScreen
              dark={dark}
              lang={lang}
              tr={tr}
              user={user}
              onBack={() => setOverlay(null)}
            />
          )}

          {overlay === 'factoryOrders' && (
            <FactoryOrdersScreen
              dark={dark}
              lang={lang}
              tr={tr}
              onBack={() => setOverlay(null)}
            />
          )}

          {overlay === 'employeeTracking' && trackingEmp && (
            <EmployeeTrackingScreen
              dark={dark}
              lang={lang}
              tr={tr}
              distributor={trackingEmp.distributor}
              location={trackingEmp.location}
              onBack={closeEmployeeTracking}
            />
          )}

          {overlay === 'profile' && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 40, background: bg }}>
              <ProfileScreen
                dark={dark}
                tr={tr}
                lang={lang}
                user={user}
                onToggleDark={() => setDark(d => !d)}
                onChangeLang={setLang}
                onLogout={() => void handleLogout()}
                onBack={() => setOverlay(null)}
              />
            </div>
          )}

          {showBottomNav && (
            <BottomNav
              active={activeTab}
              onChange={tab => {
                setActiveTab(tab)
                setOverlay(null)
                setTrackingEmp(null)
              }}
              dark={dark}
              tr={tr}
              unreadCount={messagesUnread}
            />
          )}

          {overlay === 'addClient' && (
            <AddClientScreen
              dark={dark}
              tr={tr}
              user={user}
              editClient={editingClient}
              resubmitRequestId={resubmitRequestId}
              onBack={() => {
                setEditingClient(null)
                setResubmitRequestId(null)
                setOverlay(null)
              }}
              onCreated={(result) => {
                setEditingClient(null)
                setResubmitRequestId(null)
                setClientsKey(k => k + 1)
                setActiveTab('clients')
                setOverlay(null)
                if (result?.message) {
                  window.setTimeout(() => {
                    showToast(result.message, result.kind ?? 'success')
                  }, 80)
                }
              }}
            />
          )}

          {overlay === 'products' && (
            <ProductsScreen
              dark={dark}
              lang={lang}
              tr={tr}
              user={user}
              onBack={() => setOverlay(null)}
            />
          )}

          {overlay === 'notifications' && (
            <NotificationsScreen
              dark={dark}
              lang={lang}
              tr={tr}
              onBack={() => {
                setOverlay(null)
                void refreshNotifUnread()
              }}
              onUnreadChange={setNotifUnread}
              onOpen={(n) => {
                const screen = (n.data?.screen || '').toLowerCase()
                const type = (n.type || n.data?.type || '').toLowerCase()
                if (screen === 'client_orders' || type === 'order' || n.data?.subtype?.includes('client_order')) {
                  setOverlay('clientOrders')
                  return
                }
                if (screen === 'plan' || type === 'plan') {
                  setActiveTab('plan')
                  setOverlay(null)
                  return
                }
                if (screen === 'messages' || type === 'message') {
                  setActiveTab('messages')
                  setOverlay(null)
                  const convId = n.data?.conversationId || n.data?.conversation_id
                  if (convId) setOpenConversationId(convId)
                }
              }}
            />
          )}
        </div>
      )}
    </div>
  )
}
