import { useState, useMemo, useRef } from 'react';
import {
  Search, Download, Plus, ChevronLeft, ChevronRight,
  RotateCcw, ChevronDown, ChevronUp,
  Maximize2, X,
} from 'lucide-react';
import { AdminVozvratSozdatModal } from './AdminVozvratSozdatModal';

// ── Mock return data ──────────────────────────────────────────────────────────
interface ReturnRow {
  id: number;
  sana: string;        // "02.03.2026 14:25:30"
  nomer: number;       // order number
  kod: string;
  kontragent: string;
  agent: string;
  buyurtmaNo: number;
  buyurtmaSana: string;
  liniya: string;
  yonalish: string;
  tip: string;
  summa: number;
  vazn: number;
  muallif: string;
  exId: number;
}

const MOCK_RETURNS: ReturnRow[] = [
  { id:1,  sana:'02.03.2026 14:25:30', nomer:29072, kod:'КОЛМУРОДОВА САБРИНА',             kontragent:'KOLMURODOVA SABRINA',                    agent:'Самандарова',        buyurtmaNo:14918, buyurtmaSana:'26.02.2026', liniya:'02 - Tourabort.',     yonalish:'SHERIN', tip:'D2', summa:373494.20,  vazn:13.350,  muallif:'Зарипов Бегзод', exId:80  },
  { id:2,  sana:'02.03.2026 14:26:13', nomer:31629, kod:'МУСУЛИМА МУБИНА ЮКСАЛИШИ Х/К',   kontragent:'MUSLIMA MUBINA YKSALISHI X/K',            agent:'Тухтаниёзов У.',    buyurtmaNo:15482, buyurtmaSana:'28.02.2026', liniya:'02 - Xatirchi',       yonalish:'SHERIN', tip:'D2', summa:5610,       vazn:5.610,   muallif:'Зарипов Бегзод', exId:81  },
  { id:3,  sana:'03.03.2026 12:27:16', nomer:28926, kod:'QUSHBEG RESTARAN',                kontragent:'Qushbeg restaran',                        agent:'Назаров Давл.',     buyurtmaNo:15645, buyurtmaSana:'02.03.2026', liniya:'27 - Xasanov A.',     yonalish:'SHERIN', tip:'D2', summa:1464341.92, vazn:41.680,  muallif:'Зарипов Бегзод', exId:82  },
  { id:4,  sana:'03.03.2026 13:02:04', nomer:14016, kod:'TRADING BOXODIR KARMANA',         kontragent:'TRADING BOXODIR KARMANA',                 agent:'Эргашева Пала',     buyurtmaNo:12866, buyurtmaSana:'19.02.2026', liniya:'02 - Янги Йул',       yonalish:'SHERIN', tip:'D2', summa:505957.70,  vazn:259.780, muallif:'Зарипов Бегзод', exId:83  },
  { id:5,  sana:'04.03.2026 12:28:15', nomer:29454, kod:'BEST WAY GROUP MCHJ',             kontragent:'"BEST WAY GROUP" MCHJ',                   agent:'Тухтаниёзов У.',    buyurtmaNo:15682, buyurtmaSana:'02.03.2026', liniya:'02 - Нурато',         yonalish:'SHERIN', tip:'D2', summa:210578.45,  vazn:232.950, muallif:'Зарипов Бегзод', exId:84  },
  { id:6,  sana:'04.03.2026 13:08:23', nomer:85009, kod:'CHP SALIMOVA HATICHA MUXTOROVNA', kontragent:'CHP SALIMOVA HATICHA MUXTOROVNA',         agent:'Тухтаниёзов У.',    buyurtmaNo:12048, buyurtmaSana:'17.02.2026', liniya:'02 - Казилтепа',      yonalish:'SHERIN', tip:'D2', summa:604964.62,  vazn:42.060,  muallif:'Зарипов Бегзод', exId:85  },
  { id:7,  sana:'05.03.2026 23:04:43', nomer:20941, kod:'SAMIR MARKET',                    kontragent:'Samir market',                            agent:'Норова Нозима',     buyurtmaNo:16010, buyurtmaSana:'03.03.2026', liniya:'17 - 7-никр',         yonalish:'SHERIN', tip:'D2', summa:227700.00,  vazn:2.575,   muallif:'Зарипов Бегзод', exId:86  },
  { id:8,  sana:'06.03.2026 22:51:01', nomer:28711, kod:'ДУРДОНА ДИЛДОРА КЕЛАЖАК САРИ',   kontragent:'"Дурдона Дилдора Келажак Сари"',          agent:'Самандарова',       buyurtmaNo:16011, buyurtmaSana:'03.03.2026', liniya:'28 - Азизбогбой',     yonalish:'SHERIN', tip:'D2', summa:335294.92,  vazn:10.620,  muallif:'Зарипов Бегзод', exId:87  },
  { id:9,  sana:'06.03.2026 22:52:59', nomer:28929, kod:'GOLD 777',                        kontragent:'GOLD 777',                                agent:'Норова Нозима',     buyurtmaNo:16122, buyurtmaSana:'03.03.2026', liniya:'15 - 17-18 Микр.',    yonalish:'SHERIN', tip:'D2', summa:319381.47,  vazn:5.460,   muallif:'Зарипов Бегзод', exId:88  },
  { id:10, sana:'07.03.2026 22:45:32', nomer:16019, kod:'NAVOIY MEXROJBEK OMADI MCHJ',    kontragent:'NAVOIY MEXROJBEK OMADI MCHJ',             agent:'Норова Нозима',     buyurtmaNo:16078, buyurtmaSana:'03.03.2026', liniya:'10 - 10-никр',        yonalish:'SHERIN', tip:'D2', summa:240566.44,  vazn:9.370,   muallif:'Зарипов Бегзод', exId:89  },
  { id:11, sana:'07.03.2026 22:51:01', nomer:83091, kod:'INTELLECT BEST SAVDO YTT',       kontragent:'INTELLECT BEST SAVDO YTT',                agent:'Тухтаниёзов У.',    buyurtmaNo:16466, buyurtmaSana:'04.03.2026', liniya:'02 - Xatirchi',       yonalish:'SHERIN', tip:'D2', summa:645250.56,  vazn:11.440, muallif:'Зарипов Бегзод', exId:90  },
  { id:12, sana:'10.03.2026 11:02:54', nomer:16016, kod:'NAVOIY MEXROJBEK OMADI MCHJ',    kontragent:'NAVOIY MEXROJBEK OMADI MCHJ',             agent:'Норова Нозима',     buyurtmaNo:17688, buyurtmaSana:'07.03.2026', liniya:'16 - 10-никр',        yonalish:'SHERIN', tip:'D2', summa:370171.44,  vazn:10.150,  muallif:'Исматулаев Кув.', exId:91 },
  { id:13, sana:'11.03.2026 09:03:47', nomer:84014, kod:'ШАРИПОВ ФАРРУХ',                 kontragent:'Шарипов Фаррух',                          agent:'Тошниёзов Ш.',      buyurtmaNo:17743, buyurtmaSana:'07.03.2026', liniya:'25 - Sklаd',          yonalish:'SHERIN', tip:'D2', summa:4133226.00, vazn:777.160, muallif:'Зарипов Бегзод', exId:92  },
  { id:14, sana:'11.03.2026 10:06:01', nomer:10013, kod:'АДИЗОВА КОЛНОЗ ИСМАТОВНА ЯТТ',  kontragent:'Олимов Одил.',                            agent:'Тошниёзов Ш.',      buyurtmaNo:17149, buyurtmaSana:'05.03.2026', liniya:'10 - Жалол',          yonalish:'SHERIN', tip:'D2', summa:400812.00,  vazn:14.840,  muallif:'Зарипов Бегзод', exId:93  },
  { id:15, sana:'11.03.2026 10:12:03', nomer:84009, kod:'СКЛАД ШЕРИН БЕГЗОД',             kontragent:'Sklad Sherin BEGZOD',                     agent:'Тошниёзов Ш.',      buyurtmaNo:17632, buyurtmaSana:'06.03.2026', liniya:'25 - Sklad',          yonalish:'SHERIN', tip:'D2', summa:370379.62,  vazn:53.560,  muallif:'Зарипов Бегзод', exId:94  },
  { id:16, sana:'11.03.2026 16:00:08', nomer:28383, kod:'ГУЛСЕВАР БАРАКА ХОНЛАРГИ',       kontragent:'Гулсевар Барака Хонлари',                 agent:'Самандарова',       buyurtmaNo:17406, buyurtmaSana:'06.03.2026', liniya:'01 - Tourabort.',     yonalish:'SHERIN', tip:'D2', summa:812585.48,  vazn:23.010,  muallif:'Зарипов Бегзод', exId:95  },
  { id:17, sana:'11.03.2026 16:08:46', nomer:85009, kod:'CHP SALIMOVA HATICHA MUXTOROVNA', kontragent:'CHP SALIMOVA HATICHA MUXTOROVNA',        agent:'Тухтаниёзов У.',    buyurtmaNo:18237, buyurtmaSana:'06.03.2026', liniya:'04 - Казилтепа',      yonalish:'SHERIN', tip:'D2', summa:647471.44,  vazn:54.660,  muallif:'Зарипов Бегзод', exId:96  },
  { id:18, sana:'12.03.2026 15:07:39', nomer:23008, kod:'МУСОЕВА ОЗОДА ШОЙИМОВНА',        kontragent:'MUSOYEVA OZODA SHOYIMOVNA',               agent:'Тошниёзов Об.',     buyurtmaNo:17629, buyurtmaSana:'06.03.2026', liniya:'23 - Энергетик',      yonalish:'SHERIN', tip:'D2', summa:798265.60,  vazn:34.190,  muallif:'Зарипов Бегзод', exId:97  },
  { id:19, sana:'12.03.2026 15:09:28', nomer:98009, kod:'ХАЙДАРОВА МУСАЛЛАМ БАҲРИДДИН',  kontragent:'HAYDAROVA MUSALLAM BAHRIDDIN QIZI',      agent:'Тошниёзов Ш.',      buyurtmaNo:18389, buyurtmaSana:'06.03.2026', liniya:'18 - 8-никр',         yonalish:'SHERIN', tip:'D2', summa:77364.00,   vazn:3.650,   muallif:'Зарипов Бегзод', exId:98  },
  { id:20, sana:'13.03.2026 10:23:14', nomer:29023, kod:'ЗАРИНОЕВ 1994 МЧҲЖ',             kontragent:'ZARINAOV 1994 MCHJ',                      agent:'Тошниёзов Об.',     buyurtmaNo:18354, buyurtmaSana:'10.03.2026', liniya:'23 - Энергетик',      yonalish:'SHERIN', tip:'D2', summa:73764.00,   vazn:23.950,  muallif:'Зарипов Бегзод', exId:99  },
  { id:21, sana:'13.03.2026 11:45:38', nomer:85009, kod:'CHP SALIMOVA HATICHA MUXTOROVNA', kontragent:'CHP SALIMOVA HATICHA MUXTOROVNA',        agent:'Тухтаниёзов У.',    buyurtmaNo:18694, buyurtmaSana:'10.03.2026', liniya:'04 - Казилтепа',      yonalish:'SHERIN', tip:'D2', summa:584014.44,  vazn:8.360,   muallif:'Зарипов Бегзод', exId:100 },
  { id:22, sana:'13.03.2026 11:46:32', nomer:1039,  kod:'ПУТЛИЁН ОРАЗУСН 2000',            kontragent:'Путлиён Оразусн 2000',                    agent:'Самандарова',       buyurtmaNo:18619, buyurtmaSana:'11.03.2026', liniya:'01 - Tourabort.',     yonalish:'SHERIN', tip:'D2', summa:117079.20,  vazn:4.240,   muallif:'Зарипов Бегзод', exId:101 },
  { id:23, sana:'13.03.2026 12:06:02', nomer:8020,  kod:'МУСАJДОН МИЗОРИЗHELI КELAJAK',  kontragent:'MUSAJDON MIZARIZ KELAJAK BUNYODKORI OK', agent:'Олимов Одил.',      buyurtmaNo:18797, buyurtmaSana:'11.03.2026', liniya:'08 - Бешарбот',       yonalish:'SHERIN', tip:'D2', summa:296869.00,  vazn:68.495,  muallif:'Исматулаев Кув.', exId:102 },
  { id:24, sana:'14.03.2026 13:01:08', nomer:29086, kod:'BARKAMOL BIZNES-KLASS',           kontragent:'BARKAMOL BIZNES-KLASS Xususiy koxona',   agent:'Норова Нозима',     buyurtmaNo:19017, buyurtmaSana:'12.03.2026', liniya:'17 - 7-никр',         yonalish:'SHERIN', tip:'D2', summa:101016.00,  vazn:9.725,   muallif:'Исматулаев Кув.', exId:103 },
  { id:25, sana:'14.03.2026 15:22:10', nomer:72031, kod:'DILSHOD SAVDO MARKAZI',           kontragent:'Dilshod Savdo Markazi',                   agent:'Норова Нозима',     buyurtmaNo:19121, buyurtmaSana:'12.03.2026', liniya:'15 - Микр.',          yonalish:'SHERIN', tip:'D2', summa:218450.00,  vazn:7.320,   muallif:'Зарипов Бегзод', exId:104 },
  { id:26, sana:'15.03.2026 09:15:44', nomer:63044, kod:'AYOL SAVDO KOMBINATI',            kontragent:'Ayol Savdo Kombinati',                    agent:'Эргашева Пала',     buyurtmaNo:19232, buyurtmaSana:'13.03.2026', liniya:'04 - Казилтепа',      yonalish:'SHERIN', tip:'D2', summa:534720.00,  vazn:22.800,  muallif:'Зарипов Бегзод', exId:105 },
  { id:27, sana:'15.03.2026 11:38:22', nomer:91002, kod:'PREMIUM SAVDO MCHJ',              kontragent:'Premium Savdo MCHJ',                      agent:'Тухтаниёзов У.',    buyurtmaNo:19350, buyurtmaSana:'13.03.2026', liniya:'02 - Xatirchi',       yonalish:'SHERIN', tip:'D2', summa:987600.00,  vazn:45.500,  muallif:'Зарипов Бегзод', exId:106 },
  { id:28, sana:'15.03.2026 14:05:17', nomer:44107, kod:'NASIBA HOLDING',                  kontragent:'Nasiba Holding OOO',                      agent:'Самандарова',       buyurtmaNo:19401, buyurtmaSana:'14.03.2026', liniya:'27 - Xasanov A.',     yonalish:'SHERIN', tip:'D2', summa:1234500.00, vazn:88.200,  muallif:'Исматулаев Кув.', exId:107 },
];

const PAGE_SIZE = 15;

interface Props {
  D: boolean;
  t: Record<string, string>;
}

function fmtMoney(n: number) {
  return n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function AdminQaytarishTab({ D, t }: Props) {
  const [search, setSearch] = useState('');
  const [page,   setPage]   = useState(1);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const tableRef   = useRef<HTMLDivElement>(null);
  const fsTableRef = useRef<HTMLDivElement>(null);

  // ── Colours ─────────────────────────────────────────────────────────────────
  const bg    = D ? '#0d0d0d'  : '#f4f5f7';
  const bg2   = D ? '#1c1c1e'  : '#ffffff';
  const bg3   = D ? '#252830'  : '#f1f3f8';
  const bdr   = D ? '#2a2a2e'  : '#e5e7eb';
  const txt   = D ? '#f2f2f7'  : '#111827';
  const sub   = D ? '#6b7280'  : '#9ca3af';
  const acc   = '#6366f1';

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return MOCK_RETURNS;
    return MOCK_RETURNS.filter(r =>
      r.kontragent.toLowerCase().includes(q) ||
      r.agent.toLowerCase().includes(q) ||
      r.liniya.toLowerCase().includes(q) ||
      r.muallif.toLowerCase().includes(q) ||
      String(r.nomer).includes(q) ||
      String(r.buyurtmaNo).includes(q) ||
      r.yonalish.toLowerCase().includes(q)
    );
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalSumma  = filtered.reduce((s, r) => s + r.summa, 0);

  function toggleExpand(id: number) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const thCls = `px-3 py-2.5 text-left text-[11px] font-semibold whitespace-nowrap select-none uppercase tracking-wide`;
  const tdCls = `px-3 py-2.5 text-xs whitespace-nowrap`;

  // ── Table inner (shared between normal + fullscreen) ─────────────────────
  function tableInner(ref: React.RefObject<HTMLDivElement>) {
    return (
      <div className="overflow-x-auto" ref={ref}>
        <table style={{ minWidth: 1100, width: '100%', tableLayout: 'auto' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${bdr}`, background: D ? '#161618' : '#f9fafb' }}>
              <th className={thCls} style={{ color: sub, minWidth: 44 }}>{t.retColNum ?? '№'}</th>
              <th className={thCls} style={{ color: sub, minWidth: 140 }}>{t.retColDate ?? 'Sana'}</th>
              <th className={thCls} style={{ color: sub, minWidth: 64 }}>{t.retColNomer ?? 'Nomer'}</th>
              <th className={thCls} style={{ color: sub, minWidth: 200 }}>{t.retColClient ?? 'Kontragent'}</th>
              <th className={thCls} style={{ color: sub, minWidth: 120 }}>{t.retColAgent ?? 'Savdo agenti'}</th>
              <th className={thCls} style={{ color: sub, minWidth: 80 }}>{t.retColOrderNum ?? 'Buyurtma№'}</th>
              <th className={thCls} style={{ color: sub, minWidth: 90 }}>{t.retColOrderDate ?? 'Buy.Sana'}</th>
              <th className={thCls} style={{ color: sub, minWidth: 140 }}>{t.retColLine ?? 'Liniya'}</th>
              <th className={thCls} style={{ color: sub, minWidth: 70 }}>{t.retColDir ?? "Yo'nalish"}</th>
              <th className={thCls} style={{ color: sub, minWidth: 40 }}>{t.retColType ?? 'Tip'}</th>
              <th className={`${thCls} text-right`} style={{ color: sub, minWidth: 120 }}>{t.retColSum ?? 'Summa'}</th>
              <th className={thCls} style={{ color: sub, minWidth: 120 }}>{t.retColAuthor ?? 'Muallif'}</th>
              <th className={`${thCls} text-right`} style={{ color: sub, minWidth: 50 }}>{t.retColExId ?? 'ExID'}</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((row, idx) => {
              const globalIdx = (page - 1) * PAGE_SIZE + idx + 1;
              const rowBg = idx % 2 === 0
                ? (D ? 'transparent' : 'transparent')
                : (D ? '#ffffff06' : '#f9fafb');
              return (
                <tr key={row.id} style={{ background: rowBg, borderBottom: idx < paginated.length - 1 ? `1px solid ${bdr}` : 'none' }}>
                  <td className={`${tdCls} font-medium`} style={{ color: sub }}>{globalIdx}</td>
                  <td className={`${tdCls} font-mono text-[11px]`} style={{ color: sub }}>{row.sana}</td>
                  <td className={`${tdCls} font-mono font-semibold`} style={{ color: D ? '#818cf8' : '#6366f1' }}>{row.nomer}</td>
                  <td className={tdCls}>
                    <span className="block truncate text-xs font-medium" style={{ color: txt, maxWidth: 200 }}>{row.kontragent}</span>
                  </td>
                  <td className={tdCls}>
                    <span className="block truncate text-xs" style={{ color: sub, maxWidth: 120 }}>{row.agent}</span>
                  </td>
                  <td className={`${tdCls} font-mono text-[11px] font-semibold`} style={{ color: D ? '#fb923c' : '#ea580c' }}>{row.buyurtmaNo}</td>
                  <td className={`${tdCls} font-mono text-[11px]`} style={{ color: sub }}>{row.buyurtmaSana}</td>
                  <td className={tdCls}>
                    <span className="block truncate text-[11px]" style={{ color: sub, maxWidth: 140 }}>{row.liniya}</span>
                  </td>
                  <td className={tdCls}>
                    <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold"
                      style={{ background: '#10b98120', color: '#10b981' }}>
                      {row.yonalish}
                    </span>
                  </td>
                  <td className={tdCls}>
                    <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold"
                      style={{ background: D ? '#6366f125' : '#ededfd', color: acc }}>
                      {row.tip}
                    </span>
                  </td>
                  <td className={`${tdCls} text-right font-semibold text-[11px]`} style={{ color: txt }}>
                    {fmtMoney(row.summa)}
                  </td>
                  <td className={`${tdCls} text-[11px]`} style={{ color: sub }}>
                    <span className="block truncate" style={{ maxWidth: 120 }}>{row.muallif}</span>
                  </td>
                  <td className={`${tdCls} text-right font-mono text-[11px]`} style={{ color: D ? '#a78bfa' : '#7c3aed' }}>{row.exId}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  const iconBtn = (active = false) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 28, height: 28, borderRadius: 6,
    border: `1px solid ${bdr}`,
    background: active ? acc : (D ? '#1c1c1e' : '#fff'),
    color: active ? '#fff' : txt,
    cursor: 'pointer', transition: 'background 0.15s, color 0.15s',
  });

  // ── Pagination ───────────────────────────────────────────────────────────────
  function PaginationBar() {
    if (totalPages <= 1) return null;
    const btnBase = `min-w-[32px] h-8 px-2 rounded-xl text-xs font-medium transition-all flex items-center justify-center`;
    const delta = 2;
    const range: (number | '…')[] = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) range.push(i);
      else if (range[range.length - 1] !== '…') range.push('…');
    }
    return (
      <div className="flex items-center justify-between flex-wrap gap-2 px-4 py-3" style={{ borderTop: `1px solid ${bdr}` }}>
        <p className="text-xs" style={{ color: sub }}>
          {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} / {filtered.length}
        </p>
        <div className="flex items-center gap-1">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
            className={`${btnBase} ${page === 1 ? 'opacity-30 cursor-not-allowed' : 'hover:opacity-80'}`}
            style={{ background: bg3, color: sub }}>
            <ChevronLeft size={14} />
          </button>
          {range.map((r, i) =>
            r === '…' ? (
              <span key={`sep-${i}`} className={`${btnBase}`} style={{ color: sub }}>…</span>
            ) : (
              <button key={r} onClick={() => setPage(r as number)}
                className={`${btnBase}`}
                style={{ background: page === r ? acc : bg3, color: page === r ? '#fff' : sub }}>
                {r}
              </button>
            )
          )}
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
            className={`${btnBase} ${page === totalPages ? 'opacity-30 cursor-not-allowed' : 'hover:opacity-80'}`}
            style={{ background: bg3, color: sub }}>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .qr-fs-overlay {
          position: fixed; inset: 0; z-index: 9999;
          display: flex; flex-direction: column;
          animation: qrFsIn 0.18s ease;
        }
        @keyframes qrFsIn {
          from { opacity: 0; transform: scale(0.98); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* ══ FULLSCREEN OVERLAY ══ */}
      {isFullscreen && (
        <div className="qr-fs-overlay" style={{ background: bg }}>
          {/* top bar */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 12px', background: bg2, borderBottom: `1px solid ${bdr}`,
            height: 44, flexShrink: 0,
          }}>
            <span style={{ fontSize: 13, color: txt, fontWeight: 600 }}>
              {t.retTitle ?? 'Qaytarilgan'}&nbsp;
              <span style={{ color: sub, fontWeight: 400 }}>— {filtered.length}</span>
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => fsTableRef.current?.scrollBy({ left: -300, behavior: 'smooth' })} style={iconBtn()}>
                <ChevronLeft size={14} strokeWidth={2} />
              </button>
              <button onClick={() => fsTableRef.current?.scrollBy({ left: 300, behavior: 'smooth' })} style={iconBtn()}>
                <ChevronRight size={14} strokeWidth={2} />
              </button>
              <button onClick={() => setIsFullscreen(false)} style={{ ...iconBtn(), marginLeft: 4 }}>
                <X size={15} strokeWidth={2} />
              </button>
            </div>
          </div>
          {/* table */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: bg2 }}>
            {tableInner(fsTableRef)}
            <PaginationBar />
          </div>
        </div>
      )}

      {/* ══ NORMAL VIEW ══ */}
      <div style={{ background: bg, minHeight: '100%' }}>
        <div className="p-3 sm:p-4 space-y-3">

          {/* ── Header ── */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-lg sm:text-xl font-bold" style={{ color: txt }}>
                {t.retTitle ?? 'Qaytarilgan mahsulotlar'}
              </h2>
              <p className="text-xs mt-0.5" style={{ color: sub }}>
                {filtered.length} {t.retFound ?? 'ta yozuv'}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white transition-all hover:opacity-90"
                style={{ background: acc, boxShadow: `0 4px 14px ${acc}50` }}>
                <Plus size={13} />
                <span className="hidden sm:inline">{t.retCreate ?? 'Yaratish'}</span>
              </button>
              <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all"
                style={{ background: bg2, border: `1px solid ${bdr}`, color: sub }}>
                <Download size={13} />
                <span className="hidden sm:inline">{t.retExport ?? 'Eksport'}</span>
              </button>
              {/* Search */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: bg2, border: `1px solid ${bdr}` }}>
                <Search size={13} style={{ color: sub }} />
                <input
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  placeholder={t.retSearch ?? 'Qidirish...'}
                  className="bg-transparent outline-none text-xs w-32 sm:w-44"
                  style={{ color: txt }}
                />
                {search && (
                  <button onClick={() => setSearch('')} style={{ color: sub }}>
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── Summary cards ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
            {[
              { label: t.retTotal ?? 'Jami', value: `${filtered.length}`, unit: t.retFound ?? 'ta', color: acc },
              { label: t.retColSum ?? 'Summa', value: fmtMoney(totalSumma), unit: "so'm", color: '#10b981' },
            ].map(c => (
              <div key={c.label} className="rounded-2xl p-3 sm:p-4" style={{ background: bg2, border: `1px solid ${bdr}` }}>
                <p className="text-[11px] mb-1" style={{ color: sub }}>{c.label}</p>
                <p className="text-sm sm:text-base font-bold truncate" style={{ color: txt }}>{c.value}</p>
                <p className="text-[10px] mt-0.5" style={{ color: c.color }}>{c.unit}</p>
              </div>
            ))}
          </div>

          {/* ── Table / Cards ── */}
          {filtered.length > 0 ? (
            <>
              {/* ── Desktop table (md+) ── */}
              <div className="hidden md:block rounded-2xl overflow-hidden" style={{ background: bg2, border: `1px solid ${bdr}` }}>
                {/* Nav + fullscreen */}
                <div style={{
                  display: 'flex', justifyContent: 'flex-end', gap: 4,
                  padding: '8px 10px', borderBottom: `1px solid ${bdr}`,
                }}>
                  <button onClick={() => tableRef.current?.scrollBy({ left: -300, behavior: 'smooth' })} style={iconBtn()}>
                    <ChevronLeft size={14} strokeWidth={2} />
                  </button>
                  <button onClick={() => tableRef.current?.scrollBy({ left: 300, behavior: 'smooth' })} style={iconBtn()}>
                    <ChevronRight size={14} strokeWidth={2} />
                  </button>
                  <button
                    onClick={() => setIsFullscreen(true)}
                    title="To'liq ekran"
                    style={{ ...iconBtn(), marginLeft: 2 }}
                    onMouseEnter={e => { e.currentTarget.style.background = D ? '#222226' : '#f5f5f7'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = D ? '#1c1c1e' : '#fff'; }}
                  >
                    <Maximize2 size={14} strokeWidth={2} />
                  </button>
                </div>
                {tableInner(tableRef)}
                <PaginationBar />
              </div>

              {/* ── Mobile/tablet cards (< md) ── */}
              <div className="md:hidden space-y-2">
                {paginated.map((row, idx) => {
                  const globalIdx = (page - 1) * PAGE_SIZE + idx + 1;
                  const isOpen = expanded.has(row.id);
                  return (
                    <div key={row.id} className="rounded-2xl overflow-hidden" style={{ background: bg2, border: `1px solid ${bdr}` }}>
                      {/* Card header — always visible */}
                      <button
                        className="w-full text-left p-3 flex items-start gap-3"
                        onClick={() => toggleExpand(row.id)}
                      >
                        <div className="flex-shrink-0 w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold text-white mt-0.5"
                          style={{ background: acc, minWidth: 28 }}>
                          {globalIdx}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate" style={{ color: txt }}>{row.kontragent}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="font-mono text-[10px]" style={{ color: D ? '#818cf8' : '#6366f1' }}>№{row.nomer}</span>
                            <span className="text-[10px]" style={{ color: sub }}>{row.sana.split(' ')[0]}</span>
                            <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold"
                              style={{ background: '#10b98120', color: '#10b981' }}>
                              {row.yonalish}
                            </span>
                            <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold"
                              style={{ background: D ? '#6366f125' : '#ededfd', color: acc }}>
                              {row.tip}
                            </span>
                          </div>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-xs font-bold" style={{ color: txt }}>{(row.summa / 1000).toFixed(0)}K</p>
                          <p className="text-[10px]" style={{ color: sub }}>{row.vazn.toFixed(1)} kg</p>
                          {isOpen ? <ChevronUp size={12} style={{ color: sub, marginLeft: 'auto' }} /> : <ChevronDown size={12} style={{ color: sub, marginLeft: 'auto' }} />}
                        </div>
                      </button>

                      {/* Expanded details */}
                      {isOpen && (
                        <div className="px-3 pb-3 space-y-2" style={{ borderTop: `1px solid ${bdr}` }}>
                          {[
                            [t.retColAgent ?? 'Savdo agenti', row.agent],
                            [t.retColOrderNum ?? 'Buyurtma№', String(row.buyurtmaNo)],
                            [t.retColOrderDate ?? 'Buy.Sana', row.buyurtmaSana],
                            [t.retColLine ?? 'Liniya', row.liniya],
                            [t.retColSum ?? 'Summa', `${fmtMoney(row.summa)} so'm`],
                            [t.retColAuthor ?? 'Muallif', row.muallif],
                            ['ExID', String(row.exId)],
                          ].map(([label, val]) => (
                            <div key={label} className="flex items-start justify-between gap-2 pt-2" style={{ borderTop: `1px solid ${bdr}` }}>
                              <span className="text-[11px] flex-shrink-0" style={{ color: sub }}>{label}</span>
                              <span className="text-[11px] font-medium text-right break-all" style={{ color: txt }}>{val}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Mobile pagination */}
                {totalPages > 1 && (
                  <div className="rounded-2xl overflow-hidden" style={{ background: bg2, border: `1px solid ${bdr}` }}>
                    <PaginationBar />
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 gap-3 rounded-2xl"
              style={{ background: bg2, border: `1px solid ${bdr}` }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: `${acc}18` }}>
                <RotateCcw size={24} style={{ color: acc }} />
              </div>
              <p className="text-sm" style={{ color: sub }}>{t.retNoData ?? 'Qaytarish yozuvlari topilmadi'}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Create modal ── */}
      {showCreateModal && (
        <AdminVozvratSozdatModal
          D={D}
          t={t}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </>
  );
}