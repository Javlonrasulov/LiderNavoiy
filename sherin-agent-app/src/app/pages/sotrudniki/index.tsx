import { useState } from 'react';
import { Search, Phone, MapPin, UserCheck, Users, CheckCircle } from 'lucide-react';
import { useTheme } from '../../components/ThemeContext';
import BottomNav from '../../components/BottomNav';

const EMPLOYEES = [
  { id: 101, name: 'Alisher Karimov',  avatar: 'AK', role: 'agent',    online: true,  lastSeen: '2 daqiqa oldin',  clients: 28, visits: 14, sales: 4200000 },
  { id: 102, name: 'Bobur Toshmatov',  avatar: 'BT', role: 'agent',    online: true,  lastSeen: '5 daqiqa oldin',  clients: 22, visits: 11, sales: 3800000 },
  { id: 103, name: 'Dilnoza Yusupova', avatar: 'DY', role: 'agent',    online: false, lastSeen: '1 soat oldin',    clients: 19, visits: 8,  sales: 2900000 },
  { id: 104, name: 'Eldor Nazarov',    avatar: 'EN', role: 'agent',    online: true,  lastSeen: '12 daqiqa oldin', clients: 31, visits: 16, sales: 5100000 },
  { id: 105, name: 'Feruza Mirzaeva',  avatar: 'FM', role: 'agent',    online: false, lastSeen: 'Kecha 18:30',     clients: 24, visits: 9,  sales: 3400000 },
  { id: 106, name: 'Sardor Tursunov',  avatar: 'ST', role: 'delivery', online: true,  lastSeen: '1 daqiqa oldin',  clients: 12, visits: 18, sales: 1200000 },
  { id: 107, name: 'Kamola Hasanova',  avatar: 'KH', role: 'delivery', online: true,  lastSeen: '8 daqiqa oldin',  clients: 9,  visits: 15, sales: 980000  },
  { id: 108, name: 'Nodir Rajabov',    avatar: 'NR', role: 'delivery', online: false, lastSeen: '45 daqiqa oldin', clients: 11, visits: 12, sales: 1050000 },
];

const ROLE_COLORS: Record<string, { bg: string; clr: string; label: string }> = {
  agent:    { bg: 'rgba(99,102,241,0.12)', clr: '#6366f1', label: 'Agent' },
  delivery: { bg: 'rgba(16,185,129,0.12)', clr: '#10b981', label: 'Yetkazib beruvchi' },
};
const ROLE_COLORS_RU: Record<string, string> = {
  agent: 'Агент', delivery: 'Доставщик',
};
const ROLE_COLORS_CY: Record<string, string> = {
  agent: 'Агент', delivery: 'Етказиб берувчи',
};

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + ' mln';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + ' ming';
  return String(n);
}

const TRANS = {
  uz_latn: {
    title: 'Xodimlar', search: 'Xodim qidirish...', total: 'Jami',
    online: 'Onlayn', clients: 'Mijoz', visits: 'Tashrif', sales: 'Sotuv',
    noResult: 'Natija topilmadi',
  },
  uz_cyrl: {
    title: 'Ходимлар', search: 'Ходим қидириш...', total: 'Жами',
    online: 'Онлайн', clients: 'Мижоз', visits: 'Ташриф', sales: 'Сотув',
    noResult: 'Натижа топилмади',
  },
  ru: {
    title: 'Сотрудники', search: 'Поиск сотрудника...', total: 'Всего',
    online: 'Онлайн', clients: 'Клиенты', visits: 'Визиты', sales: 'Продажи',
    noResult: 'Ничего не найдено',
  },
};

export default function Sotrudniki() {
  const { isDark, language } = useTheme();
  const t = TRANS[language as keyof typeof TRANS] ?? TRANS.uz_latn;
  const D = isDark;

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'agent' | 'delivery'>('all');

  const filtered = EMPLOYEES.filter(e => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || e.role === filter;
    return matchSearch && matchFilter;
  });

  const onlineCount = EMPLOYEES.filter(e => e.online).length;

  /* tokens */
  const bg     = D ? '#0f0f0f' : '#f5f5f7';
  const card   = D ? '#161616' : '#ffffff';
  const border = D ? 'rgba(255,255,255,0.07)' : '#e5e7eb';
  const txt    = D ? '#f9fafb' : '#111827';
  const muted  = D ? '#6b7280' : '#9ca3af';
  const indigo = '#6366f1';
  const inpBg  = D ? '#1a1a1a' : '#f9fafb';

  const getRoleLabel = (role: string) => {
    if (language === 'ru') return ROLE_COLORS_RU[role] ?? role;
    if (language === 'uz_cyrl') return ROLE_COLORS_CY[role] ?? role;
    return ROLE_COLORS[role]?.label ?? role;
  };

  return (
    <div style={{ minHeight: '100vh', background: bg, paddingBottom: 80 }}>

      {/* ── HEADER ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: card, borderBottom: `1px solid ${border}`,
        padding: '14px 16px 12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'rgba(99,102,241,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <UserCheck size={17} color={indigo} />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: txt }}>{t.title}</div>
            <div style={{ fontSize: 11, color: muted }}>
              {t.total}: {EMPLOYEES.length} · {t.online}: {onlineCount}
            </div>
          </div>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <Search size={14} color={muted} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t.search}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: inpBg, border: `1.5px solid ${border}`,
              borderRadius: 10, padding: '9px 12px 9px 34px',
              fontSize: 13, color: txt, outline: 'none',
            }}
            onFocus={e => { e.target.style.borderColor = indigo; }}
            onBlur={e => { e.target.style.borderColor = border; }}
          />
        </div>

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 6 }}>
          {(['all', 'agent', 'delivery'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontSize: 11, fontWeight: 600,
              background: filter === f ? indigo : (D ? 'rgba(255,255,255,0.07)' : '#f3f4f6'),
              color: filter === f ? '#fff' : muted,
              transition: 'all .15s',
            }}>
              {f === 'all' ? 'Barchasi' : getRoleLabel(f)}
            </button>
          ))}
        </div>
      </div>

      {/* ── STATS ── */}
      <div style={{ display: 'flex', gap: 10, padding: '12px 16px' }}>
        {[
          { icon: Users,      label: t.total,   value: String(EMPLOYEES.length), clr: indigo   },
          { icon: CheckCircle,label: t.online,   value: String(onlineCount),       clr: '#10b981'},
          { icon: MapPin,     label: t.visits,   value: String(EMPLOYEES.reduce((s,e) => s+e.visits, 0)), clr: '#f59e0b'},
        ].map(s => (
          <div key={s.label} style={{
            flex: 1, background: card, borderRadius: 12,
            border: `1px solid ${border}`, padding: '10px 12px',
          }}>
            <s.icon size={14} color={s.clr} />
            <div style={{ fontSize: 16, fontWeight: 700, color: txt, marginTop: 4 }}>{s.value}</div>
            <div style={{ fontSize: 10, color: muted }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── LIST ── */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: muted, fontSize: 14 }}>
            {t.noResult}
          </div>
        )}
        {filtered.map(emp => {
          const roleInfo = ROLE_COLORS[emp.role];
          return (
            <div key={emp.id} style={{
              background: card, borderRadius: 16,
              border: `1px solid ${border}`, padding: '14px',
              cursor: 'pointer', transition: 'all .15s',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = indigo + '50'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = border; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                {/* Avatar */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 14,
                    background: `linear-gradient(135deg, ${roleInfo?.clr ?? indigo}30, ${roleInfo?.clr ?? indigo}15)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `1.5px solid ${roleInfo?.clr ?? indigo}30`,
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: roleInfo?.clr ?? indigo }}>
                      {emp.avatar}
                    </span>
                  </div>
                  {/* online dot */}
                  <div style={{
                    position: 'absolute', bottom: 1, right: 1,
                    width: 10, height: 10, borderRadius: '50%',
                    background: emp.online ? '#10b981' : (D ? '#374151' : '#d1d5db'),
                    border: `2px solid ${card}`,
                  }} />
                </div>

                {/* Name + role */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: txt, marginBottom: 3 }}>
                    {emp.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                      background: roleInfo?.bg, color: roleInfo?.clr,
                    }}>
                      {getRoleLabel(emp.role)}
                    </span>
                    <span style={{ fontSize: 10, color: emp.online ? '#10b981' : muted }}>
                      {emp.online ? '● ' + t.online : emp.lastSeen}
                    </span>
                  </div>
                </div>

                {/* Call button */}
                <button style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'rgba(16,185,129,0.12)', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Phone size={15} color="#10b981" />
                </button>
              </div>

              {/* Stats row */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                gap: 8, paddingTop: 10,
                borderTop: `1px solid ${border}`,
              }}>
                {[
                  { label: t.clients, value: String(emp.clients) },
                  { label: t.visits,  value: String(emp.visits)  },
                  { label: t.sales,   value: fmt(emp.sales)       },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: txt }}>{s.value}</div>
                    <div style={{ fontSize: 10, color: muted }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <BottomNav />
    </div>
  );
}