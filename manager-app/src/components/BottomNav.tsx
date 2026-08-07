import { Home, Users, Store, BarChart3, User } from '../icons'
import type { Translations } from '../i18n'

export type Tab = 'home' | 'staff' | 'clients' | 'plan' | 'profile'

interface Props {
  active: Tab
  onChange: (tab: Tab) => void
  dark: boolean
  tr: Translations
}

export default function BottomNav({ active, onChange, dark, tr }: Props) {
  const bg = dark ? 'rgba(13,13,26,0.94)' : 'rgba(255,255,255,0.94)'
  const border = dark ? 'rgba(150,130,255,0.1)' : 'rgba(108,92,231,0.08)'

  const tabs = [
    { id: 'home' as Tab, icon: Home, label: tr.home },
    { id: 'staff' as Tab, icon: Users, label: tr.staffNav },
    { id: 'clients' as Tab, icon: Store, label: tr.clientsNav },
    { id: 'plan' as Tab, icon: BarChart3, label: tr.planNav },
    { id: 'profile' as Tab, icon: User, label: tr.profileNav },
  ]

  return (
    <div style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      background: bg,
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      borderTop: `1px solid ${border}`,
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-around',
      paddingTop: 10,
      paddingBottom: 'var(--bottom-nav-pad)',
      paddingLeft: 'var(--safe-left)',
      paddingRight: 'var(--safe-right)',
      zIndex: 50,
      boxSizing: 'border-box',
    }}>
      {tabs.map(tab => {
        const isActive = active === tab.id
        return (
          <button key={tab.id} onClick={() => onChange(tab.id)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flex: 1,
              position: 'relative', background: 'none', border: 'none', cursor: 'pointer',
              transition: 'all 0.2s ease', minWidth: 0, paddingBottom: 2,
            }}>
            <div style={{
              width: isActive ? 50 : 40, height: 36, borderRadius: 13,
              background: isActive ? 'rgba(108,92,231,0.15)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative', transition: 'all 0.2s ease',
            }}>
              <tab.icon size={20} color={isActive ? '#6C5CE7' : dark ? '#6B6B9A' : '#9CA3AF'} strokeWidth={isActive ? 2.5 : 1.8} />
            </div>
            <span style={{
              fontSize: 10, fontWeight: isActive ? 700 : 400,
              color: isActive ? '#6C5CE7' : dark ? '#6B6B9A' : '#9CA3AF',
              transition: 'all 0.2s ease', whiteSpace: 'nowrap', overflow: 'hidden',
              textOverflow: 'ellipsis', maxWidth: '100%', padding: '0 2px', lineHeight: 1.2,
            }}>
              {tab.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
