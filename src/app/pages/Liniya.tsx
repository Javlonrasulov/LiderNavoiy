import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Search, Plus, ChevronRight, GitBranch, Users, TrendingUp } from 'lucide-react';
import { useTheme } from '../components/ThemeContext';
import BottomNav from '../components/BottomNav';

const LINES_DATA = [
  { id: 1,  code: '01', name: 'Toshrabot. Xazora. Airoport.', kolTT: 140, agent: 'Alisher Karimov',  plan: 85 },
  { id: 2,  code: '02', name: 'Nurata',                         kolTT: 102, agent: 'Bobur Toshmatov',  plan: 72 },
  { id: 3,  code: '03', name: 'Xatirchi',                       kolTT: 169, agent: 'Dilnoza Yusupova', plan: 91 },
  { id: 4,  code: '04', name: 'Kizilteba',                      kolTT: 44,  agent: 'Eldor Nazarov',    plan: 60 },
  { id: 5,  code: '05', name: "G'azg'on",                       kolTT: 6,   agent: 'Feruza Mirzaeva',  plan: 45 },
  { id: 6,  code: '06', name: 'Xoncherok',                      kolTT: 49,  agent: 'Alisher Karimov',  plan: 78 },
  { id: 7,  code: '07', name: 'Navbahor',                       kolTT: 69,  agent: 'Bobur Toshmatov',  plan: 83 },
  { id: 8,  code: '08', name: 'Bishrabot',                      kolTT: 37,  agent: 'Dilnoza Yusupova', plan: 55 },
  { id: 9,  code: '09', name: 'Narpay',                         kolTT: 53,  agent: 'Eldor Nazarov',    plan: 70 },
  { id: 10, code: '10', name: 'Jaloqir',                        kolTT: 59,  agent: 'Feruza Mirzaeva',  plan: 88 },
  { id: 11, code: '11', name: 'Konimex. Zafarobod',             kolTT: 56,  agent: 'Alisher Karimov',  plan: 65 },
  { id: 12, code: '12', name: 'Yangi Bozor. 9-Bozor',          kolTT: 65,  agent: 'Bobur Toshmatov',  plan: 79 },
  { id: 13, code: '13', name: 'Eski Shahar',                    kolTT: 137, agent: 'Dilnoza Yusupova', plan: 92 },
  { id: 14, code: '14', name: "Yangi Yo'l",                     kolTT: 36,  agent: 'Eldor Nazarov',    plan: 50 },
  { id: 15, code: '15', name: '17-18 Mikr. Unid',               kolTT: 107, agent: 'Feruza Mirzaeva',  plan: 87 },
  { id: 16, code: '16', name: '10 mkr',                         kolTT: 57,  agent: 'Alisher Karimov',  plan: 74 },
  { id: 17, code: '17', name: '7-mkr',                          kolTT: 52,  agent: 'Bobur Toshmatov',  plan: 66 },
  { id: 18, code: '18', name: '9-mkr',                          kolTT: 35,  agent: 'Dilnoza Yusupova', plan: 48 },
  { id: 19, code: '19', name: '1-2 mkr',                        kolTT: 53,  agent: 'Eldor Nazarov',    plan: 71 },
  { id: 20, code: '20', name: 'Sputnik. 3-4 mkr. Janubiy',     kolTT: 58,  agent: 'Feruza Mirzaeva',  plan: 82 },
  { id: 21, code: '21', name: 'Vaqzal. Chutqara. Guliston',    kolTT: 66,  agent: 'Alisher Karimov',  plan: 90 },
  { id: 22, code: '22', name: '18 mkr',                         kolTT: 61,  agent: 'Bobur Toshmatov',  plan: 77 },
  { id: 23, code: '23', name: 'Energetik. Harbiy Gorodok',      kolTT: 71,  agent: 'Dilnoza Yusupova', plan: 85 },
  { id: 24, code: '24', name: '6-mkr',                          kolTT: 52,  agent: 'Eldor Nazarov',    plan: 63 },
  { id: 25, code: '25', name: 'Sklad',                          kolTT: 59,  agent: 'Feruza Mirzaeva',  plan: 76 },
];

const TRANS = {
  uz_latn: {
    title: 'Liniyalar', search: 'Qidirish...', total: 'Jami',
    lines: 'liniya', kolTT: 'Kol TT', agent: 'Agent', plan: 'Reja',
    noResult: 'Natija topilmadi',
  },
  uz_cyrl: {
    title: 'Линиялар', search: 'Қидириш...', total: 'Жами',
    lines: 'линия', kolTT: 'Кол ТТ', agent: 'Агент', plan: 'Режа',
    noResult: 'Натижа топилмади',
  },
  ru: {
    title: 'Линии', search: 'Поиск...', total: 'Всего',
    lines: 'линий', kolTT: 'Кол ТТ', agent: 'Агент', plan: 'План',
    noResult: 'Ничего не найдено',
  },
};

export default function Liniya() {
  const { isDark, language } = useTheme();
  const navigate = useNavigate();
  const t = TRANS[language as keyof typeof TRANS] ?? TRANS.uz_latn;
  const D = isDark;

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<number | null>(null);

  const filtered = LINES_DATA.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.code.includes(search)
  );

  const totalTT = LINES_DATA.reduce((s, l) => s + l.kolTT, 0);

  /* tokens */
  const bg      = D ? '#0f0f0f' : '#f5f5f7';
  const card    = D ? '#161616' : '#ffffff';
  const border  = D ? 'rgba(255,255,255,0.07)' : '#e5e7eb';
  const txt     = D ? '#f9fafb' : '#111827';
  const muted   = D ? '#6b7280' : '#9ca3af';
  const indigo  = '#6366f1';
  const inpBg   = D ? '#1a1a1a' : '#f9fafb';

  const planColor = (p: number) =>
    p >= 85 ? '#10b981' : p >= 65 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ minHeight: '100vh', background: bg, paddingBottom: 80 }}>

      {/* ── HEADER ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: card, borderBottom: `1px solid ${border}`,
        padding: '14px 16px 12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10, background: 'rgba(99,102,241,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <GitBranch size={17} color={indigo} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: txt }}>{t.title}</div>
              <div style={{ fontSize: 11, color: muted }}>
                {t.total}: {LINES_DATA.length} {t.lines} · {totalTT} {t.kolTT}
              </div>
            </div>
          </div>
          <button style={{
            width: 34, height: 34, borderRadius: 10, border: 'none', cursor: 'pointer',
            background: indigo, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Plus size={17} color="#fff" />
          </button>
        </div>

        {/* Search */}
        <div style={{ position: 'relative' }}>
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
      </div>

      {/* ── STATS ROW ── */}
      <div style={{ display: 'flex', gap: 10, padding: '12px 16px' }}>
        {[
          { icon: GitBranch, label: t.lines, value: String(LINES_DATA.length), clr: indigo },
          { icon: Users,     label: t.kolTT, value: String(totalTT),            clr: '#10b981' },
          { icon: TrendingUp,label: t.plan,  value: '77%',                      clr: '#f59e0b' },
        ].map(s => (
          <div key={s.label} style={{
            flex: 1, background: card, borderRadius: 12,
            border: `1px solid ${border}`, padding: '10px 12px',
            display: 'flex', flexDirection: 'column', gap: 4,
          }}>
            <s.icon size={14} color={s.clr} />
            <div style={{ fontSize: 16, fontWeight: 700, color: txt }}>{s.value}</div>
            <div style={{ fontSize: 10, color: muted }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── LIST ── */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: muted, fontSize: 14 }}>
            {t.noResult}
          </div>
        )}
        {filtered.map(line => {
          const isSelected = selected === line.id;
          return (
            <div
              key={line.id}
              onClick={() => setSelected(isSelected ? null : line.id)}
              style={{
                background: isSelected
                  ? (D ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.06)')
                  : card,
                borderRadius: 14,
                border: `1px solid ${isSelected ? 'rgba(99,102,241,0.4)' : border}`,
                padding: '12px 14px',
                cursor: 'pointer',
                transition: 'all .15s',
                display: 'flex', alignItems: 'center', gap: 12,
              }}
            >
              {/* Code badge */}
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: isSelected ? indigo : (D ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.08)'),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: isSelected ? '#fff' : indigo }}>
                  {line.code}
                </span>
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontWeight: 600, color: isSelected ? indigo : txt,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  marginBottom: 3,
                }}>
                  {line.code} - {line.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    fontSize: 10, color: muted, background: D ? 'rgba(255,255,255,0.05)' : '#f3f4f6',
                    padding: '2px 7px', borderRadius: 6,
                  }}>
                    {t.kolTT}: {line.kolTT}
                  </span>
                  <span style={{
                    fontSize: 10, color: planColor(line.plan),
                    background: `${planColor(line.plan)}18`,
                    padding: '2px 7px', borderRadius: 6,
                  }}>
                    {line.plan}%
                  </span>
                </div>
              </div>

              {/* Agent + arrow */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                <ChevronRight size={16} color={muted} />
                <span style={{
                  fontSize: 10, color: muted, maxWidth: 90,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  textAlign: 'right',
                }}>
                  {line.agent.split(' ')[0]}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <BottomNav />
    </div>
  );
}