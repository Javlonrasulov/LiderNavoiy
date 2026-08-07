import { useEffect, useState } from 'react'
import { loadLang, t, type Lang } from './i18n'
import { getStoredUser, clearSession } from './api/client'
import { isManagerRole, logout } from './api/auth'
import type { AuthUser } from './api/types'
import SplashScreen from './screens/SplashScreen'
import LoginScreen from './screens/LoginScreen'
import HomeScreen from './screens/HomeScreen'
import StaffScreen from './screens/StaffScreen'
import ClientsScreen from './screens/ClientsScreen'
import AddClientScreen from './screens/AddClientScreen'
import ProductsScreen from './screens/ProductsScreen'
import PlanScreen from './screens/PlanScreen'
import ProfileScreen from './screens/ProfileScreen'
import ClientOrdersScreen from './screens/ClientOrdersScreen'
import BottomNav, { type Tab } from './components/BottomNav'

type Phase = 'splash' | 'login' | 'app'
type Overlay = 'addClient' | 'products' | 'clientOrders' | null

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
  const [dark, setDark] = useState(loadDark)
  const [lang, setLang] = useState<Lang>(loadLang)
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser())
  const [clientsKey, setClientsKey] = useState(0)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('lm-dark', dark ? '1' : '0')
  }, [dark])

  useEffect(() => {
    localStorage.setItem('lm-lang', lang)
    document.documentElement.lang = lang === 'ru' ? 'ru' : 'uz'
  }, [lang])

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
    setPhase('login')
  }

  const navigate = (screen: string) => {
    if (screen === 'staff') { setActiveTab('staff'); setOverlay(null) }
    else if (screen === 'clients') { setActiveTab('clients'); setOverlay(null) }
    else if (screen === 'plan') { setActiveTab('plan'); setOverlay(null) }
    else if (screen === 'profile') { setActiveTab('profile'); setOverlay(null) }
    else if (screen === 'home') { setActiveTab('home'); setOverlay(null) }
    else if (screen === 'products') setOverlay('products')
    else if (screen === 'addClient') setOverlay('addClient')
    else if (screen === 'clientOrders') setOverlay('clientOrders')
  }

  return (
    <div className="app-shell" style={{ background: bg }}>
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
            {activeTab === 'staff' && <StaffScreen dark={dark} tr={tr} />}
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
            {activeTab === 'profile' && (
              <ProfileScreen
                dark={dark}
                tr={tr}
                lang={lang}
                user={user}
                onToggleDark={() => setDark(d => !d)}
                onChangeLang={setLang}
                onLogout={() => void handleLogout()}
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

          {(overlay === null || overlay === 'clientOrders' || overlay === 'products') && (
            <BottomNav
              active={activeTab}
              onChange={tab => { setActiveTab(tab); setOverlay(null) }}
              dark={dark}
              tr={tr}
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
