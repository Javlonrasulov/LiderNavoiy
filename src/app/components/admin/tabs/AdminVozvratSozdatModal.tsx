import { useState, useRef, useEffect } from 'react';
import {
  X, ChevronLeft, ChevronRight, Maximize2, Minimize2,
  Search, Save, Check, Plus, RefreshCw, Trash2, ListChecks, Calendar,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface OrderLine {
  id: number;
  gruppa: string;
  tovar: string;
  aktsiya: string;
  shtUp: number;
  ves1ed: number;
  kolOtgr: number;
  ostPoZayavke: number;
  kolvoBlok: number;
  prajs: number;
  tsena: number;
  summaOtgr: number;
  skid: number;
  kolVozvDefault: number;
  vesDefault: number;
}

interface ProductRow extends OrderLine {
  kolVozvEdit: number;
}

// ── Mock clients ──────────────────────────────────────────────────────────────
const MOCK_CLIENTS = [
  { name: 'NAVOIY MEXROJBEK OMADI MCHJ',       agent: 'Норова Нозима',      liniya: '10 - 10-никр'      },
  { name: 'BEST WAY GROUP MCHJ',                agent: 'Тухтаниёзов У.',     liniya: '02 - Нурато'       },
  { name: 'CHP SALIMOVA HATICHA MUXTOROVNA',    agent: 'Тухтаниёзов У.',     liniya: '04 - Казилтепа'    },
  { name: 'GOLD 777',                           agent: 'Норова Нозима',      liniya: '15 - 17-18 Микр.'  },
  { name: 'BARKAMOL BIZNES-KLASS',              agent: 'Норова Нозима',      liniya: '17 - 7-никр'       },
  { name: 'DILSHOD SAVDO MARKAZI',              agent: 'Зарипов Бегзод',     liniya: '15 - Микр.'        },
  { name: 'PREMIUM SAVDO MCHJ',                 agent: 'Тухтаниёзов У.',     liniya: '02 - Xatirchi'     },
  { name: 'KOLMURODOVA SABRINA',                agent: 'Самандарова',        liniya: '02 - Tourabort.'   },
  { name: 'SAMIR MARKET',                       agent: 'Норова Нозима',      liniya: '17 - 7-никр'       },
  { name: 'ШАРИПОВ ФАРРУХ',                     agent: 'Тошниёзов Ш.',       liniya: '25 - Sklad'        },
  { name: 'TRADING BOXODIR KARMANA',            agent: 'Эргашева Пала',      liniya: '02 - Янги Йул'     },
  { name: 'INTELLECT BEST SAVDO YTT',           agent: 'Тухтаниёзов У.',     liniya: '02 - Xatirchi'     },
  { name: 'ADIZOVA KOLNOZ ISMATOVNA YaTT',      agent: 'Тошниёзов Ш.',       liniya: '10 - Жалол'        },
];

// ── Available dates per client ────────────────────────────────────────────────
const CLIENT_DATES: Record<string, string[]> = {
  'NAVOIY MEXROJBEK OMADI MCHJ':      ['07.03.2026', '03.03.2026', '10.03.2026', '05.03.2026'],
  'BEST WAY GROUP MCHJ':              ['02.03.2026', '04.03.2026', '11.03.2026'],
  'CHP SALIMOVA HATICHA MUXTOROVNA':  ['04.03.2026', '11.03.2026', '13.03.2026'],
  'GOLD 777':                         ['06.03.2026', '03.03.2026', '09.03.2026'],
  'BARKAMOL BIZNES-KLASS':            ['14.03.2026', '10.03.2026'],
  'DILSHOD SAVDO MARKAZI':            ['14.03.2026', '08.03.2026'],
  'PREMIUM SAVDO MCHJ':               ['15.03.2026', '10.03.2026'],
  'KOLMURODOVA SABRINA':              ['02.03.2026', '08.03.2026'],
  'SAMIR MARKET':                     ['05.03.2026', '12.03.2026'],
  'ШАРИПОВ ФАРРУХ':                   ['11.03.2026', '06.03.2026'],
  'TRADING BOXODIR KARMANA':          ['03.03.2026', '09.03.2026'],
  'INTELLECT BEST SAVDO YTT':         ['07.03.2026', '04.03.2026'],
  'ADIZOVA KOLNOZ ISMATOVNA YaTT':    ['11.03.2026', '05.03.2026'],
};

// ── Mock order lines per client|date ─────────────────────────────────────────
const MOCK_ORDERS: Record<string, OrderLine[]> = {
  'NAVOIY MEXROJBEK OMADI MCHJ|07.03.2026': [
    { id:1, gruppa:'Тим (Склад)', tovar:'Для завтрака НУР 0.9кг',    aktsiya:'', shtUp:1, ves1ed:0.900, kolOtgr:1.870, ostPoZayavke:0, kolvoBlok:1, prajs:38800, tsena:35696.00, summaOtgr:66751.52,  skid:8.000,  kolVozvDefault:1.870, vesDefault:1.870 },
    { id:2, gruppa:'Тим (Склад)', tovar:'Сосиски Радуга 0.42кг',     aktsiya:'', shtUp:1, ves1ed:0.420, kolOtgr:6.000, ostPoZayavke:0, kolvoBlok:1, prajs:18300, tsena:14640.00, summaOtgr:87840.00,  skid:20.000, kolVozvDefault:6.000, vesDefault:2.520 },
    { id:3, gruppa:'Тим (Склад)', tovar:'Для Завтрака Ну 0.5кг',     aktsiya:'', shtUp:1, ves1ed:0.500, kolOtgr:1.970, ostPoZayavke:0, kolvoBlok:1, prajs:38900, tsena:35788.00, summaOtgr:70502.36,  skid:8.000,  kolVozvDefault:1.970, vesDefault:1.970 },
    { id:4, gruppa:'Тим (Склад)', tovar:'Докторская накл 0.9кг',      aktsiya:'', shtUp:1, ves1ed:0.900, kolOtgr:1.750, ostPoZayavke:0, kolvoBlok:1, prajs:41500, tsena:38180.00, summaOtgr:66815.00,  skid:8.000,  kolVozvDefault:1.750, vesDefault:1.750 },
    { id:5, gruppa:'Тим (Склад)', tovar:'Докторская Накл 0.5кг',      aktsiya:'', shtUp:1, ves1ed:0.500, kolOtgr:2.040, ostPoZayavke:0, kolvoBlok:1, prajs:41700, tsena:38364.00, summaOtgr:78262.56,  skid:8.000,  kolVozvDefault:2.040, vesDefault:2.040 },
    { id:6, gruppa:'Тим (Склад)', tovar:'Купаты Узбекские 0.6кг',    aktsiya:'', shtUp:1, ves1ed:0.600, kolOtgr:2.200, ostPoZayavke:0, kolvoBlok:1, prajs:32500, tsena:29900.00, summaOtgr:65780.00,  skid:8.000,  kolVozvDefault:2.200, vesDefault:1.320 },
  ],
  'NAVOIY MEXROJBEK OMADI MCHJ|03.03.2026': [
    { id:1, gruppa:'Тим (Склад)', tovar:'Сосиски Молочные 0.5кг',    aktsiya:'', shtUp:1, ves1ed:0.500, kolOtgr:4.000, ostPoZayavke:0, kolvoBlok:1, prajs:22000, tsena:20240.00, summaOtgr:80960.00,  skid:8.000,  kolVozvDefault:4.000, vesDefault:2.000 },
    { id:2, gruppa:'Тим (Склад)', tovar:'Ветчина Нежная 0.8кг',      aktsiya:'', shtUp:1, ves1ed:0.800, kolOtgr:3.500, ostPoZayavke:0, kolvoBlok:1, prajs:45000, tsena:41400.00, summaOtgr:144900.00, skid:8.000,  kolVozvDefault:3.500, vesDefault:2.800 },
    { id:3, gruppa:'Тим (Склад)', tovar:'Колбаса Молочная 0.8кг',    aktsiya:'', shtUp:1, ves1ed:0.800, kolOtgr:2.800, ostPoZayavke:0, kolvoBlok:1, prajs:35000, tsena:32200.00, summaOtgr:90160.00,  skid:8.000,  kolVozvDefault:2.800, vesDefault:2.240 },
  ],
  'NAVOIY MEXROJBEK OMADI MCHJ|10.03.2026': [
    { id:1, gruppa:'Тим (Склад)', tovar:'Паштет Куриный 0.18кг',     aktsiya:'', shtUp:1, ves1ed:0.180, kolOtgr:8.000, ostPoZayavke:0, kolvoBlok:1, prajs:12500, tsena:11500.00, summaOtgr:92000.00,  skid:8.000,  kolVozvDefault:8.000, vesDefault:1.440 },
    { id:2, gruppa:'Тим (Склад)', tovar:'Сервелат Премиум 0.45кг',   aktsiya:'', shtUp:1, ves1ed:0.450, kolOtgr:4.000, ostPoZayavke:0, kolvoBlok:1, prajs:52000, tsena:47840.00, summaOtgr:191360.00, skid:8.000,  kolVozvDefault:4.000, vesDefault:1.800 },
    { id:3, gruppa:'Тим (Склад)', tovar:'Для завтрака НУР 0.9кг',    aktsiya:'', shtUp:1, ves1ed:0.900, kolOtgr:2.100, ostPoZayavke:0, kolvoBlok:1, prajs:38800, tsena:35696.00, summaOtgr:74961.60,  skid:8.000,  kolVozvDefault:2.100, vesDefault:1.890 },
    { id:4, gruppa:'Тим (Склад)', tovar:'Докторская накл 0.9кг',      aktsiya:'', shtUp:1, ves1ed:0.900, kolOtgr:1.500, ostPoZayavke:0, kolvoBlok:1, prajs:41500, tsena:38180.00, summaOtgr:57270.00,  skid:8.000,  kolVozvDefault:1.500, vesDefault:1.350 },
  ],
  'BEST WAY GROUP MCHJ|02.03.2026': [
    { id:1, gruppa:'Тим (Склад)', tovar:'Колбаса Молочная 0.8кг',    aktsiya:'', shtUp:1, ves1ed:0.800, kolOtgr:3.200, ostPoZayavke:0, kolvoBlok:1, prajs:35000, tsena:32200.00, summaOtgr:103040.00, skid:8.000,  kolVozvDefault:3.200, vesDefault:2.560 },
    { id:2, gruppa:'Тим (Склад)', tovar:'Сосиски Детские 0.3кг',     aktsiya:'', shtUp:1, ves1ed:0.300, kolOtgr:4.500, ostPoZayavke:0, kolvoBlok:1, prajs:22000, tsena:20240.00, summaOtgr:91080.00,  skid:8.000,  kolVozvDefault:4.500, vesDefault:1.350 },
    { id:3, gruppa:'Тим (Склад)', tovar:'Паштет Куриный 0.18кг',     aktsiya:'', shtUp:1, ves1ed:0.180, kolOtgr:10.000,ostPoZayavke:0, kolvoBlok:1, prajs:12500, tsena:11500.00, summaOtgr:115000.00, skid:8.000,  kolVozvDefault:10.000,vesDefault:1.800 },
    { id:4, gruppa:'Тим (Склад)', tovar:'Для завтрака НУР 0.9кг',    aktsiya:'', shtUp:1, ves1ed:0.900, kolOtgr:2.100, ostPoZayavke:0, kolvoBlok:1, prajs:38800, tsena:35696.00, summaOtgr:74961.60,  skid:8.000,  kolVozvDefault:2.100, vesDefault:1.890 },
  ],
  'CHP SALIMOVA HATICHA MUXTOROVNA|04.03.2026': [
    { id:1, gruppa:'Тим (Склад)', tovar:'Сосиски Молочные 0.5кг',    aktsiya:'', shtUp:1, ves1ed:0.500, kolOtgr:8.000, ostPoZayavke:0, kolvoBlok:1, prajs:22000, tsena:20240.00, summaOtgr:161920.00, skid:8.000,  kolVozvDefault:8.000, vesDefault:4.000 },
    { id:2, gruppa:'Тим (Склад)', tovar:'Докторская накл 0.9кг',      aktsiya:'', shtUp:1, ves1ed:0.900, kolOtgr:5.500, ostPoZayavke:0, kolvoBlok:1, prajs:41500, tsena:38180.00, summaOtgr:209990.00, skid:8.000,  kolVozvDefault:5.500, vesDefault:4.950 },
    { id:3, gruppa:'Тим (Склад)', tovar:'Ветчина Нежная 0.8кг',      aktsiya:'', shtUp:1, ves1ed:0.800, kolOtgr:4.200, ostPoZayavke:0, kolvoBlok:1, prajs:45000, tsena:41400.00, summaOtgr:173880.00, skid:8.000,  kolVozvDefault:4.200, vesDefault:3.360 },
    { id:4, gruppa:'Тим (Склад)', tovar:'Купаты Узбекские 0.6кг',    aktsiya:'', shtUp:1, ves1ed:0.600, kolOtgr:6.000, ostPoZayavke:0, kolvoBlok:1, prajs:32500, tsena:29900.00, summaOtgr:179400.00, skid:8.000,  kolVozvDefault:6.000, vesDefault:3.600 },
    { id:5, gruppa:'Тим (Склад)', tovar:'Колбаса Молочная 0.8кг',    aktsiya:'', shtUp:1, ves1ed:0.800, kolOtgr:3.800, ostPoZayavke:0, kolvoBlok:1, prajs:35000, tsena:32200.00, summaOtgr:122360.00, skid:8.000,  kolVozvDefault:3.800, vesDefault:3.040 },
  ],
  'GOLD 777|06.03.2026': [
    { id:1, gruppa:'Тим (Склад)', tovar:'Для завтрака НУР 0.9кг',    aktsiya:'', shtUp:1, ves1ed:0.900, kolOtgr:2.500, ostPoZayavke:0, kolvoBlok:1, prajs:38800, tsena:35696.00, summaOtgr:89240.00,  skid:8.000,  kolVozvDefault:2.500, vesDefault:2.250 },
    { id:2, gruppa:'Тим (Склад)', tovar:'Сервелат Премиум 0.45кг',   aktsiya:'', shtUp:1, ves1ed:0.450, kolOtgr:3.000, ostPoZayavke:0, kolvoBlok:1, prajs:52000, tsena:47840.00, summaOtgr:143520.00, skid:8.000,  kolVozvDefault:3.000, vesDefault:1.350 },
    { id:3, gruppa:'Тим (Склад)', tovar:'Колбаса Охотничья 0.3кг',   aktsiya:'', shtUp:1, ves1ed:0.300, kolOtgr:5.000, ostPoZayavke:0, kolvoBlok:1, prajs:28000, tsena:25760.00, summaOtgr:128800.00, skid:8.000,  kolVozvDefault:5.000, vesDefault:1.500 },
  ],
  'BARKAMOL BIZNES-KLASS|14.03.2026': [
    { id:1, gruppa:'Тим (Склад)', tovar:'Сосиски Радуга 0.42кг',     aktsiya:'', shtUp:1, ves1ed:0.420, kolOtgr:5.000, ostPoZayavke:0, kolvoBlok:1, prajs:18300, tsena:14640.00, summaOtgr:73200.00,  skid:20.000, kolVozvDefault:5.000, vesDefault:2.100 },
    { id:2, gruppa:'Тим (Склад)', tovar:'Для завтрака НУР 0.9кг',    aktsiya:'', shtUp:1, ves1ed:0.900, kolOtgr:1.200, ostPoZayavke:0, kolvoBlok:1, prajs:38800, tsena:35696.00, summaOtgr:42835.20,  skid:8.000,  kolVozvDefault:1.200, vesDefault:1.080 },
    { id:3, gruppa:'Тим (Склад)', tovar:'Ветчина Нежная 0.8кг',      aktsiya:'', shtUp:1, ves1ed:0.800, kolOtgr:2.500, ostPoZayavke:0, kolvoBlok:1, prajs:45000, tsena:41400.00, summaOtgr:103500.00, skid:8.000,  kolVozvDefault:2.500, vesDefault:2.000 },
  ],
  'PREMIUM SAVDO MCHJ|15.03.2026': [
    { id:1, gruppa:'Тим (Склад)', tovar:'Для завтрака НУР 0.9кг',    aktsiya:'', shtUp:1, ves1ed:0.900, kolOtgr:5.500, ostPoZayavke:0, kolvoBlok:1, prajs:38800, tsena:35696.00, summaOtgr:196328.00, skid:8.000,  kolVozvDefault:5.500, vesDefault:4.950 },
    { id:2, gruppa:'Тим (Склад)', tovar:'Докторская накл 0.9кг',      aktsiya:'', shtUp:1, ves1ed:0.900, kolOtgr:8.000, ostPoZayavke:0, kolvoBlok:1, prajs:41500, tsena:38180.00, summaOtgr:305440.00, skid:8.000,  kolVozvDefault:8.000, vesDefault:7.200 },
    { id:3, gruppa:'Тим (Склад)', tovar:'Сервелат Премиум 0.45кг',   aktsiya:'', shtUp:1, ves1ed:0.450, kolOtgr:6.000, ostPoZayavke:0, kolvoBlok:1, prajs:52000, tsena:47840.00, summaOtgr:287040.00, skid:8.000,  kolVozvDefault:6.000, vesDefault:2.700 },
    { id:4, gruppa:'Тим (Склад)', tovar:'Ветчина Нежная 0.8кг',      aktsiya:'', shtUp:1, ves1ed:0.800, kolOtgr:4.500, ostPoZayavke:0, kolvoBlok:1, prajs:45000, tsena:41400.00, summaOtgr:186300.00, skid:8.000,  kolVozvDefault:4.500, vesDefault:3.600 },
    { id:5, gruppa:'Тим (Склад)', tovar:'Паштет Куриный 0.18кг',     aktsiya:'', shtUp:1, ves1ed:0.180, kolOtgr:12.000,ostPoZayavke:0, kolvoBlok:1, prajs:12500, tsena:11500.00, summaOtgr:138000.00, skid:8.000,  kolVozvDefault:12.000,vesDefault:2.160 },
  ],
  'DILSHOD SAVDO MARKAZI|14.03.2026': [
    { id:1, gruppa:'Тим (Склад)', tovar:'Колбаса Молочная 0.8кг',    aktsiya:'', shtUp:1, ves1ed:0.800, kolOtgr:2.400, ostPoZayavke:0, kolvoBlok:1, prajs:35000, tsena:32200.00, summaOtgr:77280.00,  skid:8.000,  kolVozvDefault:2.400, vesDefault:1.920 },
    { id:2, gruppa:'Тим (Склад)', tovar:'Сосиски Молочные 0.5кг',    aktsiya:'', shtUp:1, ves1ed:0.500, kolOtgr:3.500, ostPoZayavke:0, kolvoBlok:1, prajs:22000, tsena:20240.00, summaOtgr:70840.00,  skid:8.000,  kolVozvDefault:3.500, vesDefault:1.750 },
  ],
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtMoney(n: number) {
  return n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtNum(n: number) {
  return n.toLocaleString('ru-RU', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

// ── CalendarPickerWidget ───────────────────────────────────────────────────────
interface CalPickerProps {
  value: string;
  onChange: (v: string) => void;
  availableDates: string[];
  disabled?: boolean;
  D: boolean;
  bg2: string; bdr: string; txt: string; acc: string; sub: string;
  inputSt: React.CSSProperties;
}
const CAL_MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь',
                    'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const CAL_DAYS   = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

function CalendarPickerWidget({
  value, onChange, availableDates, disabled,
  D, bg2, bdr, txt, acc, sub, inputSt,
}: CalPickerProps) {
  const [open,      setOpen]      = useState(false);
  const [viewYear,  setViewYear]  = useState(2026);
  const [viewMonth, setViewMonth] = useState(2);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Navigate to month of first available date when client changes
  useEffect(() => {
    if (availableDates.length > 0) {
      const p = availableDates[0].split('.');
      setViewMonth(parseInt(p[1], 10) - 1);
      setViewYear(parseInt(p[2], 10));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableDates.join(',')]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const availableSet = new Set(availableDates);
  const firstDay     = new Date(viewYear, viewMonth, 1);
  const daysInMonth  = new Date(viewYear, viewMonth + 1, 0).getDate();
  let startDow = firstDay.getDay();
  startDow = startDow === 0 ? 6 : startDow - 1; // Mon=0

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const fmtDay = (day: number) =>
    `${String(day).padStart(2,'0')}.${String(viewMonth+1).padStart(2,'0')}.${viewYear}`;

  const prevM = () => viewMonth === 0
    ? (setViewYear(y => y-1), setViewMonth(11))
    : setViewMonth(m => m-1);
  const nextM = () => viewMonth === 11
    ? (setViewYear(y => y+1), setViewMonth(0))
    : setViewMonth(m => m+1);

  const iBtnSt: React.CSSProperties = {
    display:'flex', alignItems:'center', justifyContent:'center',
    width:26, height:26, borderRadius:6,
    border:`1px solid ${bdr}`,
    background: D ? '#1c1c1e' : '#f9fafb',
    color: txt, cursor:'pointer', flexShrink:0,
  };

  return (
    <div ref={wrapRef} style={{ position:'relative' }}>
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        style={{
          ...inputSt, width:'100%', textAlign:'left',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.45 : 1,
          display:'flex', alignItems:'center', gap:6,
        }}
      >
        <Calendar size={12} style={{ color: sub, flexShrink:0 }} />
        <span style={{ flex:1, color: value ? acc : sub, fontWeight: value ? 600 : 400, fontSize:12 }}>
          {value || '— Tanlang —'}
        </span>
        <ChevronRight size={10} style={{ transform:'rotate(90deg)', color:sub, flexShrink:0 }} />
      </button>

      {/* Calendar dropdown */}
      {open && (
        <div style={{
          position:'absolute', top:'calc(100% + 5px)', left:0, zIndex:9999,
          background:bg2, border:`1px solid ${bdr}`, borderRadius:14,
          boxShadow: D ? '0 20px 56px #000000b0' : '0 20px 56px #00000030',
          width:252, padding:'12px 10px 10px',
        }}>
          {/* Month nav */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <button type="button" onClick={prevM} style={iBtnSt}><ChevronLeft size={13}/></button>
            <span style={{ fontSize:12, fontWeight:700, color:txt }}>
              {CAL_MONTHS[viewMonth]} {viewYear}
            </span>
            <button type="button" onClick={nextM} style={iBtnSt}><ChevronRight size={13}/></button>
          </div>

          {/* Day-of-week headers */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:1, marginBottom:4 }}>
            {CAL_DAYS.map((d,i) => (
              <div key={d} style={{
                textAlign:'center', fontSize:9, fontWeight:700,
                color: i >= 5 ? `${acc}90` : sub,
                padding:'2px 0',
              }}>{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2 }}>
            {cells.map((day, i) => {
              if (day === null) return <div key={`e${i}`} />;
              const dateStr   = fmtDay(day);
              const isAvail   = availableSet.has(dateStr);
              const isSel     = value === dateStr;
              const dow       = (startDow + day - 1) % 7;
              const isWeekend = dow >= 5;
              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => { if (isAvail) { onChange(dateStr); setOpen(false); }}}
                  style={{
                    position:'relative', width:'100%', height:32, borderRadius:8,
                    fontSize:11, fontWeight: isAvail ? 700 : 400,
                    cursor: isAvail ? 'pointer' : 'default',
                    background: isSel ? acc : isAvail ? `${acc}1a` : 'transparent',
                    color: isSel ? '#fff' : isAvail ? acc : isWeekend ? `${sub}60` : `${sub}55`,
                    border: isSel
                      ? `1.5px solid ${acc}`
                      : isAvail
                        ? `1px solid ${acc}55`
                        : '1px solid transparent',
                    transition:'background 0.1s',
                  }}
                >
                  {day}
                  {isAvail && !isSel && (
                    <span style={{
                      position:'absolute', bottom:3, left:'50%',
                      transform:'translateX(-50%)',
                      width:4, height:4, borderRadius:'50%',
                      background: acc, display:'block',
                    }}/>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{
            display:'flex', alignItems:'center', gap:6,
            marginTop:10, paddingTop:8, borderTop:`1px solid ${bdr}`,
          }}>
            <span style={{
              width:12, height:12, borderRadius:4, flexShrink:0,
              background:`${acc}1a`, border:`1px solid ${acc}55`, display:'inline-block',
            }}/>
            <span style={{ fontSize:9, color:sub }}>
              Yetkazilgan kunlar — {availableDates.length} ta
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── NumberInput — string-based so integers type freely ───────────────────────
interface NInputProps {
  value: number;
  max: number;
  onCommit: (v: number) => void;
  style?: React.CSSProperties;
}
function NumberInput({ value, max, onCommit, style }: NInputProps) {
  const [raw, setRaw] = useState(() => value === 0 ? '0' : String(value));

  useEffect(() => {
    const parsed = parseFloat(raw.replace(',', '.')) || 0;
    if (Math.abs(parsed - value) > 0.00001) {
      setRaw(value === 0 ? '0' : String(value));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <input
      type="text"
      inputMode="decimal"
      value={raw}
      onChange={e => {
        const v = e.target.value.replace(',', '.');
        if (v === '' || /^\d*\.?\d*$/.test(v)) {
          setRaw(v);
          const num = parseFloat(v);
          if (!isNaN(num)) onCommit(Math.max(0, Math.min(max, num)));
        }
      }}
      onBlur={() => {
        const num = parseFloat(raw.replace(',', '.')) || 0;
        const clamped = Math.max(0, Math.min(max, num));
        setRaw(String(clamped));
        onCommit(clamped);
      }}
      style={style}
    />
  );
}

// ── FieldWrapper ──────────────────────────────────────────────────────────────
function FieldWrap({ label, sub, children }: { label: string; sub: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontSize: 10, color: sub, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>
        {label}
      </p>
      {children}
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  D: boolean;
  t: Record<string, string>;
  onClose: () => void;
}

export function AdminVozvratSozdatModal({ D, t, onClose }: Props) {
  // ── Colours ──────────────────────────────────────────────────────────────────
  const bg    = D ? '#0d0d0d'  : '#f4f5f7';
  const bg2   = D ? '#1c1c1e'  : '#ffffff';
  const bg3   = D ? '#252830'  : '#f1f3f8';
  const bdr   = D ? '#2a2a2e'  : '#e5e7eb';
  const txt   = D ? '#f2f2f7'  : '#111827';
  const sub   = D ? '#6b7280'  : '#9ca3af';
  const acc   = '#6366f1';
  const blu   = '#0ea5e9';
  const red   = '#ef4444';

  // ── Form state ────────────────────────────────────────────────────────────────
  const [kontragent,      setKontragent]      = useState('');
  const [kontragentInput, setKontragentInput] = useState('');
  const [showDrop,        setShowDrop]        = useState(false);
  const [dataOtgr,        setDataOtgr]        = useState('');
  const [liniya,          setLiniya]          = useState('');
  const [torgoviyAgent,   setTorgoviyAgent]   = useState('');
  const [transport,       setTransport]       = useState('DAMAS (VAN) 85 921 BBA');
  const [shofer,          setShofer]          = useState('Рустамов Шохрух');
  const [prichina,        setPrichina]        = useState('');
  const [primechaniye,    setPrimechaniye]    = useState('');

  // ── Products state ────────────────────────────────────────────────────────────
  const [products, setProducts] = useState<ProductRow[]>([]);

  // ── Fullscreen states ─────────────────────────────────────────────────────────
  const [tblFs,   setTblFs]   = useState(false);   // table-only fullscreen
  const [modalFs, setModalFs] = useState(false);   // whole modal fullscreen
  const tableRef   = useRef<HTMLDivElement>(null);
  const fsTableRef = useRef<HTMLDivElement>(null);

  // ── Load products on client + date change ─────────────────────────────────────
  useEffect(() => {
    if (kontragent && dataOtgr) {
      const key = `${kontragent}|${dataOtgr}`;
      const data = MOCK_ORDERS[key];
      setProducts(data ? data.map(p => ({ ...p, kolVozvEdit: 0 })) : []);
    } else {
      setProducts([]);
    }
  }, [kontragent, dataOtgr]);

  useEffect(() => {
    if (kontragent) {
      const c = MOCK_CLIENTS.find(cl => cl.name === kontragent);
      if (c) { setTorgoviyAgent(c.agent); setLiniya(c.liniya); }
      setDataOtgr('');
    }
  }, [kontragent]);

  const filteredClients = MOCK_CLIENTS.filter(c =>
    c.name.toLowerCase().includes(kontragentInput.toLowerCase())
  );
  const availableDates = kontragent ? (CLIENT_DATES[kontragent] || []) : [];

  // ── Totals ────────────────────────────────────────────────────────────────────
  const totalSummaOtgr = products.reduce((s, p) => s + p.summaOtgr, 0);
  const totalVozvrat   = products.reduce((s, p) => s + p.kolVozvEdit * p.tsena, 0);
  const totalVes       = products.reduce((s, p) => s + p.kolVozvEdit * p.ves1ed, 0);
  const totalKolOtgr   = products.reduce((s, p) => s + p.kolOtgr, 0);
  const totalKolVozv   = products.reduce((s, p) => s + p.kolVozvEdit, 0);

  function updateKolVozv(id: number, val: number) {
    setProducts(prev => prev.map(p =>
      p.id === id ? { ...p, kolVozvEdit: Math.max(0, Math.min(p.kolOtgr, val)) } : p
    ));
  }
  function setFullVozvrat()  { setProducts(prev => prev.map(p => ({ ...p, kolVozvEdit: p.kolOtgr }))); }
  function setZeroVozvrat()  { setProducts(prev => prev.map(p => ({ ...p, kolVozvEdit: 0 }))); }

  // ── Shared styles ──────────────────────────────────────────────────────────────
  const inputSt: React.CSSProperties = {
    background: D ? '#252830' : '#f9fafb',
    border: `1px solid ${bdr}`,
    color: txt,
    borderRadius: 8,
    padding: '5px 9px',
    fontSize: 12,
    outline: 'none',
    width: '100%',
    transition: 'border-color 0.15s',
  };
  const iconBtn = (): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 28, height: 28, borderRadius: 6,
    border: `1px solid ${bdr}`,
    background: D ? '#1c1c1e' : '#fff',
    color: txt, cursor: 'pointer', transition: 'background 0.15s', flexShrink: 0,
  });

  // ── Table render ──────────────────────────────────────────────────────────────
  const thCls = `px-2.5 py-1 text-left text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap select-none`;
  const tdCls = `px-2.5 py-1 text-[11px] whitespace-nowrap`;

  function TableContent({ scrollRef }: { scrollRef: React.RefObject<HTMLDivElement> }) {
    return (
      <div className="overflow-x-auto" ref={scrollRef}>
        <table style={{ minWidth: 1260, width: '100%', tableLayout: 'auto' }}>
          <thead>
            <tr style={{ background: D ? '#161618' : '#f9fafb', borderBottom: `1px solid ${bdr}` }}>
              <th className={thCls} style={{ color: sub, minWidth: 36 }}>№</th>
              <th className={thCls} style={{ color: sub, minWidth: 100 }}>{t.vGruppa ?? 'Группа'}</th>
              <th className={thCls} style={{ color: sub, minWidth: 210 }}>{t.vTovar ?? 'Товар'}</th>
              <th className={thCls} style={{ color: sub, minWidth: 60  }}>Акция</th>
              <th className={thCls} style={{ color: sub, minWidth: 48  }}>ШтУп</th>
              <th className={thCls} style={{ color: sub, minWidth: 62  }}>Вес 1ед</th>
              <th className={thCls} style={{ color: sub, minWidth: 72  }}>Кол.отгр</th>
              <th className={thCls} style={{ color: sub, minWidth: 80  }}>Ост.заявке</th>
              <th className={thCls} style={{ color: sub, minWidth: 68  }}>Кол(блок)</th>
              <th className={thCls} style={{ color: sub, minWidth: 86  }}>Прайс</th>
              <th className={thCls} style={{ color: sub, minWidth: 90  }}>Цена</th>
              <th className={thCls} style={{ color: sub, minWidth: 100 }}>Сум.отгр</th>
              <th className={thCls} style={{ color: sub, minWidth: 56  }}>%скид</th>
              {/* highlighted return columns */}
              <th className={thCls} style={{ minWidth: 100, background: `${blu}22`, color: blu, borderLeft: `2px solid ${blu}40` }}>
                Кол.возвр
              </th>
              <th className={thCls} style={{ minWidth: 110, background: `${red}22`, color: red }}>
                Сума возвр
              </th>
              <th className={thCls} style={{ color: sub, minWidth: 56 }}>Вес</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={16} style={{ padding: '48px 16px', textAlign: 'center', color: sub }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 16, background: `${acc}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Search size={20} style={{ color: acc }} />
                    </div>
                    <p style={{ fontSize: 12 }}>
                      {!kontragent
                        ? (t.vSelectClientFirst ?? 'Avval mijozni tanlang')
                        : !dataOtgr
                        ? (t.vSelectDateFirst ?? 'Otgruzka sanasini tanlang')
                        : (t.vNoProducts ?? 'Bu sanada tovarlar topilmadi')}
                    </p>
                  </div>
                </td>
              </tr>
            ) : products.map((row, idx) => {
              const summaVozv = row.kolVozvEdit * row.tsena;
              const vesVozv   = row.kolVozvEdit * row.ves1ed;
              const rowBg = idx % 2 !== 0 ? (D ? '#ffffff06' : '#f9fafb') : 'transparent';
              return (
                <tr key={row.id} style={{ background: rowBg, borderBottom: `1px solid ${bdr}` }}>
                  <td className={`${tdCls} font-medium`} style={{ color: sub }}>{idx + 1}</td>
                  <td className={`${tdCls} text-[10px]`} style={{ color: sub }}>{row.gruppa}</td>
                  <td className={tdCls}>
                    <span style={{ color: txt, fontWeight: 500, maxWidth: 210, display: 'block' }}>{row.tovar}</span>
                  </td>
                  <td className={tdCls} style={{ color: sub }}>{row.aktsiya || '—'}</td>
                  <td className={tdCls} style={{ color: sub }}>{row.shtUp}</td>
                  <td className={tdCls} style={{ color: sub }}>{fmtNum(row.ves1ed)}</td>
                  <td className={`${tdCls} font-bold`} style={{ color: txt }}>{fmtNum(row.kolOtgr)}</td>
                  <td className={tdCls} style={{ color: sub }}>{row.ostPoZayavke}</td>
                  <td className={tdCls} style={{ color: sub }}>{row.kolvoBlok}</td>
                  <td className={tdCls} style={{ color: sub }}>{fmtMoney(row.prajs)}</td>
                  <td className={tdCls} style={{ color: sub }}>{fmtMoney(row.tsena)}</td>
                  <td className={`${tdCls} font-medium`} style={{ color: txt }}>{fmtMoney(row.summaOtgr)}</td>
                  <td className={tdCls} style={{ color: sub }}>{row.skid.toFixed(3)}</td>

                  {/* ── Editable return qty ── */}
                  <td className={tdCls} style={{ background: `${blu}10`, borderLeft: `2px solid ${blu}30` }}>
                    <NumberInput
                      value={row.kolVozvEdit}
                      max={row.kolOtgr}
                      onCommit={v => updateKolVozv(row.id, v)}
                      style={{
                        width: 80, background: 'transparent', outline: 'none',
                        color: blu, fontWeight: 700, fontSize: 12, textAlign: 'center',
                        border: `1px solid ${blu}50`, borderRadius: 6, padding: '3px 4px',
                      }}
                    />
                  </td>

                  {/* ── Auto-calculated return amount ── */}
                  <td className={`${tdCls} font-bold text-right`} style={{ background: `${red}10`, color: red }}>
                    {fmtMoney(summaVozv)}
                  </td>
                  <td className={tdCls} style={{ color: sub }}>{fmtNum(vesVozv)}</td>
                </tr>
              );
            })}

            {/* ── Totals footer row ── */}
            {products.length > 0 && (
              <tr style={{ background: D ? '#ffffff0d' : '#f3f4f6', borderTop: `2px solid ${bdr}` }}>
                <td colSpan={6} className={tdCls} />
                <td className={`${tdCls} font-bold`} style={{ color: txt }}>{fmtNum(totalKolOtgr)}</td>
                <td colSpan={4} className={tdCls} />
                <td className={`${tdCls} font-bold`} style={{ color: txt }}>{fmtMoney(totalSummaOtgr)}</td>
                <td className={tdCls} />
                <td className={`${tdCls} font-bold text-center`} style={{ color: blu, background: `${blu}10`, borderLeft: `2px solid ${blu}30` }}>
                  {fmtNum(totalKolVozv)}
                </td>
                <td className={`${tdCls} font-bold text-right`} style={{ color: red, background: `${red}10` }}>
                  {fmtMoney(totalVozvrat)}
                </td>
                <td className={`${tdCls} font-bold`} style={{ color: sub }}>{fmtNum(totalVes)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }

  // ── Section card style ─────────────────────────────────────────────────────────
  const secSt: React.CSSProperties = {
    background: bg2, border: `1px solid ${bdr}`, borderRadius: 16, padding: '10px 12px',
  };

  return (
    <>
      <style>{`
        .vzr-backdrop {
          position: fixed; inset: 0; z-index: 9998;
          display: flex; align-items: flex-start; justify-content: center;
          animation: vzrBdIn 0.2s ease;
        }
        .vzr-backdrop-dim {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.70);
          backdrop-filter: blur(3px);
          -webkit-backdrop-filter: blur(3px);
        }
        .vzr-dialog {
          position: relative; z-index: 1;
          display: flex; flex-direction: column;
          overflow: hidden;
          transition: border-radius 0.18s ease, width 0.18s ease, height 0.18s ease;
        }
        .vzr-tbl-fs {
          position: fixed; inset: 0; z-index: 10001;
          display: flex; flex-direction: column;
          animation: vzrBdIn 0.15s ease;
        }
        @keyframes vzrBdIn {
          from { opacity: 0; transform: scale(0.97) translateY(6px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);   }
        }
        .vzr-input:focus  { border-color: ${acc} !important; box-shadow: 0 0 0 2px ${acc}22; }
        .vzr-select:focus { border-color: ${acc} !important; box-shadow: 0 0 0 2px ${acc}22; }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>

      {/* ══ TABLE-ONLY FULLSCREEN ══ */}
      {tblFs && (
        <div className="vzr-tbl-fs" style={{ background: bg }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 12px', background: bg2, borderBottom: `1px solid ${bdr}`,
            height: 46, flexShrink: 0,
          }}>
            <span style={{ fontSize: 13, color: txt, fontWeight: 600 }}>
              {kontragent || (t.vTovarList ?? "Tovarlar ro'yxati")}
              &nbsp;<span style={{ color: sub, fontWeight: 400 }}>— {products.length} ta</span>
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => fsTableRef.current?.scrollBy({ left: -320, behavior: 'smooth' })} style={iconBtn()}><ChevronLeft size={14} /></button>
              <button onClick={() => fsTableRef.current?.scrollBy({ left: 320, behavior: 'smooth' })}  style={iconBtn()}><ChevronRight size={14} /></button>
              <button onClick={() => setTblFs(false)} style={{ ...iconBtn(), marginLeft: 4 }}><X size={15} /></button>
            </div>
          </div>
          <div style={{ flex: 1, overflow: 'auto', background: bg2 }}>
            <TableContent scrollRef={fsTableRef} />
          </div>
        </div>
      )}

      {/* ══ BACKDROP ══ */}
      <div
        className="vzr-backdrop"
        style={{ padding: modalFs ? 0 : '16px 12px', alignItems: modalFs ? 'flex-start' : 'center' }}
      >
        {/* dim layer — click outside to close (only when not fullscreen) */}
        {!modalFs && (
          <div className="vzr-backdrop-dim" onClick={onClose} />
        )}

        {/* ── Dialog box ── */}
        <div
          className="vzr-dialog"
          style={{
            background: bg,
            width:        modalFs ? '100vw'                       : 'min(calc(100vw - 24px), 1320px)',
            height:       modalFs ? '100dvh'                      : 'min(calc(100dvh - 100px), 740px)',
            borderRadius: modalFs ? 0                             : 14,
            boxShadow:    modalFs ? 'none'                        : (D ? '0 28px 72px #00000099' : '0 28px 72px #0000003a'),
          }}
        >

          {/* ── Top bar ── */}
          <div style={{
            background: bg2,
            borderBottom: `1px solid ${bdr}`,
            borderRadius: modalFs ? 0 : '14px 14px 0 0',
            padding: '0 12px', flexShrink: 0,
            display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
            minHeight: 50,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: txt, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {t.vModalTitle ?? 'Vozvrat sozdat'}
                {kontragent && dataOtgr && (
                  <span style={{ color: sub, fontWeight: 400, fontSize: 12 }}>
                    &nbsp;— {kontragent}
                  </span>
                )}
              </h2>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flexShrink: 0, alignItems: 'center' }}>
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white"
                style={{ background: acc, boxShadow: `0 3px 12px ${acc}40` }}
              >
                <Save size={13} />
                <span className="hidden sm:inline">{t.vProvesti ?? 'Сохранить'}</span>
              </button>
              {/* Modal fullscreen toggle */}
              <button
                onClick={() => setModalFs(f => !f)}
                style={{ ...iconBtn(), width: 30, height: 30 }}
                title={modalFs ? "Kichraytirish" : "To'liq ekran"}
              >
                {modalFs ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              </button>
              <button onClick={onClose} style={{ ...iconBtn(), width: 30, height: 30 }}>
                <X size={14} />
              </button>
            </div>
          </div>

          {/* ── Scrollable body ── */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }} className="space-y-2.5">

          {/* ── Section 1: Doc meta (Nomer, dates, forma, napravleniye…) ── */}
          <div style={secSt}>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
              <FieldWrap label={t.vNomer ?? 'Nomer'} sub={sub}>
                <input style={{ ...inputSt, opacity: 0.55 }} value="92" readOnly className="vzr-input" />
              </FieldWrap>
              <FieldWrap label="OnTradeID" sub={sub}>
                <input style={{ ...inputSt, opacity: 0.55 }} value="92" readOnly className="vzr-input" />
              </FieldWrap>
              <FieldWrap label={t.vDataOtgrLabel ?? 'Dата отгр.'} sub={sub}>
                <CalendarPickerWidget
                  value={dataOtgr}
                  onChange={setDataOtgr}
                  availableDates={availableDates}
                  disabled={!kontragent}
                  D={D}
                  bg2={bg2} bdr={bdr} txt={txt} acc={acc} sub={sub}
                  inputSt={inputSt}
                />
                {!kontragent && (
                  <p style={{ fontSize: 9, color: '#f59e0b', marginTop: 2 }}>{t.vSelectClientFirst ?? 'Avval mijozni tanlang'}</p>
                )}
                {kontragent && availableDates.length === 0 && (
                  <p style={{ fontSize: 9, color: '#ef4444', marginTop: 2 }}>{t.vSelectDateFirst ?? 'Sana topilmadi'}</p>
                )}
              </FieldWrap>
              <FieldWrap label={t.vDataVozvLabel ?? 'Дата возврата'} sub={sub}>
                <input style={{ ...inputSt, color: acc, fontWeight: 600 }} value="15.03.2026" readOnly className="vzr-input" />
              </FieldWrap>
              <FieldWrap label={t.vFormaOplaty ?? 'Форма оплаты'} sub={sub}>
                <input style={{ ...inputSt, opacity: 0.55 }} value="Д2" readOnly className="vzr-input" />
              </FieldWrap>
              <FieldWrap label={t.vNapravleniye ?? 'Направление'} sub={sub}>
                <input style={{ ...inputSt, opacity: 0.55 }} value="SHERIN" readOnly className="vzr-input" />
              </FieldWrap>
              <FieldWrap label={t.vLiniya ?? 'Линия'} sub={sub}>
                <input style={{ ...inputSt, opacity: 0.55 }} value={liniya || '—'} readOnly className="vzr-input" />
              </FieldWrap>
              <FieldWrap label={t.vAvtor ?? 'Автор'} sub={sub}>
                <input style={{ ...inputSt, opacity: 0.55 }} value="Зарипов Бегзод" readOnly className="vzr-input" />
              </FieldWrap>
            </div>
          </div>

          {/* ── Section 2: Kontragent, Sklad, Agent ── */}
          <div style={secSt}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* ── Client autocomplete ── */}
              <FieldWrap label={t.vKontragent ?? 'Контрагент'} sub={sub}>
                <div style={{ position: 'relative' }}>
                  <Search size={12} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: sub, pointerEvents: 'none' }} />
                  <input
                    value={kontragentInput}
                    onChange={e => { setKontragentInput(e.target.value); setShowDrop(true); }}
                    onFocus={() => setShowDrop(true)}
                    onBlur={() => setTimeout(() => setShowDrop(false), 180)}
                    placeholder={t.vSelectClient ?? 'Mijozni tanlang...'}
                    className="vzr-input"
                    style={{ ...inputSt, paddingLeft: 27 }}
                  />
                  {showDrop && filteredClients.length > 0 && (
                    <div style={{
                      position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 200,
                      background: bg2, border: `1px solid ${bdr}`, borderRadius: 10,
                      maxHeight: 220, overflowY: 'auto', boxShadow: D ? '0 8px 28px #00000080' : '0 8px 28px #0000001a',
                    }}>
                      {filteredClients.map(c => (
                        <button
                          key={c.name}
                          onMouseDown={() => { setKontragent(c.name); setKontragentInput(c.name); setShowDrop(false); }}
                          className="w-full text-left px-3 py-2 transition-opacity hover:opacity-70"
                          style={{ borderBottom: `1px solid ${bdr}` }}
                        >
                          <p style={{ color: txt, fontSize: 12, fontWeight: 500 }}>{c.name}</p>
                          <p style={{ color: sub, fontSize: 10 }}>{c.agent} · {c.liniya}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </FieldWrap>
              <FieldWrap label={t.vSklad ?? 'Склад'} sub={sub}>
                <input style={{ ...inputSt, opacity: 0.55 }} value="Sklad SHERIN" readOnly className="vzr-input" />
              </FieldWrap>
              <FieldWrap label={t.vTorgAgent ?? 'Торговый агент'} sub={sub}>
                <input style={{ ...inputSt, opacity: 0.55 }} value={torgoviyAgent || '—'} readOnly className="vzr-input" />
              </FieldWrap>
            </div>
          </div>

          {/* ── Section 3: Summary ── */}
          <div style={secSt}>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
              <FieldWrap label={t.vOkrugleniye ?? 'Округление'} sub={sub}>
                <input style={{ ...inputSt, opacity: 0.55 }} value="Ne okruglat'" readOnly className="vzr-input" />
              </FieldWrap>
              <FieldWrap label={t.vSummaTovarov ?? 'Сумма_товаров'} sub={sub}>
                <input style={{ ...inputSt, color: '#10b981', fontWeight: 600 }} value={fmtMoney(totalSummaOtgr)} readOnly />
              </FieldWrap>
              <FieldWrap label={t.vKorrektirovka ?? 'Корректировка'} sub={sub}>
                <input style={{ ...inputSt, opacity: 0.55 }} value="0,00" readOnly className="vzr-input" />
              </FieldWrap>
              <FieldWrap label={t.vVsego ?? 'Всего'} sub={sub}>
                <input style={{ ...inputSt, color: red, fontWeight: 700 }} value={fmtMoney(totalVozvrat)} readOnly />
              </FieldWrap>
            </div>
          </div>

          {/* ── Section 4: Transport ── */}
          <div style={secSt}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <FieldWrap label={t.vTransport ?? 'Транспорт'} sub={sub}>
                <input style={inputSt} value={transport} onChange={e => setTransport(e.target.value)} className="vzr-input" />
              </FieldWrap>
              <FieldWrap label={t.vShofer ?? 'Шофер'} sub={sub}>
                <input style={inputSt} value={shofer} onChange={e => setShofer(e.target.value)} className="vzr-input" />
              </FieldWrap>
              <FieldWrap label={t.vDostavchik ?? 'Доставчик'} sub={sub}>
                <input style={{ ...inputSt, opacity: 0.55 }} value={shofer} readOnly className="vzr-input" />
              </FieldWrap>
              <FieldWrap label={t.vPrichina ?? 'Причина'} sub={sub}>
                <input style={inputSt} value={prichina} onChange={e => setPrichina(e.target.value)} placeholder="—" className="vzr-input" />
              </FieldWrap>
            </div>
          </div>

          {/* ── Table toolbar ── */}
          <div style={{
            background: bg2, border: `1px solid ${bdr}`,
            borderRadius: '14px 14px 0 0',
            padding: '8px 10px',
            display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap',
          }}>
            {/* Action buttons */}
            <button
              onClick={setFullVozvrat}
              disabled={products.length === 0}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-medium disabled:opacity-40"
              style={{ background: `${blu}15`, color: blu, border: `1px solid ${blu}35` }}
            >
              <ListChecks size={11} />
              <span className="hidden sm:inline">{t.vPolniyVozv ?? 'Полный возврат'}</span>
              <span className="sm:hidden">Полный</span>
            </button>

            <button
              onClick={setZeroVozvrat}
              disabled={products.length === 0}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-medium disabled:opacity-40"
              style={{ background: '#ef444415', color: '#ef4444', border: `1px solid #ef444430` }}
            >
              <Trash2 size={11} />
              <span className="hidden sm:inline">{t.vObnutitVozv ?? 'Обнулить возвраты'}</span>
              <span className="sm:hidden">Обнулить</span>
            </button>

            <button
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-medium"
              style={{ background: bg3, color: sub, border: `1px solid ${bdr}` }}
            >
              <RefreshCw size={11} />
              <span className="hidden md:inline">{t.vObnovitPrajs ?? 'Обновить прайс цену'}</span>
            </button>

            {/* Summary pills */}
            {products.length > 0 && (
              <div className="hidden lg:flex items-center gap-3 ml-2">
                <span style={{ fontSize: 11, color: sub }}>
                  {t.vItogo ?? 'Итого'}:&nbsp;
                  <span style={{ color: txt, fontWeight: 600 }}>{products.length} {t.vTovarEd ?? 'tovar'}</span>
                </span>
                <span style={{ fontSize: 11, color: red, fontWeight: 600 }}>
                  {fmtMoney(totalVozvrat)} so'm
                </span>
              </div>
            )}

            <div style={{ flex: 1 }} />

            {/* Scroll + fullscreen */}
            <button onClick={() => tableRef.current?.scrollBy({ left: -320, behavior: 'smooth' })} style={iconBtn()}>
              <ChevronLeft size={14} />
            </button>
            <button onClick={() => tableRef.current?.scrollBy({ left: 320, behavior: 'smooth' })} style={iconBtn()}>
              <ChevronRight size={14} />
            </button>
            <button
              onClick={() => setTblFs(true)}
              style={{ ...iconBtn(), marginLeft: 2 }}
              title={t.vFullscreen ?? "To'liq ekran"}
            >
              <Maximize2 size={14} />
            </button>
          </div>

          {/* ── Product table ── */}
          <div style={{
            background: bg2, border: `1px solid ${bdr}`,
            borderTop: 'none', borderRadius: '0 0 14px 14px', overflow: 'hidden',
          }}>
            <TableContent scrollRef={tableRef} />
          </div>

          {/* ── Bottom bar: Zayavka, Tip, Primechaniye ── */}
          <div style={secSt}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <FieldWrap label={t.vZayavka ?? 'Заявка'} sub={sub}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    style={{ ...inputSt, flex: 1, opacity: 0.55 }}
                    value={dataOtgr ? `Заявки от ${dataOtgr}` : ''}
                    readOnly className="vzr-input"
                    placeholder="—"
                  />
                  <button
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-medium"
                    style={{ background: bg3, color: sub, border: `1px solid ${bdr}`, flexShrink: 0 }}
                  >
                    <RefreshCw size={11} />
                    <span className="hidden sm:inline">{t.vObnovit ?? 'Обновить'}</span>
                  </button>
                </div>
              </FieldWrap>
              <FieldWrap label={t.vTip ?? 'Тип'} sub={sub}>
                <input style={{ ...inputSt, opacity: 0.55 }} value="Возврат от преддоставки" readOnly className="vzr-input" />
              </FieldWrap>
              <FieldWrap label={t.vPrimechaniye ?? 'Примечание'} sub={sub}>
                <input
                  style={inputSt}
                  value={primechaniye}
                  onChange={e => setPrimechaniye(e.target.value)}
                  placeholder="..."
                  className="vzr-input"
                />
              </FieldWrap>
            </div>
          </div>

          {/* ── Mobile save button ── */}
          <div className="sm:hidden pb-4">
            <button
              onClick={onClose}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold text-white"
              style={{ background: '#10b981', boxShadow: '0 4px 16px #10b98150' }}
            >
              <Check size={16} />
              {t.vProvestiClose ?? 'Сохранить и закрыть'}
            </button>
          </div>

          </div>{/* end scrollable body */}
        </div>{/* end vzr-dialog */}
      </div>{/* end vzr-backdrop */}
    </>
  );
}
