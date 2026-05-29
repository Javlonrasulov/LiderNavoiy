import { Home, Truck, Map, BarChart3, MessageCircle } from 'lucide-react';
import { useTheme } from './ThemeContext';
import { useNavigate, useLocation } from 'react-router';

export type NavPage = 'home' | 'dostavka' | 'locatsiya' | 'plan' | 'messages';

interface BottomNavProps {
  activePage?: NavPage;
  onNavigate?: (page: NavPage) => void;
}

const TRANS = {
  uz_latn: {
    home:      'Asosiy',
    dostavka:  'Dostavka',
    locatsiya: 'Locatsiya',
    plan:      'Plan',
    messages:  'Xabarlar',
  },
  uz_cyrl: {
    home:      'Асосий',
    dostavka:  'Доставка',
    locatsiya: 'Локация',
    plan:      'Режа',
    messages:  'Хабарлар',
  },
  ru: {
    home:      'Главная',
    dostavka:  'Доставка',
    locatsiya: 'Локация',
    plan:      'План',
    messages:  'Сообщения',
  },
};

const ROUTES: Record<NavPage, string> = {
  home:      '/',
  dostavka:  '/visit',
  locatsiya: '/locatsiya',
  plan:      '/plan',
  messages:  '/messages',
};

// Auto-detect active page from current URL
function detectPage(pathname: string): NavPage {
  if (pathname === '/' || pathname === '/home') return 'home';
  if (pathname.startsWith('/visit') || pathname.startsWith('/order') || pathname.startsWith('/sverka')) return 'dostavka';
  if (pathname.startsWith('/locatsiya') || pathname.startsWith('/clients') || pathname.startsWith('/client')) return 'locatsiya';
  if (pathname.startsWith('/plan')) return 'plan';
  if (pathname.startsWith('/messages') || pathname.startsWith('/chat')) return 'messages';
  return 'home';
}

export default function BottomNav({ activePage, onNavigate }: BottomNavProps) {
  const { isDark, language } = useTheme();
  const navigate  = useNavigate();
  const location  = useLocation();
  const t = TRANS[language as keyof typeof TRANS] ?? TRANS.uz_latn;

  // Use prop if provided, otherwise auto-detect from URL
  const current: NavPage = activePage ?? detectPage(location.pathname);

  const navItems: { id: NavPage; icon: React.ElementType; label: string }[] = [
    { id: 'home',      icon: Home,          label: t.home      },
    { id: 'dostavka',  icon: Truck,         label: t.dostavka  },
    { id: 'locatsiya', icon: Map,           label: t.locatsiya },
    { id: 'plan',      icon: BarChart3,      label: t.plan      },
    { id: 'messages',  icon: MessageCircle, label: t.messages  },
  ];

  const handleClick = (id: NavPage) => {
    if (id === 'dostavka') return; // Dostavka hozircha ishlamaydi
    if (onNavigate) {
      onNavigate(id);
    } else {
      navigate(ROUTES[id]);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
        background: isDark ? '#111111' : '#ffffff',
        borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`,
        boxShadow: isDark ? '0 -4px 20px rgba(0,0,0,0.4)' : '0 -4px 20px rgba(0,0,0,0.06)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        pointerEvents: 'all',
      }}
    >
      <div style={{ maxWidth: 480, margin: '0 auto', display: 'flex', alignItems: 'stretch' }}>
        {navItems.map(item => {
          const active = current === item.id;
          const activeColor = '#6366f1';
          const inactiveColor = isDark ? '#6b7280' : '#9ca3af';
          return (
            <button
              key={item.id}
              onClick={() => handleClick(item.id)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 3, padding: '10px 4px 14px',
                border: 'none', background: 'transparent', cursor: 'pointer',
                position: 'relative', WebkitTapHighlightColor: 'transparent',
              }}
            >
              {/* Active indicator line */}
              {active && (
                <span style={{
                  position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                  width: 28, height: 2.5, borderRadius: 2,
                  background: activeColor,
                }} />
              )}
              {/* Active background blob */}
              {active && (
                <span style={{
                  position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)',
                  width: 40, height: 32, borderRadius: 10,
                  background: 'rgba(99,102,241,0.10)',
                }} />
              )}
              <item.icon
                size={21}
                color={active ? activeColor : inactiveColor}
                strokeWidth={active ? 2.2 : 1.7}
              />
              <span style={{
                fontSize: 10,
                fontWeight: active ? 600 : 400,
                letterSpacing: '0.01em',
                color: active ? activeColor : inactiveColor,
                transition: 'color .15s',
                position: 'relative',
              }}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}