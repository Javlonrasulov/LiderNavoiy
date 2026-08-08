import { useCallback, useEffect, useState } from 'react'
import { loadLang, t, type Lang } from './i18n'
import { getStoredUser, clearSession } from './api/client'
import { isManagerRole, logout } from './api/auth'
import { getConversations } from './api/messages'
import type { AuthUser, Distributor, EmployeeLocation } from './api/types'
import SplashScreen from './screens/SplashScreen'
import LoginScreen from './screens/LoginScreen'
import HomeScreen from './screens/HomeScreen'
import StaffScreen from './screens/StaffScreen'
import EmployeeTrackingScreen from './screens/EmployeeTrackingScreen'
import ClientsScreen from './screens/ClientsScreen'
import AddClientScreen from './screens/AddClientScreen'
import ProductsScreen from './screens/ProductsScreen'
import PlanScreen from './screens/PlanScreen'
import ProfileScreen from './screens/ProfileScreen'
import MessagesScreen from './screens/MessagesScreen'
import ClientOrdersScreen from './screens/ClientOrdersScreen'
import FactoryOrdersScreen from './screens/FactoryOrdersScreen'
import BottomNav, { type Tab } from './components/BottomNav'
import { ToastHost } from './components/Toast'
import { initManagerPush, syncPushLanguage } from './push/registerPush'

type Phase = 'splash' | 'login' | 'app'
type Overlay = 'addClient' | 'products' | 'clientOrders' | 'factoryOrders' | 'employeeTracking' | 'profile' | null

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
  const [messagesUnread, setMessagesUnread] = useState(0)
  const [openConversationId, setOpenConversationId] = useState<string | null>(null)

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

  useEffect(() => {
    if (phase !== 'app') return
    void refreshUnread()
    const id = window.setInterval(() => void refreshUnread(), 45_000)
    return () => window.clearInterval(id)
  }, [phase, refreshUnread])

  useEffect(() => {
    if (phase !== 'app') return
    void initManagerPush({
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

  const tr = t[lang]
  const bg = dark ? '#080812' : '#F8F9FC'

  const afterSplash = () => {
    const u = getStoredUser()
    if (u && isManagerRole(u)) {
      setUser(u)
      setPhase('app')
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
    setPhase('login')
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
  }

  const openEmployeeTracking = (distributor: Distributor, location?: EmployeeLocation) => {
    setTrackingEmp({ distributor, location })
    setOverlay('employeeTracking')
  }

  const closeEmployeeTracking = () => {
    setOverlay(null)
    setTrackingEmp(null)
  }

  const showBottomNav =
    overlay === null ||
    overlay === 'clientOrders' ||
    overlay === 'products'

  return (
    <div className="app-shell" style={{ background: bg }}>
      <ToastHost />
      {phase === 'splash' && (
        <SplashScreen onDone={afterSplash} tr={tr} />
      )}

      {phase === 'login' && (
        <LoginScreen
          dark={dark}
          tr={tr}
          lang={lang}
          onChangeLang={setLang}
          onToggleDark={() => setDark(d => !d)}
          onSuccess={(u) => {
            setUser(u)
            setPhase('app')
          }}
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
                onAdd={() => setOverlay('addClient')}
              />
            )}
            {activeTab === 'plan' && <PlanScreen dark={dark} lang={lang} tr={tr} />}
            {activeTab === 'messages' && (
              <MessagesScreen
                dark={dark}
                tr={tr}
                openConversationId={openConversationId}
                onUnreadChange={setMessagesUnread}
                onConversationOpened={() => setOpenConversationId(null)}
              />
            )}
          </div>

          {overlay === 'clientOrders' && (
            <ClientOrdersScreen
              dark={dark}
              lang={lang}
              tr={tr}
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
              onBack={() => setOverlay(null)}
              onCreated={() => {
                setClientsKey(k => k + 1)
                setActiveTab('clients')
                setOverlay(null)
              }}
            />
          )}

          {overlay === 'products' && (
            <ProductsScreen
              dark={dark}
              lang={lang}
              tr={tr}
              onBack={() => setOverlay(null)}
            />
          )}
        </div>
      )}
    </div>
  )
}
